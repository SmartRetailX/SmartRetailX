"""
Read-only PostgreSQL query functions, one per voice-assistant intent.

All functions borrow a connection from the shared asyncpg pool via the
`acquire()` context manager and return plain Python dicts so callers
never touch SQL or asyncpg records directly.
"""

from __future__ import annotations

import re
import time
from typing import Any

import asyncpg
from rapidfuzz import fuzz, process as fuzz_process

from ..log import logger
from .connection import acquire

_FUZZY_THRESHOLD = 55  # minimum score (0-100) to include a fuzzy match
_FUZZY_LIMIT = 5       # max fuzzy candidates to return as suggestions

# ---------------------------------------------------------------------------
# Vocabulary cache for STT prompt injection
# ---------------------------------------------------------------------------
_vocab_cache: dict[str, Any] = {"terms": [], "ts": 0.0}
_VOCAB_TTL_SEC = 300  # refresh every 5 minutes


def _norm(text: str | None) -> str:
    """Lowercase, collapse whitespace, remove punctuation for fuzzy matching."""
    if not text:
        return ""
    return re.sub(r"[^\w\s]", "", text.lower().strip())


def _row(record: asyncpg.Record) -> dict[str, Any]:
    return dict(record)

def _tokens(text: str | None) -> list[str]:
    return [tok for tok in _norm(text).split() if tok]


def _required_token_matches(query_tokens: list[str]) -> int:
    if not query_tokens:
        return 0
    if len(query_tokens) == 1:
        return 1
    # For multi-token queries, require most tokens to match.
    return max(2, int(len(query_tokens) * 0.6 + 0.5))


def _token_coverage_scores(query_tokens: list[str], candidate_tokens: list[str]) -> tuple[int, float]:
    if not query_tokens:
        return 0, 0.0
    if not candidate_tokens:
        return 0, 0.0

    per_token_best: list[float] = []
    for q in query_tokens:
        best = max(fuzz.ratio(q, c) for c in candidate_tokens)
        per_token_best.append(float(best))

    strong_matches = sum(1 for score in per_token_best if score >= 78.0)
    avg_score = sum(per_token_best) / len(per_token_best)
    return strong_matches, avg_score


def _fuzzy_rank(
    query: str,
    candidates: list[dict[str, Any]],
    key: str = "name",
    limit: int = _FUZZY_LIMIT,
    threshold: int = _FUZZY_THRESHOLD,
) -> list[dict[str, Any]]:
    """
    Return rows from `candidates` whose `key` field fuzzy-matches `query`.

    Uses token-coverage constraints to avoid irrelevant fuzzy drift
    (e.g. "ice crem" -> rice items).
    """
    if not candidates or not query:
        return []

    norm_q = _norm(query)
    query_tokens = _tokens(norm_q)
    required_matches = _required_token_matches(query_tokens)

    ranked: list[tuple[float, dict[str, Any]]] = []
    for row in candidates:
        text = _norm(str(row.get(key) or ""))
        if not text:
            continue

        candidate_tokens = _tokens(text)
        strong_matches, coverage_avg = _token_coverage_scores(query_tokens, candidate_tokens)

        # Hard guard: for multi-token queries, require enough token alignment.
        if query_tokens and strong_matches < required_matches and coverage_avg < 86.0:
            continue

        wratio = float(fuzz.WRatio(norm_q, text))
        token_set = float(fuzz.token_set_ratio(norm_q, text))
        combined = (0.45 * wratio) + (0.35 * token_set) + (0.20 * coverage_avg)

        if combined < threshold:
            continue

        ranked.append((combined, row))

    ranked.sort(key=lambda item: item[0], reverse=True)
    return [row for _, row in ranked[:limit]]


# ---------------------------------------------------------------------------
# 1. Product search  (intent: product_search)
# ---------------------------------------------------------------------------

_PRODUCT_CATALOG_SELECT = """
    SELECT
        p.id::text            AS product_id,
        p.sku,
        p.name,
        p.name_si,
        p.price::float        AS price,
        p.stock_quantity,
        p.brand,
        p.purchase_frequency,
        p.is_active,
        c.name                AS category,
        c.name_si             AS category_si,
        p.image_url
    FROM core.products p
    JOIN core.categories c ON c.id = p.category_id
    WHERE p.is_active = true
"""


async def search_products(query: str, limit: int = 8) -> list[dict[str, Any]]:
    rows, _total = await search_products_page(query, limit=limit, offset=0)
    return rows


