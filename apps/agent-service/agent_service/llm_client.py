from typing import Any

import httpx

from .config import (
    OPENAI_API_BASE_URL,
    OPENAI_API_KEY,
    OPENAI_RESPONSE_MODEL,
    OPENAI_RESPONSE_TIMEOUT_MS,
)
from .logging_setup import logger


def _fallback_response(
    text: str, intent_name: str, entities: dict[str, Any] | None
) -> str:
    product = (entities or {}).get("product")
    if intent_name == "offers":
        return "ඔබට ලබාගත හැකි නවතම offers බලලා කෙටි සාරාංශයක් දෙනවා."
    if intent_name == "order_history":
        return "ඔබගේ පසුගිය ඇණවුම් ඉතිහාසය අනුව සාරාංශය ලබා දෙන්නම්."
    if intent_name == "buying_suggestions":
        return "ඔබගේ පෙර මිලදී ගැනීම් අනුව සුදුසු භාණ්ඩ නිර්දේශ දෙන්නම්."
    if intent_name == "prices":
        if product:
            return f'"{product}" භාණ්ඩයේ මිල තොරතුරු පරීක්ෂා කර ලබා දෙන්නම්.'
        return "භාණ්ඩයේ නම ලබා දෙන්න. එවිට මිල නිවැරදිව ලබා දෙන්න පුළුවන්."
    if intent_name == "product_search":
        if product:
            return f'"{product}" සෙවීම ආරම්භ කරනවා.'
        return "ඔබ සෙවිය යුතු භාණ්ඩයේ නම කියන්න."
    return f"ඔබගේ ප්‍රශ්නය ලැබුණා: {text}"


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
) -> str:
    role = (user_context or {}).get("role", "guest")

    if not OPENAI_API_KEY:
        logger.warning(
            "OPENAI_API_KEY missing for response generation; using deterministic fallback"
        )
        return _fallback_response(text, intent_name, entities)

    system_prompt = (
        "You are a Sinhala retail assistant for SmartRetailX. "
        "Always answer in Sinhala language (Sinhala script). "
        "Be concise and practical. "
        "Never invent unavailable prices, orders, or offers. "
        "If required detail is missing, ask one short clarification question in Sinhala."
    )

    intent_guidance = ""
    if intent_name == "order_history":
        intent_guidance = (
            "For order-history queries, do NOT ask for an order id by default. "
            "Assume backend can resolve the latest order using authenticated user context."
        )

    user_prompt = (
        f"User role: {role}\n"
        f"Session: {session_id}\n"
        f"User id: {user_id or 'unknown'}\n"
        f"Language preference: {language}\n"
        f"Detected intent: {intent_name}\n"
        f"Intent confidence: {intent_confidence:.2f}\n"
        f"Allowed intents: {', '.join(intents or [intent_name])}\n"
        f"Extracted entities: {entities or {}}\n"
        f"Explainability hint: {explainability or {}}\n"
        f"Intent-specific guidance: {intent_guidance or 'N/A'}\n"
        f"User transcript: {text}\n\n"
        "Reply only with final Sinhala response text. "
        "When explainability hint is available, include one short Sinhala reason sentence."
    )

    payload = {
        "model": OPENAI_RESPONSE_MODEL,
        "temperature": 0.2,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
    }

    headers = {
        "Authorization": f"Bearer {OPENAI_API_KEY}",
        "Content-Type": "application/json",
    }

    timeout_seconds = OPENAI_RESPONSE_TIMEOUT_MS / 1000

    try:
        async with httpx.AsyncClient(timeout=timeout_seconds) as client:
            response = await client.post(
                f"{OPENAI_API_BASE_URL.rstrip('/')}/chat/completions",
                headers=headers,
                json=payload,
            )
            response.raise_for_status()
            data = response.json()

        content = (
            data.get("choices", [{}])[0].get("message", {}).get("content", "").strip()
        )

        if not content:
            return _fallback_response(text, intent_name, entities)

        return content
    except httpx.HTTPError as error:
        logger.warning("OpenAI response generation failed; using fallback: %s", error)
        return _fallback_response(text, intent_name, entities)
