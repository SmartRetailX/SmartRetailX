from typing import Any

import httpx

from .config import (
    SINLLAMA_API_KEY,
    SINLLAMA_BASE_URL,
    SINLLAMA_INTENT_PATH,
    SINLLAMA_RETRY_COUNT,
    SINLLAMA_TIMEOUT_MS,
)
from .logging_setup import logger


def _normalize_features(raw_features: Any) -> list[dict[str, Any]]:
    if not isinstance(raw_features, list):
        return []
    normalized: list[dict[str, Any]] = []
    for item in raw_features[:5]:
        if not isinstance(item, dict):
            continue
        name = str(item.get("name") or item.get("feature") or "").strip()
        if not name:
            continue
        normalized.append(
            {
                "name": name,
                "weight": item.get("weight"),
                "evidence": item.get("evidence") or item.get("token"),
            }
        )
    return normalized


async def detect_intent_with_sinllama(
    text: str, language: str, session_id: str, user_id: str | None, allowed_intents: list[str] | None
) -> dict[str, Any] | None:
    if not SINLLAMA_BASE_URL:
        return None

    url = f"{SINLLAMA_BASE_URL.rstrip('/')}/{SINLLAMA_INTENT_PATH.lstrip('/')}"
    headers = {"Content-Type": "application/json"}
    if SINLLAMA_API_KEY:
        headers["Authorization"] = f"Bearer {SINLLAMA_API_KEY}"

    payload = {
        "text": text,
        "language": language,
        "sessionId": session_id,
        "userId": user_id,
        "allowedIntents": allowed_intents or [],
    }
    timeout_seconds = max(1000, SINLLAMA_TIMEOUT_MS) / 1000
    attempts = max(1, SINLLAMA_RETRY_COUNT + 1)

    for attempt in range(1, attempts + 1):
        try:
            async with httpx.AsyncClient(timeout=timeout_seconds) as client:
                response = await client.post(url, headers=headers, json=payload)
                response.raise_for_status()
                data = response.json()

            intent = str(data.get("intent") or "").strip()
            if not intent:
                raise ValueError("sinLlama response missing intent")

            confidence = data.get("confidence", 0.0)
            entities = data.get("entities")
            explanation = data.get("explanation") if isinstance(data.get("explanation"), dict) else {}
            rationale = str(explanation.get("rationale") or "").strip()
            features = _normalize_features(explanation.get("features"))

            return {
                "intent": intent,
                "confidence": float(confidence) if confidence is not None else 0.0,
                "entities": entities if isinstance(entities, dict) else {},
                "explainability": {
                    "source": "sinllama",
                    "confidence": float(confidence) if confidence is not None else None,
                    "rationale": rationale or None,
                    "features": features,
                },
            }
        except Exception as error:
            logger.warning(
                "sinLlama intent call failed attempt=%s/%s session=%s error=%s",
                attempt,
                attempts,
                session_id,
                error,
            )
            if attempt == attempts:
                return None

    return None