async def search_products_page(
    query: str,
    limit: int = 8,
    offset: int = 0,
) -> tuple[list[dict[str, Any]], int]:
    norm_query = _norm(query)
    if not norm_query:
        return [], 0

    safe_limit = max(1, min(limit, 50))
    safe_offset = max(0, offset)

    try:
        async with acquire() as conn:
            primary_total = int(
                await conn.fetchval(
                    """
                    SELECT COUNT(*)
                    FROM core.products p
                    JOIN core.categories c ON c.id = p.category_id
                    WHERE p.is_active = true
                      AND (
                        lower(p.name)     LIKE $1
                        OR lower(p.name_si)  LIKE $1
                        OR lower(p.sku)   LIKE $1
                        OR lower(p.brand) LIKE $1
                      )
                    """,
                    f"%{norm_query}%",
                )
                or 0,
            )

            if primary_total > 0:
                rows = await conn.fetch(
                    f"""
                    {_PRODUCT_CATALOG_SELECT}
                      AND (
                        lower(p.name)     LIKE $1
                        OR lower(p.name_si)  LIKE $1
                        OR lower(p.sku)   LIKE $1
                        OR lower(p.brand) LIKE $1
                      )
                    ORDER BY
                        CASE WHEN lower(p.name) = $2 THEN 0 ELSE 1 END,
                        p.purchase_frequency DESC,
                        p.name
                    LIMIT $3
                    OFFSET $4
                    """,
                    f"%{norm_query}%",
                    norm_query,
                    safe_limit,
                    safe_offset,
                )
                return [_row(r) for r in rows], primary_total

            alias_total = int(
                await conn.fetchval(
                    """
                    SELECT COUNT(DISTINCT p.id)
                    FROM core.products p
                    JOIN core.categories c ON c.id = p.category_id
                    JOIN core.product_aliases pa ON pa.product_id = p.id
                    WHERE p.is_active = true
                      AND lower(pa.alias_normalized) LIKE $1
                    """,
                    f"%{norm_query}%",
                )
                or 0,
            )

            if alias_total > 0:
                rows = await conn.fetch(
                    f"""
                    {_PRODUCT_CATALOG_SELECT}
                    JOIN core.product_aliases pa ON pa.product_id = p.id
                      AND lower(pa.alias_normalized) LIKE $1
                    GROUP BY
                        p.id, p.sku, p.name, p.name_si, p.price, p.stock_quantity,
                        p.brand, p.purchase_frequency, p.is_active, c.name, c.name_si, p.image_url
                    ORDER BY MAX(pa.weight) DESC, p.purchase_frequency DESC, p.name
                    LIMIT $2
                    OFFSET $3
                    """,
                    f"%{norm_query}%",
                    safe_limit,
                    safe_offset,
                )
                return [_row(r) for r in rows], alias_total

            # Fuzzy fallback — fetch all names and rank by similarity
            all_rows = await conn.fetch(
                f"{_PRODUCT_CATALOG_SELECT} ORDER BY p.purchase_frequency DESC, p.name LIMIT 400"
            )
            candidates = [_row(r) for r in all_rows]
            ranked = _fuzzy_rank(
                query,
                candidates,
                key="name",
                limit=min(400, safe_limit + safe_offset + 100),
            )
            total = len(ranked)
            return ranked[safe_offset : safe_offset + safe_limit], total

    except Exception as exc:
        logger.warning("search_products failed query=%r error=%s", query, exc)
        return [], 0


async def fuzzy_suggest_products(query: str, limit: int = _FUZZY_LIMIT) -> list[str]:
    """Return product name suggestions for a misspelled/partial query."""
    norm_query = _norm(query)
    if not norm_query:
        return []
    try:
        async with acquire() as conn:
            rows = await conn.fetch(
                "SELECT name FROM core.products WHERE is_active = true ORDER BY purchase_frequency DESC LIMIT 400"
            )
        names = [r["name"] for r in rows]
        norm_names = {i: _norm(n) for i, n in enumerate(names)}
        results = fuzz_process.extract(
            norm_query,
            norm_names,
            scorer=fuzz.WRatio,
            limit=limit,
            score_cutoff=_FUZZY_THRESHOLD,
        )
        return [names[idx] for _, _, idx in results]
    except Exception as exc:
        logger.warning("fuzzy_suggest_products failed query=%r error=%s", query, exc)
        return []


