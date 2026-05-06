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
    get_active_offers_for_product,
    get_active_promotions,
    get_buying_suggestions,
    get_cheapest_products,
    get_order_history,
    get_product_price,
    get_product_price_by_budget,
    get_products_by_budget,
    get_user_profile,
    search_products,
)
from ..log import logger


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
        return await _resolve_offers(entities, xai_features)
    if intent == "order_history":
        return await _resolve_order_history(
            user_id,
            xai_features,
            last_order_only=bool(entities.get("last_order_only")),
            entities=entities,
        )
    if intent == "buying_suggestions":
        return await _resolve_buying_suggestions(user_id, entities, xai_features)
    if intent == "user_profile":
        return await _resolve_user_profile(user_id, xai_features)
    if intent == "promotions":
        return await _resolve_promotions(xai_features)

    return ResolvedContext(intent=intent, entities=entities, xai_features=xai_features)


# ---------------------------------------------------------------------------
# Per-intent resolvers
# ---------------------------------------------------------------------------

async def _resolve_prices(
    entities: dict[str, Any],
    xai_features: list[dict[str, Any]],
) -> ResolvedContext:
    product_name = str(entities.get("product") or "").strip()
    modifier = str(entities.get("price_modifier") or "").strip()
    budget_amount = entities.get("budget_amount")
    category = str(entities.get("category") or "").strip() or None

    # If the extracted "product" is just the category name (e.g. user said "beverages under 1000"
    # and both product="beverages" and category="Beverages" were set), treat it as category-only.
    if product_name and category and product_name.lower() in category.lower():
        product_name = ""

    # Product + budget: search by name AND filter by price cap (e.g. "shampoo under Rs. 1000")
    if budget_amount and product_name:
        try:
            budget = float(str(budget_amount).replace(",", ""))
        except ValueError:
            budget = None
        if budget:
            rows = await get_product_price_by_budget(product_name, budget, category=category, limit=20)
            if not rows:
                # Fuzzy fallback: fuzzy-find the product (handles typos / alternate spellings),
                # then apply the budget and optional category filter client-side.
                all_rows = await get_product_price(product_name, limit=40)
                rows = [r for r in all_rows if float(r.get("price") or 0) <= budget]
                if category and rows:
                    cat_lower = category.lower()
                    rows = [r for r in rows if cat_lower in str(r.get("category") or "").lower()]
            logger.info(
                "resolve_prices product=%r budget=%.0f category=%r results=%d",
                product_name, budget, category, len(rows),
            )
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
                    f"**{product_name}** (රු. {budget_amount} ට ඇතුළත) නිෂ්පාදන හමු නොවුණා. "
                    "වෙනත් නමකින් හෝ budget එක වැඩි කළොත් සොයා දෙන්නම්."
                ),
                suggestions=suggestions,
                xai_features=xai_features,
            )

    # Budget-bound query: show all products under a price cap (optionally in a category)
    if budget_amount and not product_name:
        try:
            budget = float(str(budget_amount).replace(",", ""))
        except ValueError:
            budget = None
        if budget:
            rows = await get_products_by_budget(budget, category=category, limit=20)
            logger.info(
                "resolve_prices budget=%.0f category=%r results=%d",
                budget, category, len(rows),
            )
            return ResolvedContext(
                intent="prices",
                entities=entities,
                db_results=rows,
                db_source="db-catalog",
                has_data=bool(rows),
                xai_features=xai_features,
            )

    # Cheapest product in a category/search
    if modifier == "cheapest" and not product_name:
        rows = await get_cheapest_products(category=category, limit=10)
        logger.info("resolve_prices cheapest category=%r results=%d", category, len(rows))
        return ResolvedContext(
            intent="prices",
            entities=entities,
            db_results=rows,
            db_source="db-catalog",
            has_data=bool(rows),
            xai_features=xai_features,
        )

    # Category-only price browse (no specific product, no budget, no modifier)
    if category and not product_name and not budget_amount:
        rows = await search_products(category, limit=20)
        logger.info("resolve_prices category=%r results=%d", category, len(rows))
        return ResolvedContext(
            intent="prices",
            entities=entities,
            db_results=rows,
            db_source="db-catalog",
            has_data=bool(rows),
            needs_clarification=not rows,
            clarification_prompt_si=(
                "" if rows else
                f"**{category}** category හි භාණ්ඩ හමු නොවුණා. "
                "වෙනත් category නමක් කිවොත් ගැලපෙන ඒවා දෙන්නම."
            ),
            xai_features=xai_features,
        )

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
    logger.info("resolve_prices product=%r modifier=%r results=%d", product_name, modifier, len(rows))

    # Apply cheapest/most_expensive sort post-fetch
    if rows and modifier == "cheapest":
        rows = sorted(rows, key=lambda r: float(r.get("price") or 0))[:5]
    elif rows and modifier == "most_expensive":
        rows = sorted(rows, key=lambda r: float(r.get("price") or 0), reverse=True)[:5]

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
    category = str(entities.get("category") or "").strip()

    # If no product name but we have a category, search by category
    search_query = product_name or category

    if not search_query:
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

    rows = await search_products(search_query, limit=20)
    logger.info("resolve_product_search query=%r results=%d", search_query, len(rows))

    # Apply budget cap if present (e.g. "is there yogurt under Rs. 500?")
    budget_cap: float | None = None
    raw_cap = entities.get("budget_amount")
    if raw_cap is not None:
        try:
            budget_cap = float(str(raw_cap).replace(",", ""))
        except (ValueError, TypeError):
            pass
    if budget_cap is not None:
        rows = [r for r in rows if float(r.get("price") or 0.0) <= budget_cap]

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
            f"**{search_query}** සඳහා භාණ්ඩ හමු නොවුණා. "
            "වෙනත් නමකින් හෝ category එකෙන් සොයන්නද?"
        ),
        suggestions=suggestions,
        xai_features=xai_features,
    )


