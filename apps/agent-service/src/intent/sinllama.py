from __future__ import annotations

from typing import Any

import httpx

from ..config import settings
from ..log import logger
from ..models import IntentResult

# Sinhala/English question words that are never product names
_ENTITY_NOISE: set[str] = {
    "කීය", "කීයද", "මොන", "මොනවා", "මොනවාද", "මොනවද", "මොකක්ද", "මොකද",
    "what", "which", "how", "much", "ද", "price", "මිල",
    "අඩු", "කරලා", "තියෙනවා", "දෙන්න", "ගන්න",
}


def _normalize_features(raw: Any) -> list[dict[str, Any]]:
    if not isinstance(raw, list):
        return []
    result: list[dict[str, Any]] = []
    for item in raw[:5]:
        if not isinstance(item, dict):
            continue
        name = str(item.get("name") or item.get("feature") or "").strip()
        if not name:
            continue
        result.append({
            "name": name,
            "weight": item.get("weight"),
            "evidence": item.get("evidence") or item.get("token"),
        })
    return result


async def detect_intent_with_sinllama(
    text: str,
    language: str,
    session_id: str,
    user_id: str | None,
    allowed_intents: list[str] | None,
) -> IntentResult | None:
    if not settings.sinllama_base_url:
        return None

    url = f"{settings.sinllama_base_url.rstrip('/')}/{settings.sinllama_intent_path.lstrip('/')}"
    headers = {"Content-Type": "application/json"}
    if settings.sinllama_api_key:
        headers["Authorization"] = f"Bearer {settings.sinllama_api_key}"

    resolved_intents = [i for i in (allowed_intents or []) if i]
    if "general" not in resolved_intents:
        resolved_intents.append("general")

    payload = {
        "text": text,
        "language": language,
        "sessionId": session_id,
        "userId": user_id,
        "allowedIntents": resolved_intents,
    }
    timeout_seconds = max(1000, settings.sinllama_timeout_ms) / 1000
    attempts = max(1, settings.sinllama_retry_count + 1)

    for attempt in range(1, attempts + 1):
        try:
            async with httpx.AsyncClient(timeout=timeout_seconds) as client:
                response = await client.post(url, headers=headers, json=payload)
                response.raise_for_status()
                data = response.json()

            intent = str(data.get("intent") or "").strip()
            if not intent:
                raise ValueError("sinLlama response missing intent")

            confidence = float(data.get("confidence") or 0.0)
            entities = data.get("entities")
            explanation = data.get("explanation") if isinstance(data.get("explanation"), dict) else {}
            rationale = str(explanation.get("rationale") or "").strip()
            features = _normalize_features(explanation.get("features"))

            logger.info(
                "sinLlama intent detected: session=%s userId=%s intent=%s confidence=%.3f",
                session_id,
                user_id or "unknown",
                intent,
                confidence,
            )

            clean_entities = _sanitize_entities(
                entities if isinstance(entities, dict) else {},
                text,
            )

            return IntentResult(
                intent=intent,
                confidence=confidence,
                entities=clean_entities,
                explainability={
                    "source": "sinllama",
                    "confidence": confidence,
                    "rationale": rationale or None,
                    "features": features,
                },
            )

        except Exception as exc:
            logger.warning(
                "sinLlama intent call failed attempt=%d/%d session=%s error=%s",
                attempt,
                attempts,
                session_id,
                exc,
            )
            if attempt == attempts:
                return None

    return None


def _sanitize_entities(entities: dict[str, Any], original_text: str) -> dict[str, Any]:
    """Drop or fix entity values that are obviously noise words (e.g. 'කීයද')."""
    from .keyword import _extract_product_hint, _transliterate_si_to_en  # local import to avoid circularity

    # Transliterate the original text so product hints extracted below are in English.
    translated_text = _transliterate_si_to_en(original_text)

    result = dict(entities)
    product = str(result.get("product") or "").strip()

    # Transliterate the product value SinLlama returned (e.g. "රෙඩ් ඇප්ල්" → "red apple")
    if product:
        translated_product = _transliterate_si_to_en(product).strip()
        if translated_product != product:
            logger.info("sinllama product transliterated: %r → %r", product, translated_product)
            result["product"] = translated_product
            product = translated_product

    if product and product.lower() in _ENTITY_NOISE:
        # SinLlama grabbed a question word instead of the product — re-extract
        fallback = _extract_product_hint(translated_text)
        if fallback:
            result["product"] = fallback
            logger.info("sinllama entity sanitised: %r → %r", product, fallback)
        else:
            result.pop("product", None)
            logger.info("sinllama entity dropped noise product: %r", product)
    elif not product:
        # SinLlama returned no product — try extracting from transliterated text
        fallback = _extract_product_hint(translated_text)
        if fallback:
            result["product"] = fallback
    return result
