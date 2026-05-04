"""
LLM response generation client.

The LLM is grounded by injecting the actual DB query results so it cannot
hallucinate prices, orders, or offers that do not exist in the database.
"""

from __future__ import annotations

from typing import Any

import httpx

from ..config import settings
from ..logging import logger

_SYSTEM_PROMPT = """\
You are a helpful Sinhala retail assistant for SmartRetailX.

Rules you must follow every time:
1. Always reply in **Sinhala script** (Unicode Sinhala). Mix English only for brand \
names, SKUs, or technical terms where no Sinhala equivalent exists.
2. Format replies as GitHub-flavoured Markdown. Use tables for product lists, \
bullet lists for short enumerations, and bold for key figures (prices, totals).
3. **Never invent** prices, order numbers, stock levels, or promotions. \
   All factual data is supplied in the [DB Context] block below. \
   If that block shows no data, say so honestly in Sinhala and ask a clarifying question.
4. When [DB Context] contains data, present it faithfully using the \
   Markdown tables/lists provided in [Deterministic Draft].  \
   You may rewrite the Sinhala wording to sound more natural, \
   but do NOT change any numbers or product names.
5. When the [XAI Features] block is present, add one short Sinhala sentence at \
   the end explaining *why* the assistant answered this way \
   (e.g., "ඔබ 'Rice' යන වචනය භාවිත කළ නිසා මිල ගණන් හොයන්නට සහාය වුණා.").
6. Never wrap the entire answer in a Markdown code block.
7. Be concise – avoid unnecessary introductions or repetition.
"""

_INTENT_GUIDANCE: dict[str, str] = {
    "order_history": (
        "Present the order history in reverse chronological order. "
        "Show order number, status (translated to Sinhala), date, "
        "line items table, and total. Never ask for an order ID "
        "– the data is already in [DB Context]."
    ),
    "prices": (
        "Show the price table from [DB Context]. "
        "Add a short note about stock availability. "
        "If multiple products matched, show all of them in the table."
    ),
    "product_search": (
        "Present search results as a Markdown table. "
        "Include name, category, price, and stock status. "
        "If stock_quantity is 0, mark it clearly as out-of-stock."
    ),
    "offers": (
        "Present current offers/featured products. "
        "Highlight any discount amounts if present. "
        "Encourage the user to buy."
    ),
    "buying_suggestions": (
        "Present personalised or category-based suggestions. "
        "Mention the recommendation source (personalised/category/bestsellers) "
        "in one Sinhala sentence."
    ),
    "general": (
        "Answer the general question helpfully. "
        "If the user is asking about SmartRetailX features or how to use the app, "
        "give a brief Sinhala explanation."
    ),
}


async def generate_sinhala_response(
    text: str,
    language: str,
    session_id: str,
    user_id: str | None,
    user_context: dict[str, Any] | None,
    intents: list[str] | None,
    intent_name: str,
    intent_confidence: float,
    entities: dict[str, Any] | None = None,
    explainability: dict[str, Any] | None = None,
    db_context_summary: str = "",
    deterministic_draft: str = "",
) -> str:
    role = (user_context or {}).get("role", "guest")
    xai_block = _build_xai_block(explainability)
    intent_guidance = _INTENT_GUIDANCE.get(intent_name, "")

    user_prompt = (
        f"User role: {role}\n"
        f"Session: {session_id}\n"
        f"Language preference: {language}\n"
        f"Detected intent: {intent_name} (confidence {intent_confidence:.2f})\n"
        f"Entities: {entities or {}}\n"
        + (f"\n{xai_block}\n" if xai_block else "")
        + (f"\n{intent_guidance}\n" if intent_guidance else "")
        + (f"\n[DB Context]\n{db_context_summary}\n" if db_context_summary else "\n[DB Context]\nNo data available.\n")
        + (f"\n[Deterministic Draft]\n{deterministic_draft}\n" if deterministic_draft else "")
        + f"\n[User Transcript]\n{text}\n\n"
        "Reply only with the final Sinhala Markdown response. "
        "Preserve all table structure from [Deterministic Draft] if present; "
        "only improve the surrounding natural-language sentences."
    )

    payload = {
        "model": settings.openai_response_model,
        "temperature": 0.2,
        "messages": [
            {"role": "system", "content": _SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
    }

    headers = {"Content-Type": "application/json"}
    if settings.openai_api_key:
        headers["Authorization"] = f"Bearer {settings.openai_api_key}"
    else:
        logger.warning("OPENAI_API_KEY missing; attempting without Authorization header")

    try:
        async with httpx.AsyncClient(timeout=settings.openai_response_timeout_ms / 1000) as client:
            response = await client.post(
                f"{settings.openai_api_base_url.rstrip('/')}/chat/completions",
                headers=headers,
                json=payload,
            )
            response.raise_for_status()
            data = response.json()

        content = (
            data.get("choices", [{}])[0]
            .get("message", {})
            .get("content", "")
            .strip()
        )
        if not content:
            logger.warning("OpenAI returned empty content")
        return content

    except httpx.HTTPError as exc:
        logger.warning("OpenAI response generation failed: %s", exc)
        return ""


def _build_xai_block(explainability: dict[str, Any] | None) -> str:
    if not explainability:
        return ""

    features = explainability.get("features") or []
    rationale = str(explainability.get("rationale") or "").strip()
    lines: list[str] = []

    if rationale:
        lines.append(f"Rationale: {rationale}")
    for feat in features[:3]:
        name = feat.get("name", "")
        evidence = feat.get("evidence", "")
        weight = feat.get("weight")
        lines.append(
            f"  - {name}"
            + (f" (weight={weight:.3f})" if isinstance(weight, (int, float)) else "")
            + (f": {evidence}" if evidence else "")
        )

    return ("[XAI Features]\n" + "\n".join(lines)) if lines else ""