async def get_product_details_by_id(product_id: str) -> dict[str, Any] | None:
    """Return a single active product by id with rich metadata for chat drill-down."""
    if not product_id:
        return None

    try:
        async with acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT
                    p.id::text            AS product_id,
                    p.sku,
                    p.name,
                    p.name_si,
                    p.description,
                    p.description_si,
                    p.price::float        AS price,
                    p.stock_quantity,
                    p.brand,
                    p.purchase_frequency,
                    p.image_url,
                    p.is_active,
                    c.name                AS category,
                    c.name_si             AS category_si
                FROM core.products p
                JOIN core.categories c ON c.id = p.category_id
                WHERE p.id = $1::uuid
                LIMIT 1
                """,
                product_id,
            )
            if not row:
                return None
            return _row(row)
    except Exception as exc:
        logger.warning("get_product_details_by_id failed product_id=%r error=%s", product_id, exc)
        return None


async def get_stt_vocabulary() -> list[str]:
    """
    Return a deduplicated list of English product/brand/category terms for use
    as a Whisper prompt vocabulary.  Results are cached for _VOCAB_TTL_SEC seconds
    so this never adds latency on the hot path after the first call.
    """
    now = time.monotonic()
    if _vocab_cache["terms"] and (now - _vocab_cache["ts"]) < _VOCAB_TTL_SEC:
        return _vocab_cache["terms"]  # type: ignore[return-value]

    try:
        async with acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT DISTINCT unnest(ARRAY[
                    p.name,
                    p.brand,
                    c.name
                ]) AS term
                FROM core.products p
                JOIN core.categories c ON c.id = p.category_id
                WHERE p.is_active = true
                  AND p.name IS NOT NULL
                """
            )
        terms: list[str] = []
        seen: set[str] = set()
        for r in rows:
            raw = (r["term"] or "").strip()
            if not raw:
                continue
            # Only keep Latin-script tokens — these are the English product names
            # that Whisper tends to mis-transcribe into Sinhala script.
            if re.search(r"[^\x00-\x024F\s]", raw):
                continue
            key = raw.lower()
            if key not in seen:
                seen.add(key)
                terms.append(raw)

        _vocab_cache["terms"] = terms
        _vocab_cache["ts"] = now
        logger.info("STT vocabulary cache refreshed: %d terms", len(terms))
        return terms
    except Exception as exc:
        logger.warning("get_stt_vocabulary failed: %s", exc)
        return _vocab_cache.get("terms") or []  # type: ignore[return-value]


# ---------------------------------------------------------------------------
# 2. Product price  (intent: prices)
# ---------------------------------------------------------------------------

_PRICE_SELECT = """
    SELECT
        p.id::text        AS product_id,
        p.sku,
        p.name,
        p.name_si,
        p.price::float    AS price,
        p.stock_quantity,
        p.brand,
        c.name            AS category,
        c.name_si         AS category_si,
        p.image_url
    FROM core.products p
    JOIN core.categories c ON c.id = p.category_id
    WHERE p.is_active = true
"""


async def get_product_price(product_name: str, limit: int = 5) -> list[dict[str, Any]]:
    rows, _total = await get_product_price_page(product_name, limit=limit, offset=0)
    return rows


