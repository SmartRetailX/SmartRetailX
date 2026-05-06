"""Pagination helpers for product-list intents."""

from __future__ import annotations

from typing import Any

_PRODUCT_PAGE_SIZE = 5


def clamp_limit(value: int | None) -> int:
    if value is None:
        return _PRODUCT_PAGE_SIZE
    return max(1, min(int(value), 10))


def to_non_negative_int(value: Any, default: int = 0) -> int:
    try:
        return max(0, int(value))
    except (TypeError, ValueError):
        return default


def build_product_pagination(
    *,
    intent: str,
    entities: dict[str, Any] | None,
    query: str | None,
    category_hint: str | None,
    total: int,
    offset: int,
    limit: int,
) -> dict[str, Any] | None:
    if total <= limit:
        return None

    next_offset = offset + limit
    return {
        "intent": intent,
        "query": query,
        "categoryHint": category_hint,
        "offset": offset,
        "limit": limit,
        "nextOffset": next_offset,
        "total": total,
        "hasMore": next_offset < total,
        "entities": entities or {},
    }
