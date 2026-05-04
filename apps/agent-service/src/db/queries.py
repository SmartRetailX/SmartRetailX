"""
Read-only PostgreSQL query functions, one per voice-assistant intent.

All functions borrow a connection from the shared asyncpg pool via the
`acquire()` context manager and return plain Python dicts so callers
never touch SQL or asyncpg records directly.
"""

from __future__ import annotations

import re
from typing import Any

import asyncpg

from ..logging import logger
from .connection import acquire


def _norm(text: str | None) -> str:
    """Lowercase, collapse whitespace, remove punctuation for fuzzy matching."""
    if not text:
        return ""
    return re.sub(r"[^\w\s]", "", text.lower().strip())


def _row(record: asyncpg.Record) -> dict[str, Any]:
    return dict(record)


# ---------------------------------------------------------------------------
# 1. Product search  (intent: product_search)
# ---------------------------------------------------------------------------

async def search_products(query: str, limit: int = 8) -> list[dict[str, Any]]:
    norm_query = _norm(query)
    if not norm_query:
        return []

    try:
        async with acquire() as conn:
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
                """,
                f"%{norm_query}%",
                norm_query,
                limit,
            )

            if rows:
                return [_row(r) for r in rows]

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
            return [_row(r) for r in rows]

    except Exception as exc:
        logger.warning("search_products failed query=%r error=%s", query, exc)
        return []


# ---------------------------------------------------------------------------
# 2. Product price  (intent: prices)
# ---------------------------------------------------------------------------

async def get_product_price(product_name: str) -> list[dict[str, Any]]:
    norm = _norm(product_name)
    if not norm:
        return []

    try:
        async with acquire() as conn:
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
            return [_row(r) for r in rows]

    except Exception as exc:
        logger.warning("get_product_price failed name=%r error=%s", product_name, exc)
        return []


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
                return [_row(r) for r in rows]

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
            return [_row(r) for r in rows]

    except Exception as exc:
        logger.warning("get_active_offers failed error=%s", exc)
        return []


# ---------------------------------------------------------------------------
# 4. Order history  (intent: order_history)
# ---------------------------------------------------------------------------

async def get_order_history(user_id: str, limit: int = 5) -> list[dict[str, Any]]:
    if not user_id:
        return []

    try:
        async with acquire() as conn:
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
# 5. Buying suggestions  (intent: buying_suggestions)
# ---------------------------------------------------------------------------

async def get_buying_suggestions(
    user_id: str | None,
    category_hint: str | None = None,
    limit: int = 6,
) -> list[dict[str, Any]]:
    try:
        async with acquire() as conn:
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
                    return [_row(r) for r in rows]

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
            return [_row(r) for r in rows]

    except Exception as exc:
        logger.warning("get_buying_suggestions failed user=%r error=%s", user_id, exc)
        return []
