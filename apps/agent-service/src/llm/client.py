"""
LLM response generation client.

The LLM is grounded by injecting the actual DB query results so it cannot
hallucinate prices, orders, or offers that do not exist in the database.
"""

from __future__ import annotations

from typing import Any

import httpx

from ..config import settings
from ..log import logger

_SYSTEM_PROMPT = """\
You are a warm, helpful Sinhala retail assistant for SmartRetailX.

Rules you must follow every time:
1. Always reply in **Sinhala script** (Unicode Sinhala). Mix English only for brand \
names, SKUs, product codes, or technical terms where no Sinhala equivalent exists.
2. Format replies as GitHub-flavoured Markdown. \
   - Order history, profile, promotions: use the tables already in [Deterministic Draft]. \
   - Product lists (prices/search/offers/suggestions): follow [Deterministic Draft] exactly \
     — the frontend shows interactive cards, so no extra table is needed. \
   - Use bullet lists for short enumerations. \
   - **Bold** key figures: prices (always as රු. X,XXX.XX or LKR X,XXX.XX), totals, discounts.
3. **Never invent** prices, order numbers, promotions, discount amounts, or profile data. \
   All factual data is supplied in the [DB Context] block. \
   If that block shows no data, say so honestly in Sinhala and ask a clarifying question.
4. When [DB Context] contains data, present it faithfully using the structure in \
   [Deterministic Draft]. You may rewrite Sinhala wording to sound more natural and \
   friendly, but do NOT change any numbers, names, dates, or percentages.
5. Currency: always write Sri Lankan Rupees as **රු. X,XXX.XX** (never just a number alone).
6. When the [XAI Features] block is present, add one short Sinhala sentence at \
   the end explaining *why* the assistant answered this way.
7. Never wrap the entire answer in a Markdown code block.
8. Be warm and conversational — speak as a knowledgeable friend helping someone shop, \
   not a formal system. End with a natural Sinhala follow-up question such as \
"ඔබට තවත් කුමක් හෝ දැනගැනීමට අවශ්‍යද?" or "දැනගත යුතු වෙනත් දේවල් තිබේද?" — \
never use "ඔබට තවත් කුමක් උදව් කරන්න පුළුවන්ද?".
"""

_INTENT_GUIDANCE: dict[str, str] = {
    "order_history": (
        "Present the order history in reverse chronological order. "
        "Preserve the Markdown tables exactly from [Deterministic Draft] — status, date, items, totals. "
        "All monetary values must use the format රු. X,XXX.XX. "
        "Translate order status to natural Sinhala (e.g., 'ලැබී ඇත', 'සකස් කරමින්'). "
        "Never ask for an order ID — all data is in [DB Context]. "
        "If the user asked about a specific order (e.g., 'last order', 'recent'), highlight it first."
    ),
    "prices": (
        "Copy the header and count line from [Deterministic Draft] exactly. "
        "Do NOT add a table, bullet list, or individual product names — "
        "the frontend renders interactive cards already. "
        "Optionally add one warm Sinhala sentence about availability or recommendation."
    ),
    "product_search": (
        "Copy the header and count line from [Deterministic Draft] exactly. "
        "Do NOT add a table, bullet list, or individual product names — "
        "the frontend renders interactive cards already. "
        "Optionally add one Sinhala sentence about search quality or suggest refining the query."
    ),
    "offers": (
        "Copy the header and count line from [Deterministic Draft] exactly. "
        "Do NOT add a table, bullet list, or individual product names — "
        "the frontend renders interactive cards already. "
        "Add one encouraging Sinhala sentence inviting the user to check the cards."
    ),
    "buying_suggestions": (
        "Copy the header and count line from [Deterministic Draft] exactly. "
        "Do NOT add a table, bullet list, or individual product names — "
        "the frontend renders interactive cards already. "
        "Mention whether suggestions are personalised or based on bestsellers."
    ),
    "user_profile": (
        "Present the user's profile using the Markdown tables from [Deterministic Draft]. "
        "After the tables, add a short friendly Sinhala paragraph (2-3 sentences) that:\n"
        "  1. Greets them by name.\n"
        "  2. Briefly explains their customer segment in plain Sinhala "
        "     (e.g., premium → they are a valued loyal customer).\n"
        "  3. Mentions their total spending and order count with warm appreciation.\n"
        "  4. Invites them to explore offers or suggestions relevant to their segment.\n"
        "All monetary figures must use රු. X,XXX.XX format. Never reveal internal IDs."
    ),
    "promotions": (
        "Present the full promotions table from [Deterministic Draft] faithfully. "
        "After the table, add a short Sinhala paragraph (1-2 sentences) encouraging the user "
        "to act quickly since promotions expire. "
        "Mention the discount percentages as concrete figures (e.g., 25% off). "
        "All prices must use රු. X,XXX.XX format. "
        "If there are no promotions, say so warmly and suggest checking offers instead."
    ),
    "general": (
        "Answer the general question helpfully in warm Sinhala. "
        "If the user is asking about SmartRetailX features or how to use the app, "
        "give a brief Sinhala explanation and invite them to ask a follow-up question."
    ),
}