async def _resolve_offers(
    entities: dict[str, Any],
    xai_features: list[dict[str, Any]],
) -> ResolvedContext:
    product_name = str(entities.get("product") or "").strip()
    if product_name:
        rows = await get_active_offers_for_product(product_name, limit=20)
        logger.info(
            "resolve_offers product=%r results=%d",
            product_name,
            len(rows),
        )

        if rows:
            return ResolvedContext(
                intent="offers",
                entities=entities,
                db_results=rows,
                db_source="db-offers",
                has_data=True,
                xai_features=xai_features,
            )

        # Product-aware no-offer case: don't show unrelated global offers.
        catalog_matches = await search_products(product_name, limit=3)
        if not catalog_matches:
            suggestions = await fuzzy_suggest_products(product_name)
            return ResolvedContext(
                intent="offers",
                entities=entities,
                db_results=[],
                db_source="db-offers",
                has_data=False,
                needs_clarification=True,
                clarification_prompt_si=(
                    f"**{product_name}** නමින් භාණ්ඩයක් හමු නොවුණා. "
                    "නම තව ටිකක් නිවැරදිව දෙන්නද?"
                ),
                suggestions=suggestions,
                xai_features=xai_features,
            )

        return ResolvedContext(
            intent="offers",
            entities=entities,
            db_results=[],
            db_source="db-offers",
            has_data=False,
            xai_features=xai_features,
        )

    rows = await get_active_offers(limit=20)
    logger.info("resolve_offers results=%d", len(rows))

    return ResolvedContext(
        intent="offers",
        entities=entities,
        db_results=rows,
        db_source="db-offers",
        has_data=bool(rows),
        xai_features=xai_features,
    )


async def _resolve_order_history(
    user_id: str | None,
    xai_features: list[dict[str, Any]],
    last_order_only: bool = False,
    entities: dict[str, Any] | None = None,
) -> ResolvedContext:
    if not user_id:
        return ResolvedContext(
            intent="order_history",
            entities={},
            needs_clarification=True,
            clarification_prompt_si="ඇණවුම් ඉතිහාසය බලන්නට login කර ඇති වීම අවශ්‍යයි.",
            xai_features=xai_features,
        )

    entities = dict(entities or {})
    status_filter = str(entities.get("order_status_filter") or "").strip() or None
    last_n = entities.get("last_n_orders")

    if last_order_only:
        limit = 1
    elif last_n:
        limit = int(last_n)
    else:
        limit = 5

    rows = await get_order_history(user_id, limit=limit, status_filter=status_filter)
    logger.info(
        "resolve_order_history user=%r last_only=%s status_filter=%r last_n=%s results=%d",
        user_id, last_order_only, status_filter, last_n, len(rows),
    )

    final_entities = {
        "user_id": user_id,
        "last_order_only": last_order_only,
        **entities,
    }

    return ResolvedContext(
        intent="order_history",
        entities=final_entities,
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
    rows = await get_buying_suggestions(
        user_id,
        category_hint,
        limit=20,
        filters=entities,
    )
    logger.info(
        "resolve_buying_suggestions user=%r category=%r requires_promo=%s results=%d",
        user_id,
        category_hint,
        bool(entities.get("requires_promo")),
        len(rows),
    )

    return ResolvedContext(
        intent="buying_suggestions",
        entities=entities,
        db_results=rows,
        db_source="db-recommendation",
        has_data=bool(rows),
        xai_features=xai_features,
    )


async def _resolve_user_profile(
    user_id: str | None,
    xai_features: list[dict[str, Any]],
) -> ResolvedContext:
    if not user_id:
        return ResolvedContext(
            intent="user_profile",
            entities={},
            needs_clarification=True,
            clarification_prompt_si="ඔබගේ profile විස්තර බලන්නට login කර ඇති වීම අවශ්‍යයි.",
            xai_features=xai_features,
        )

    profile = await get_user_profile(user_id)
    logger.info("resolve_user_profile user=%r found=%s", user_id, profile is not None)

    has_data = profile is not None
    return ResolvedContext(
        intent="user_profile",
        entities={"user_id": user_id},
        db_results=[profile] if has_data else [],
        db_source="db-profile",
        has_data=has_data,
        needs_clarification=not has_data,
        clarification_prompt_si="" if has_data else "ඔබගේ ගිණුමේ profile දත්ත හමු නොවුණා.",
        xai_features=xai_features,
    )


async def _resolve_promotions(xai_features: list[dict[str, Any]]) -> ResolvedContext:
    rows = await get_active_promotions(limit=15)
    logger.info("resolve_promotions results=%d", len(rows))

    return ResolvedContext(
        intent="promotions",
        entities={},
        db_results=rows,
        db_source="db-promotions",
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