async def get_product_price_page(
    product_name: str,
    limit: int = 5,
    offset: int = 0,
) -> tuple[list[dict[str, Any]], int]:
    norm = _norm(product_name)
    if not norm:
        return [], 0

    safe_limit = max(1, min(limit, 50))
    safe_offset = max(0, offset)

    try:
        async with acquire() as conn:
            primary_total = int(
                await conn.fetchval(
                    """
                    SELECT COUNT(*)
                    FROM core.products p
                    JOIN core.categories c ON c.id = p.category_id
                    WHERE p.is_active = true
                      AND (
                        lower(p.name)    LIKE $1
                        OR lower(p.name_si) LIKE $1
                        OR lower(p.sku)  = $2
                      )
                    """,
                    f"%{norm}%",
                    norm,
                )
                or 0,
            )

            if primary_total > 0:
                rows = await conn.fetch(
                    f"""
                    {_PRICE_SELECT}
                      AND (
                        lower(p.name)    LIKE $1
                        OR lower(p.name_si) LIKE $1
                        OR lower(p.sku)  = $2
                      )
                    ORDER BY
                        CASE WHEN lower(p.name) = $2 THEN 0 ELSE 1 END,
                        p.name
                    LIMIT $3
                    OFFSET $4
                    """,
                    f"%{norm}%",
                    norm,
                    safe_limit,
                    safe_offset,
                )
                return [_row(r) for r in rows], primary_total

            alias_total = int(
                await conn.fetchval(
                    """
                    SELECT COUNT(DISTINCT p.id)
                    FROM core.products p
                    JOIN core.categories c ON c.id = p.category_id
                    JOIN core.product_aliases pa ON pa.product_id = p.id
                    WHERE p.is_active = true
                      AND lower(pa.alias_normalized) LIKE $1
                    """,
                    f"%{norm}%",
                )
                or 0,
            )

            if alias_total > 0:
                rows = await conn.fetch(
                    f"""
                    {_PRICE_SELECT}
                    JOIN core.product_aliases pa ON pa.product_id = p.id
                      AND lower(pa.alias_normalized) LIKE $1
                    GROUP BY
                        p.id, p.sku, p.name, p.name_si, p.price, p.stock_quantity, p.brand,
                        c.name, c.name_si, p.image_url
                    ORDER BY MAX(pa.weight) DESC, p.name
                    LIMIT $2
                    OFFSET $3
                    """,
                    f"%{norm}%",
                    safe_limit,
                    safe_offset,
                )
                return [_row(r) for r in rows], alias_total

            # Fuzzy fallback
            all_rows = await conn.fetch(
                f"{_PRICE_SELECT} ORDER BY p.name LIMIT 400"
            )
            candidates = [_row(r) for r in all_rows]
            ranked = _fuzzy_rank(
                product_name,
                candidates,
                key="name",
                limit=min(400, safe_limit + safe_offset + 100),
            )
            total = len(ranked)
            return ranked[safe_offset : safe_offset + safe_limit], total

    except Exception as exc:
        logger.warning("get_product_price failed name=%r error=%s", product_name, exc)
        return [], 0


# ---------------------------------------------------------------------------
# 3. Active offers  (intent: offers)
# ---------------------------------------------------------------------------

async def get_active_offers(limit: int = 6) -> list[dict[str, Any]]:
    try:
        async with acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT
                    p.id::text          AS product_id,
                    p.sku,
                    p.name,
                    p.name_si,
                    p.price::float      AS price,
                    p.stock_quantity,
                    p.brand,
                    c.name              AS category,
                    c.name_si           AS category_si,
                    p.image_url,
                    COUNT(DISTINCT oi.order_id) AS order_count,
                    AVG(o.discount::float)      AS avg_discount
                FROM core.products p
                JOIN core.categories c ON c.id = p.category_id
                JOIN core.order_items oi ON oi.product_id = p.id
                JOIN core.orders o      ON o.id = oi.order_id
                WHERE p.is_active = true
                  AND o.discount > 0
                  AND o.created_at >= NOW() - INTERVAL '30 days'
                GROUP BY p.id, p.sku, p.name, p.name_si, p.price, p.brand,
                         c.name, c.name_si
                ORDER BY avg_discount DESC, order_count DESC
                LIMIT $1
                """,
                limit,
            )

            if rows:
                return [_row(r) for r in rows]

            rows = await conn.fetch(
                """
                SELECT
                    p.id::text        AS product_id,
                    p.sku,
                    p.name,
                    p.name_si,
                    p.price::float    AS price,
                    p.stock_quantity,
                    p.brand,
                    c.name            AS category,
                    c.name_si         AS category_si,
                    p.image_url,
                    0                 AS order_count,
                    0.0               AS avg_discount
                FROM core.products p
                JOIN core.categories c ON c.id = p.category_id
                WHERE p.is_active = true
                  AND p.purchase_frequency = 'high'
                ORDER BY p.name
                LIMIT $1
                """,
                limit,
            )
            return [_row(r) for r in rows]

    except Exception as exc:
        logger.warning("get_active_offers failed error=%s", exc)
        return []


async def get_active_offers_for_product(
    product_name: str,
    limit: int = 6,
) -> list[dict[str, Any]]:
    norm_query = _norm(product_name)
    if not norm_query:
        return []

    safe_limit = max(1, min(limit, 50))

    try:
        async with acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT
                    p.id::text          AS product_id,
                    p.sku,
                    p.name,
                    p.name_si,
                    p.price::float      AS price,
                    p.stock_quantity,
                    p.brand,
                    c.name              AS category,
                    c.name_si           AS category_si,
                    p.image_url,
                    COUNT(DISTINCT oi.order_id) AS order_count,
                    AVG(o.discount::float)      AS avg_discount
                FROM core.products p
                JOIN core.categories c ON c.id = p.category_id
                JOIN core.order_items oi ON oi.product_id = p.id
                JOIN core.orders o      ON o.id = oi.order_id
                WHERE p.is_active = true
                  AND o.discount > 0
                  AND o.created_at >= NOW() - INTERVAL '30 days'
                  AND (
                    lower(p.name)    LIKE $1
                    OR lower(p.name_si) LIKE $1
                    OR lower(p.sku)  LIKE $1
                    OR lower(p.brand) LIKE $1
                  )
                GROUP BY p.id, p.sku, p.name, p.name_si, p.price, p.brand,
                         c.name, c.name_si
                ORDER BY
                    CASE WHEN lower(p.name) = $2 THEN 0 ELSE 1 END,
                    avg_discount DESC,
                    order_count DESC
                LIMIT $3
                """,
                f"%{norm_query}%",
                norm_query,
                safe_limit,
            )
            return [_row(r) for r in rows]

    except Exception as exc:
        logger.warning(
            "get_active_offers_for_product failed name=%r error=%s",
            product_name,
            exc,
        )
        return []


