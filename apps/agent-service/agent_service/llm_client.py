from typing import Any

import httpx

from .config import (
    OPENAI_API_BASE_URL,
    OPENAI_API_KEY,
    OPENAI_RESPONSE_MODEL,
    OPENAI_RESPONSE_TIMEOUT_MS,
)
from .logging_setup import logger


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

    system_prompt = (
        "You are a Sinhala retail assistant for SmartRetailX. "
        "Always answer in Sinhala language (Sinhala script). "
        "Be concise and practical. "
        "Format the response as Markdown. Use short bullet lists or GitHub-flavored "
        "Markdown tables when comparing products, orders, offers, or options. "
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
        "Use Markdown, but do not wrap the whole answer in a code block. "
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

    headers = {"Content-Type": "application/json"}
    if OPENAI_API_KEY:
        headers["Authorization"] = f"Bearer {OPENAI_API_KEY}"
    else:
        logger.warning(
            "OPENAI_API_KEY missing; attempting response generation without Authorization header"
        )

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
            logger.warning("OpenAI returned empty response content")
            return ""

        return content
    except httpx.HTTPError as error:
        logger.warning("OpenAI response generation failed: %s", error)
        return ""
