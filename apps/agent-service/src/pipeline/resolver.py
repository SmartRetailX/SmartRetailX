"""
Intent resolver: intent detection output → DB query → structured context.

No rendering happens here — this module is pure data retrieval.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from ..db.queries import (
    fuzzy_suggest_products,
    get_active_offers,
    get_buying_suggestions,
    get_order_history,
    get_product_price,
    search_products,
)
from ..logging import logger


@dataclass
class ResolvedContext:
    """Typed data returned after resolving an intent against the database."""

    intent: str
    entities: dict[str, Any]
    db_results: list[dict[str, Any]] = field(default_factory=list)
    db_source: str = "none"
    has_data: bool = False
    needs_clarification: bool = False
    clarification_prompt_si: str = ""
    suggestions: list[str] = field(default_factory=list)
    xai_features: list[dict[str, Any]] = field(default_factory=list)


async def resolve_intent(
    intent: str,
    entities: dict[str, Any],
    user_id: str | None,
    explainability: dict[str, Any] | None,
) -> ResolvedContext:
    xai_features = _extract_xai_features(explainability)

    if intent == "prices":
        return await _resolve_prices(entities, xai_features)
    if intent == "product_search":
        return await _resolve_product_search(entities, xai_features)
    if intent == "offers":
        return await _resolve_offers(xai_features)
    if intent == "order_history":
        return await _resolve_order_history(user_id, xai_features)
    if intent == "buying_suggestions":
        return await _resolve_buying_suggestions(user_id, entities, xai_features)

    return ResolvedContext(intent=intent, entities=entities, xai_features=xai_features)


# ---------------------------------------------------------------------------
# Per-intent resolvers
# ---------------------------------------------------------------------------

async def _resolve_prices(
    entities: dict[str, Any],
    xai_features: list[dict[str, Any]],
) -> ResolvedContext:
    product_name = str(entities.get("product") or "").strip()

    if not product_name:
        suggestions = await fuzzy_suggest_products("")
        return ResolvedContext(
            intent="prices",
            entities=entities,
            needs_clarification=True,
            clarification_prompt_si=(
                "ඔබට මිල දැනගන්න ඕන භාණ්ඩයේ නම කියන්න. "
                "නිදසුන: \"Rice 5kg වල මිල කීයද?\""
            ),
            suggestions=suggestions,
            xai_features=xai_features,
        )

    rows = await get_product_price(product_name, limit=20)
    logger.info("resolve_prices product=%r results=%d", product_name, len(rows))

    suggestions: list[str] = []
    if not rows:
        suggestions = await fuzzy_suggest_products(product_name)

    return ResolvedContext(
        intent="prices",
        entities=entities,
        db_results=rows,
        db_source="db-catalog",
        has_data=bool(rows),
        needs_clarification=not rows,
        clarification_prompt_si=(
            "" if rows else
            f"**{product_name}** නමින් භාණ්ඩයක් හමු නොවුණා. "
            "නමෙහි අක්ෂර වළදා හෝ category නම කියන්න."
        ),
        suggestions=suggestions,
        xai_features=xai_features,
    )


async def _resolve_product_search(
    entities: dict[str, Any],
    xai_features: list[dict[str, Any]],
) -> ResolvedContext:
    product_name = str(entities.get("product") or "").strip()

    if not product_name:
        suggestions = await fuzzy_suggest_products("")
        return ResolvedContext(
            intent="product_search",
            entities=entities,
            needs_clarification=True,
            clarification_prompt_si=(
                "හොයන්න ඕන භාණ්ඩයේ නම හෝ category එක කියන්න. "
                "නිදසුන: \"Milk\" හෝ \"Dairy products\""
            ),
            suggestions=suggestions,
            xai_features=xai_features,
        )

    rows = await search_products(product_name, limit=20)
    logger.info("resolve_product_search query=%r results=%d", product_name, len(rows))

    # Fuzzy suggestions if LIKE + fuzzy DB search still returned nothing
    suggestions: list[str] = []
    if not rows:
        suggestions = await fuzzy_suggest_products(product_name)

    return ResolvedContext(
        intent="product_search",
        entities=entities,
        db_results=rows,
        db_source="db-catalog",
        has_data=bool(rows),
        needs_clarification=not rows,
        clarification_prompt_si=(
            "" if rows else
            f"**{product_name}** සඳහා භාණ්ඩ හමු නොවුණා. "
            "වෙනත් නමකින් හෝ category එකෙන් සොයන්නද?"
        ),
        suggestions=suggestions,
        xai_features=xai_features,
    )


async def _resolve_offers(xai_features: list[dict[str, Any]]) -> ResolvedContext:
    rows = await get_active_offers(limit=20)
    logger.info("resolve_offers results=%d", len(rows))

    return ResolvedContext(
        intent="offers",
        entities={},
        db_results=rows,
        db_source="db-offers",
        has_data=bool(rows),
        xai_features=xai_features,
    )


async def _resolve_order_history(
    user_id: str | None,
    xai_features: list[dict[str, Any]],
) -> ResolvedContext:
    if not user_id:
        return ResolvedContext(
            intent="order_history",
            entities={},
            needs_clarification=True,
            clarification_prompt_si="ඇණවුම් ඉතිහාසය බලන්නට login කර ඇති වීම අවශ්‍යයි.",
            xai_features=xai_features,
        )

    rows = await get_order_history(user_id)
    logger.info("resolve_order_history user=%r results=%d", user_id, len(rows))

    return ResolvedContext(
        intent="order_history",
        entities={"user_id": user_id},
        db_results=rows,
        db_source="db-order",
        has_data=bool(rows),
        needs_clarification=not rows,
        clarification_prompt_si="" if rows else "ඔබගේ ගිණුමේ ඇණවුම් ඉතිහාසයක් හමු නොවුණා.",
        xai_features=xai_features,
    )


async def _resolve_buying_suggestions(
    user_id: str | None,
    entities: dict[str, Any],
    xai_features: list[dict[str, Any]],
) -> ResolvedContext:
    category_hint = str(entities.get("category") or entities.get("product") or "").strip() or None
    rows = await get_buying_suggestions(user_id, category_hint, limit=20)
    logger.info(
        "resolve_buying_suggestions user=%r category=%r results=%d",
        user_id, category_hint, len(rows),
    )

    return ResolvedContext(
        intent="buying_suggestions",
        entities=entities,
        db_results=rows,
        db_source="db-recommendation",
        has_data=bool(rows),
        xai_features=xai_features,
    )


# ---------------------------------------------------------------------------
# XAI helper
# ---------------------------------------------------------------------------

def _extract_xai_features(explainability: dict[str, Any] | None) -> list[dict[str, Any]]:
    if not explainability:
        return []
    raw = explainability.get("features")
    if not isinstance(raw, list):
        return []
    features = []
    for item in raw[:5]:
        if not isinstance(item, dict):
            continue
        name = str(item.get("name") or "").strip()
        if name:
            features.append({"name": name, "weight": item.get("weight"), "evidence": item.get("evidence")})
    return features