_SIMPLE_EXPLAIN_SYSTEM_PROMPT = """\
You write exactly one short Sinhala sentence for retail users.
Rules:
1. Sinhala script only (keep brand/product terms as-is if needed).
2. Keep it simple and natural (max 22 words).
3. No Markdown, no bullets, no quotes, no extra lines.
4. Mention why these results were shown, based on intent + query + result count.
"""


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


async def generate_simple_result_explanation(
    *,
    intent_name: str,
    entities: dict[str, Any] | None,
    result_count: int,
    db_source: str,
    language: str = "si-LK",
) -> str:
    entity_product = str((entities or {}).get("product") or "").strip()
    entity_category = str((entities or {}).get("category") or "").strip()

    fallback = _fallback_simple_explanation(
        intent_name=intent_name,
        product=entity_product,
        category=entity_category,
        result_count=result_count,
    )

    payload = {
        "model": settings.openai_response_model,
        "temperature": 0.1,
        "messages": [
            {"role": "system", "content": _SIMPLE_EXPLAIN_SYSTEM_PROMPT},
            {
                "role": "user",
                "content": (
                    f"language={language}\n"
                    f"intent={intent_name}\n"
                    f"product={entity_product or '-'}\n"
                    f"category={entity_category or '-'}\n"
                    f"result_count={result_count}\n"
                    f"db_source={db_source}\n"
                    "Write one short Sinhala sentence."
                ),
            },
        ],
    }

    headers = {"Content-Type": "application/json"}
    if settings.openai_api_key:
        headers["Authorization"] = f"Bearer {settings.openai_api_key}"
    else:
        return fallback

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
            return fallback
        return " ".join(content.splitlines()).strip()
    except httpx.HTTPError:
        return fallback


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


def _fallback_simple_explanation(
    *,
    intent_name: str,
    product: str,
    category: str,
    result_count: int,
) -> str:
    if product:
        return f"ඔබ {product} ගැන ඇසූ නිසා ගැලපෙන ප්‍රතිඵල {result_count}ක් පෙන්වලා තියෙනවා."
    if category:
        return f"ඔබ ඉල්ලූ {category} category එකට ගැලපෙන ප්‍රතිඵල {result_count}ක් පෙන්වලා තියෙනවා."
    if intent_name == "order_history":
        return f"ඔබගේ ඇණවුම් ඉතිහාසය අනුව ඇණවුම් {result_count}ක් පෙන්වලා තියෙනවා."
    if intent_name == "user_profile":
        return "ඔබේ profile දත්ත ආරක්ෂිතව ලබාගෙන සාරාංශ කළා."
    if intent_name == "promotions":
        return f"දැනට ක්‍රියාත්මක promotions {result_count}ක් ඔබට ලැබිය හැකිය."
    return f"ඔබගේ ඉල්ලීමට ගැලපෙන ප්‍රතිඵල {result_count}ක් පෙන්වලා තියෙනවා."
