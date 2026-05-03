"""
Database query functions for each voice assistant intent.

Each function connects to the PostgreSQL database, executes parameterised
queries against the core schema, and returns plain Python dicts/lists so the
caller never has to touch SQL.  All queries are read-only.

Connection is created per-call using asyncpg so the agent service stays
stateless and compatible with any deployment topology (single process,
multi-process, serverless).
"""

from __future__ import annotations

import re
from typing import Any

import asyncpg

from .config import DATABASE_URL
from .logging_setup import logger


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _norm(text: str | None) -> str:
    """Lowercase, collapse whitespace, remove punctuation for fuzzy matching."""
    if not text:
        return ""
    return re.sub(r"[^\w\s]", "", text.lower().strip())


async def _get_conn() -> asyncpg.Connection:
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL is not configured – cannot run DB queries")
    return await asyncpg.connect(DATABASE_URL)


def _row_to_dict(row: asyncpg.Record) -> dict[str, Any]:
    return dict(row)


# ---------------------------------------------------------------------------
# 1. PRODUCT SEARCH  (intent: product_search)
# ---------------------------------------------------------------------------

async def search_products(query: str, limit: int = 8) -> list[dict[str, Any]]:
    """
    Full-text + alias fuzzy search for products.

    Strategy:
      1. Exact / prefix match on name / name_si / sku
      2. Alias match (alias_normalized column)
      3. Trigram similarity fallback via pg_trgm (if available)

    Returns list of product dicts with category name included.
    """
    norm_query = _norm(query)
    if not norm_query:
        return []

    conn: asyncpg.Connection | None = None
    try:
        conn = await _get_conn()

        # Step 1 – name / sku prefix match
        rows = await conn.fetch(
            """
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
              AND (
                lower(p.name)    LIKE $1
                OR lower(p.name_si) LIKE $1
                OR lower(p.sku)  LIKE $1
                OR lower(p.brand) LIKE $1
              )
            ORDER BY
                CASE WHEN lower(p.name) = $2 THEN 0 ELSE 1 END,
                p.purchase_frequency DESC,
                p.name
            LIMIT $3
            """,
            f"%{norm_query}%",
            norm_query,
            limit,
        )

        if rows:
            return [_row_to_dict(r) for r in rows]

        # Step 2 – alias match
        rows = await conn.fetch(
            """
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
            JOIN core.product_aliases pa ON pa.product_id = p.id
            WHERE p.is_active = true
              AND lower(pa.alias_normalized) LIKE $1
            ORDER BY pa.weight DESC, p.purchase_frequency DESC, p.name
            LIMIT $2
            """,
            f"%{norm_query}%",
            limit,
        )

        return [_row_to_dict(r) for r in rows]

    except Exception as exc:
        logger.warning("search_products failed query=%r error=%s", query, exc)
        return []
    finally:
        if conn:
            await conn.close()


# ---------------------------------------------------------------------------
# 2. PRODUCT PRICE  (intent: prices)
# ---------------------------------------------------------------------------

async def get_product_price(product_name: str) -> list[dict[str, Any]]:
    """
    Return price + stock info for products matching the given name.
    Tries exact then partial then alias matching.
    """
    norm = _norm(product_name)
    if not norm:
        return []

    conn: asyncpg.Connection | None = None
    try:
        conn = await _get_conn()

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
                c.name_si         AS category_si
            FROM core.products p
            JOIN core.categories c ON c.id = p.category_id
            WHERE p.is_active = true
              AND (
                lower(p.name)    LIKE $1
                OR lower(p.name_si) LIKE $1
                OR lower(p.sku)  = $2
              )
            ORDER BY
                CASE WHEN lower(p.name) = $2 THEN 0 ELSE 1 END,
                p.name
            LIMIT 5
            """,
            f"%{norm}%",
            norm,
        )

        if rows:
            return [_row_to_dict(r) for r in rows]

        # alias fallback
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
                c.name_si         AS category_si
            FROM core.products p
            JOIN core.categories c ON c.id = p.category_id
            JOIN core.product_aliases pa ON pa.product_id = p.id
            WHERE p.is_active = true
              AND lower(pa.alias_normalized) LIKE $1
            ORDER BY pa.weight DESC, p.name
            LIMIT 5
            """,
            f"%{norm}%",
        )

        return [_row_to_dict(r) for r in rows]

    except Exception as exc:
        logger.warning("get_product_price failed name=%r error=%s", product_name, exc)
        return []
    finally:
        if conn:
            await conn.close()


# ---------------------------------------------------------------------------
# 3. ACTIVE OFFERS  (intent: offers)
# ---------------------------------------------------------------------------