# ---------------------------------------------------------------------------
# 4. Order history  (intent: order_history)
# ---------------------------------------------------------------------------

async def get_cheapest_products(
    category: str | None = None,
    limit: int = 10,
) -> list[dict[str, Any]]:
    """Return cheapest active in-stock products, optionally filtered by category."""
    norm_cat = _norm(category) if category else None
    try:
        async with acquire() as conn:
            if norm_cat:
                rows = await conn.fetch(
                    f"""
                    {_PRICE_SELECT}
                      AND p.stock_quantity > 0
                      AND (lower(c.name) LIKE $1 OR lower(c.name_si) LIKE $1)
                    ORDER BY p.price ASC
                    LIMIT $2
                    """,
                    f"%{norm_cat}%",
                    max(1, min(limit, 50)),
                )
            else:
                rows = await conn.fetch(
                    f"""
                    {_PRICE_SELECT}
                      AND p.stock_quantity > 0
                    ORDER BY p.price ASC
                    LIMIT $1
                    """,
                    max(1, min(limit, 50)),
                )
            return [_row(r) for r in rows]
    except Exception as exc:
        logger.warning("get_cheapest_products failed error=%s", exc)
        return []


async def get_products_by_budget(
    max_price: float,
    category: str | None = None,
    limit: int = 20,
) -> list[dict[str, Any]]:
    """Return active in-stock products priced at or below max_price."""
    norm_cat = _norm(category) if category else None
    try:
        async with acquire() as conn:
            if norm_cat:
                rows = await conn.fetch(
                    f"""
                    {_PRICE_SELECT}
                      AND p.stock_quantity > 0
                      AND p.price <= $1
                      AND (lower(c.name) LIKE $2 OR lower(c.name_si) LIKE $2)
                    ORDER BY p.purchase_frequency DESC, p.price ASC
                    LIMIT $3
                    """,
                    max_price,
                    f"%{norm_cat}%",
                    max(1, min(limit, 50)),
                )
            else:
                rows = await conn.fetch(
                    f"""
                    {_PRICE_SELECT}
                      AND p.stock_quantity > 0
                      AND p.price <= $1
                    ORDER BY p.purchase_frequency DESC, p.price ASC
                    LIMIT $2
                    """,
                    max_price,
                    max(1, min(limit, 50)),
                )
            return [_row(r) for r in rows]
    except Exception as exc:
        logger.warning("get_products_by_budget failed max_price=%.0f error=%s", max_price, exc)
        return []


async def get_order_history(user_id: str, limit: int = 5, status_filter: str | None = None) -> list[dict[str, Any]]:
    if not user_id:
        return []

    try:
        async with acquire() as conn:
            safe_limit = max(1, min(limit, 50))
            if status_filter:
                order_rows = await conn.fetch(
                    """
                    SELECT
                        o.id::text          AS order_id,
                        o.order_number,
                        o.status,
                        o.subtotal::float   AS subtotal,
                        o.discount::float   AS discount,
                        o.tax::float        AS tax,
                        o.total::float      AS total,
                        o.created_at,
                        o.updated_at
                    FROM core.orders o
                    WHERE o.user_id = $1
                      AND o.status = $2
                    ORDER BY o.created_at DESC
                    LIMIT $3
                    """,
                    user_id,
                    status_filter,
                    safe_limit,
                )
            else:
                order_rows = await conn.fetch(
                    """
                    SELECT
                        o.id::text          AS order_id,
                        o.order_number,
                        o.status,
                        o.subtotal::float   AS subtotal,
                        o.discount::float   AS discount,
                        o.tax::float        AS tax,
                        o.total::float      AS total,
                        o.created_at,
                        o.updated_at
                    FROM core.orders o
                    WHERE o.user_id = $1
                    ORDER BY o.created_at DESC
                    LIMIT $2
                    """,
                    user_id,
                    safe_limit,
                )

            if not order_rows:
                return []

            order_ids = [str(r["order_id"]) for r in order_rows]

            item_rows = await conn.fetch(
                """
                SELECT
                    oi.order_id::text    AS order_id,
                    oi.product_name,
                    oi.product_name_si,
                    oi.product_sku,
                    oi.quantity,
                    oi.unit_price::float  AS unit_price,
                    oi.total_price::float AS total_price
                FROM core.order_items oi
                WHERE oi.order_id = ANY($1::uuid[])
                ORDER BY oi.order_id, oi.product_name
                """,
                order_ids,
            )

            items_by_order: dict[str, list[dict[str, Any]]] = {}
            for item in item_rows:
                items_by_order.setdefault(item["order_id"], []).append(_row(item))

            orders = []
            for record in order_rows:
                order = _row(record)
                order["items"] = items_by_order.get(order["order_id"], [])
                orders.append(order)

            return orders

    except Exception as exc:
        logger.warning("get_order_history failed user=%r error=%s", user_id, exc)
        return []


# ---------------------------------------------------------------------------
# 5. User profile  (intent: user_profile)
# ---------------------------------------------------------------------------

async def get_user_profile(user_id: str) -> dict[str, Any] | None:
    """Return profile + order summary for the authenticated user."""
    if not user_id:
        return None
    try:
        async with acquire() as conn:
            profile = await conn.fetchrow(
                """
                SELECT
                    u.id,
                    u.name,
                    u.email,
                    u.age,
                    u.gender,
                    u."City"        AS city,
                    u."mobileNumber" AS mobile_number,
                    u."customerSegment" AS customer_segment,
                    u.role,
                    u."createdAt"   AS joined_at
                FROM auth."user" u
                WHERE u.id = $1
                LIMIT 1
                """,
                user_id,
            )
            if not profile:
                return None

            order_stats = await conn.fetchrow(
                """
                SELECT
                    COUNT(*)                    AS total_orders,
                    COALESCE(SUM(o.total), 0)   AS total_spent,
                    MAX(o.created_at)           AS last_order_at
                FROM core.orders o
                WHERE o.user_id = $1
                """,
                user_id,
            )

            result = _row(profile)
            if order_stats:
                result["total_orders"] = int(order_stats["total_orders"] or 0)
                result["total_spent"] = float(order_stats["total_spent"] or 0)
                result["last_order_at"] = order_stats["last_order_at"]
            else:
                result["total_orders"] = 0
                result["total_spent"] = 0.0
                result["last_order_at"] = None
            return result
    except Exception as exc:
        logger.warning("get_user_profile failed user=%r error=%s", user_id, exc)
        return None


# ---------------------------------------------------------------------------
# 6. Active promotions  (intent: promotions)
# ---------------------------------------------------------------------------