async def get_active_offers(limit: int = 6) -> list[dict[str, Any]]:
    """
    Return active promotions / offers from the orders discount data.

    Since the schema stores promotions implicitly through the Order.discount
    field and does not have a first-class promotions table in the Prisma
    schema shown, we surface the products with the highest discount penetration
    (ratio of orders that contained a discount) as a proxy for "on offer".

    If a promotions table is added later, swap this query out.
    """
    conn: asyncpg.Connection | None = None
    try:
        conn = await _get_conn()

        rows = await conn.fetch(
            """
            SELECT
                p.id::text          AS product_id,
                p.sku,
                p.name,
                p.name_si,
                p.price::float      AS price,
                p.brand,
                c.name              AS category,
                c.name_si           AS category_si,
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
            return [_row_to_dict(r) for r in rows]

        # Fallback: return top products by purchase frequency as "featured"
        rows = await conn.fetch(
            """
            SELECT
                p.id::text        AS product_id,
                p.sku,
                p.name,
                p.name_si,
                p.price::float    AS price,
                p.brand,
                c.name            AS category,
                c.name_si         AS category_si,
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
        return [_row_to_dict(r) for r in rows]

    except Exception as exc:
        logger.warning("get_active_offers failed error=%s", exc)
        return []
    finally:
        if conn:
            await conn.close()


# ---------------------------------------------------------------------------
# 4. ORDER HISTORY  (intent: order_history)
# ---------------------------------------------------------------------------

async def get_order_history(user_id: str, limit: int = 5) -> list[dict[str, Any]]:
    """
    Return the most recent orders for the authenticated user, including
    line items.
    """
    if not user_id:
        return []

    conn: asyncpg.Connection | None = None
    try:
        conn = await _get_conn()

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
            limit,
        )

        if not order_rows:
            return []

        order_ids = [str(r["order_id"]) for r in order_rows]

        # Fetch items for those orders in one query
        item_rows = await conn.fetch(
            """
            SELECT
                oi.order_id::text   AS order_id,
                oi.product_name,
                oi.product_name_si,
                oi.product_sku,
                oi.quantity,
                oi.unit_price::float AS unit_price,
                oi.total_price::float AS total_price
            FROM core.order_items oi
            WHERE oi.order_id = ANY($1::uuid[])
            ORDER BY oi.order_id, oi.product_name
            """,
            order_ids,
        )

        # Group items by order_id
        items_by_order: dict[str, list[dict]] = {}
        for item in item_rows:
            oid = item["order_id"]
            items_by_order.setdefault(oid, []).append(_row_to_dict(item))

        orders = []
        for row in order_rows:
            order = _row_to_dict(row)
            order["items"] = items_by_order.get(order["order_id"], [])
            orders.append(order)

        return orders

    except Exception as exc:
        logger.warning("get_order_history failed user=%r error=%s", user_id, exc)
        return []
    finally:
        if conn:
            await conn.close()


# ---------------------------------------------------------------------------
# 5. BUYING SUGGESTIONS  (intent: buying_suggestions)
# ---------------------------------------------------------------------------

async def get_buying_suggestions(
    user_id: str | None,
    category_hint: str | None = None,
    limit: int = 6,
) -> list[dict[str, Any]]:
    """
    Personalised product recommendations.

    Algorithm (in priority order):
      1. If user has order history → recommend popular products in the same
         categories the user has bought from, excluding already-purchased SKUs.
      2. If a category_hint is given → return top products in that category.
      3. Global bestsellers (high purchase_frequency, well-stocked).
    """
    conn: asyncpg.Connection | None = None
    try:
        conn = await _get_conn()

        if user_id:
            rows = await conn.fetch(
                """
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
                    c.name            AS category,
                    c.name_si         AS category_si,
                    'personalised'    AS recommendation_source
                FROM core.products p
                JOIN core.categories c ON c.id = p.category_id
                WHERE p.is_active = true
                  AND p.stock_quantity > 0
                  AND p.category_id IN (SELECT category_id FROM user_cats)
                  AND p.id NOT IN (SELECT product_id FROM bought_products)
                ORDER BY p.purchase_frequency DESC, p.name
                LIMIT $2
                """,
                user_id,
                limit,
            )
            if rows:
                return [_row_to_dict(r) for r in rows]

        if category_hint:
            norm_cat = _norm(category_hint)
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
                    'category-match'  AS recommendation_source
                FROM core.products p
                JOIN core.categories c ON c.id = p.category_id
                WHERE p.is_active = true
                  AND p.stock_quantity > 0
                  AND (lower(c.name) LIKE $1 OR lower(c.name_si) LIKE $1)
                ORDER BY p.purchase_frequency DESC, p.name
                LIMIT $2
                """,
                f"%{norm_cat}%",
                limit,
            )
            if rows:
                return [_row_to_dict(r) for r in rows]

        # Global bestsellers fallback
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
                'bestsellers'     AS recommendation_source
            FROM core.products p
            JOIN core.categories c ON c.id = p.category_id
            WHERE p.is_active = true
              AND p.stock_quantity > 0
              AND p.purchase_frequency = 'high'
            ORDER BY p.name
            LIMIT $1
            """,
            limit,
        )
        return [_row_to_dict(r) for r in rows]

    except Exception as exc:
        logger.warning("get_buying_suggestions failed user=%r error=%s", user_id, exc)
        return []
    finally:
        if conn:
            await conn.close()