async def get_active_promotions(limit: int = 10) -> list[dict[str, Any]]:
    """Return currently active promotions with linked product details."""
    try:
        async with acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT
                    pr.promotion_id::text   AS promotion_id,
                    pr.promotion_type,
                    pr.discount_percentage::float AS discount_percentage,
                    pr.start_date,
                    pr.end_date,
                    pr.is_targetted_promotion,
                    pr.product_scope,
                    pr.status,
                    p.id::text              AS product_id,
                    p.sku,
                    p.name                  AS product_name,
                    p.name_si               AS product_name_si,
                    p.price::float          AS original_price,
                    p.brand,
                    p.image_url,
                    c.name                  AS category,
                    c.name_si               AS category_si
                FROM core.promotions pr
                JOIN core.products p ON p.id = pr.product_id
                JOIN core.categories c ON c.id = p.category_id
                WHERE pr.status = 'active'
                  AND pr.start_date <= NOW()
                  AND pr.end_date   >= NOW()
                  AND p.is_active = true
                ORDER BY pr.discount_percentage DESC, pr.end_date ASC
                LIMIT $1
                """,
                limit,
            )
            return [_row(r) for r in rows]
    except Exception as exc:
        logger.warning("get_active_promotions failed error=%s", exc)
        return []


# ---------------------------------------------------------------------------
# 7. Buying suggestions  (intent: buying_suggestions)
# ---------------------------------------------------------------------------

async def get_buying_suggestions(
    user_id: str | None,
    category_hint: str | None = None,
    limit: int = 6,
    filters: dict[str, Any] | None = None,
) -> list[dict[str, Any]]:
    try:
        safe_limit = max(1, min(limit, 50))
        filters = dict(filters or {})
        require_promo = bool(filters.get("requires_promo"))
        promo_where = (
            """
            AND EXISTS (
                SELECT 1
                FROM core.promotions pr
                WHERE pr.product_id = p.id
                  AND pr.status = 'active'
                  AND pr.start_date <= NOW()
                  AND pr.end_date >= NOW()
            )
            """
            if require_promo
            else ""
        )

        async with acquire() as conn:
            candidates: list[dict[str, Any]] = []

            if user_id:
                rows = await conn.fetch(
                    f"""
                    WITH user_cats AS (
                        SELECT DISTINCT p.category_id
                        FROM core.orders o
                        JOIN core.order_items oi ON oi.order_id = o.id
                        JOIN core.products p     ON p.id = oi.product_id
                        WHERE o.user_id = $1
                    ),
                    bought_products AS (
                        SELECT DISTINCT oi.product_id
                        FROM core.orders o
                        JOIN core.order_items oi ON oi.order_id = o.id
                        WHERE o.user_id = $1
                    )
                    SELECT
                        p.id::text        AS product_id,
                        p.sku,
                        p.name,
                        p.name_si,
                        p.price::float    AS price,
                        p.stock_quantity,
                        p.brand,
                        p.description,
                        p.description_si,
                        p.purchase_frequency,
                        c.name            AS category,
                        c.name_si         AS category_si,
                        p.image_url,
                        'personalised'    AS recommendation_source
                    FROM core.products p
                    JOIN core.categories c ON c.id = p.category_id
                    WHERE p.is_active = true
                      AND p.stock_quantity > 0
                      {promo_where}
                      AND p.category_id IN (SELECT category_id FROM user_cats)
                      AND p.id NOT IN (SELECT product_id FROM bought_products)
                    ORDER BY p.purchase_frequency DESC, p.name
                    LIMIT $2
                    """,
                    user_id,
                    max(safe_limit * 6, 80),
                )
                if rows:
                    candidates = [_row(r) for r in rows]

            if category_hint:
                norm_cat = _norm(category_hint)
                rows = await conn.fetch(
                    f"""
                    SELECT
                        p.id::text        AS product_id,
                        p.sku,
                        p.name,
                        p.name_si,
                        p.price::float    AS price,
                        p.stock_quantity,
                        p.brand,
                        p.description,
                        p.description_si,
                        p.purchase_frequency,
                        c.name            AS category,
                        c.name_si         AS category_si,
                        p.image_url,
                        'category-match'  AS recommendation_source
                    FROM core.products p
                    JOIN core.categories c ON c.id = p.category_id
                    WHERE p.is_active = true
                      AND p.stock_quantity > 0
                      {promo_where}
                      AND (lower(c.name) LIKE $1 OR lower(c.name_si) LIKE $1)
                    ORDER BY p.purchase_frequency DESC, p.name
                    LIMIT $2
                    """,
                    f"%{norm_cat}%",
                    max(safe_limit * 6, 80),
                )
                if rows:
                    candidates.extend([_row(r) for r in rows])

            if not candidates:
                rows = await conn.fetch(
                    f"""
                    SELECT
                        p.id::text        AS product_id,
                        p.sku,
                        p.name,
                        p.name_si,
                        p.price::float    AS price,
                        p.stock_quantity,
                        p.brand,
                        p.description,
                        p.description_si,
                        p.purchase_frequency,
                        c.name            AS category,
                        c.name_si         AS category_si,
                        p.image_url,
                        'bestsellers'     AS recommendation_source
                    FROM core.products p
                    JOIN core.categories c ON c.id = p.category_id
                    WHERE p.is_active = true
                      AND p.stock_quantity > 0
                      {promo_where}
                      AND p.purchase_frequency = 'high'
                    ORDER BY p.name
                    LIMIT $1
                    """,
                    max(safe_limit * 6, 80),
                )
                candidates = [_row(r) for r in rows]

            ranked = _apply_buying_suggestion_filters(candidates, category_hint, filters)
            return ranked[:safe_limit]

    except Exception as exc:
        logger.warning("get_buying_suggestions failed user=%r error=%s", user_id, exc)
        return []


def _apply_buying_suggestion_filters(
    rows: list[dict[str, Any]],
    category_hint: str | None,
    filters: dict[str, Any],
) -> list[dict[str, Any]]:
    if not rows:
        return []

    deduped: list[dict[str, Any]] = []
    seen: set[str] = set()
    for row in rows:
        key = str(row.get("product_id") or "")
        if not key or key in seen:
            continue
        seen.add(key)
        deduped.append(row)

    terms = _build_buying_filter_terms(filters)
    hint = _norm(category_hint or "")
    low_budget = str(filters.get("budget") or "").lower() == "low"

    scored: list[tuple[float, dict[str, Any]]] = []
    for row in deduped:
        blob = _norm(
            " ".join(
                [
                    str(row.get("name") or ""),
                    str(row.get("name_si") or ""),
                    str(row.get("brand") or ""),
                    str(row.get("category") or ""),
                    str(row.get("category_si") or ""),
                    str(row.get("description") or ""),
                    str(row.get("description_si") or ""),
                ]
            )
        )

        score = 0.0
        if hint and hint in blob:
            score += 4.0
        for term in terms:
            if term and term in blob:
                score += 2.2

        freq = str(row.get("purchase_frequency") or "").lower()
        if freq == "high":
            score += 0.8
        elif freq == "medium":
            score += 0.4

        price = float(row.get("price") or 0.0)
        if low_budget:
            score += max(0.0, 2.0 - min(price, 2000.0) / 1000.0)

        scored.append((score, row))

    if low_budget:
        scored.sort(
            key=lambda item: (
                -item[0],
                float(item[1].get("price") or 0.0),
                str(item[1].get("name") or ""),
            )
        )
    else:
        scored.sort(
            key=lambda item: (
                -item[0],
                str(item[1].get("name") or ""),
            )
        )

    return [row for _, row in scored]


def _build_buying_filter_terms(filters: dict[str, Any]) -> list[str]:
    raw_terms = [
        str(filters.get("topic") or ""),
        str(filters.get("category") or ""),
        str(filters.get("diet_goal") or ""),
        str(filters.get("dietary") or ""),
        str(filters.get("audience") or ""),
        str(filters.get("preparation") or ""),
        str(filters.get("product") or ""),
    ]
    terms = [_norm(term) for term in raw_terms if term]
    expanded: list[str] = []
    synonym_map: dict[str, list[str]] = {
        "snack": ["snack", "snacks", "biscuit", "crunch", "mini"],
        "drinks": ["drink", "juice", "beverage", "tea"],
        "tea": ["tea", "biscuit", "cookies"],
        "grocery": ["grocery", "rice", "flour", "lentil"],
        "breakfast": ["breakfast", "oats", "cereal", "milk", "bread"],
        "vegan": ["vegan", "plant", "soy", "tofu", "mushroom"],
        "high_protein": ["protein", "egg", "chicken", "bean", "lentil"],
        "diabetic_friendly": ["diabetic", "sugar free", "low sugar", "whole grain"],
        "sugar_free": ["sugar free", "no added sugar", "low sugar"],
        "healthy": ["healthy", "organic", "fresh", "low fat"],
        "weight_loss": ["low fat", "high fiber", "healthy", "whole grain"],
        "kids": ["kids", "mini", "snack", "lunch"],
        "elderly": ["easy", "soft", "soup", "porridge"],
        "easy_cook": ["easy", "ready", "instant", "quick"],
    }

    for term in terms:
        expanded.append(term)
        expanded.extend(synonym_map.get(term, []))

    deduped: list[str] = []
    seen: set[str] = set()
    for term in expanded:
        cleaned = _norm(term)
        if cleaned and cleaned not in seen:
            seen.add(cleaned)
            deduped.append(cleaned)

    return deduped
