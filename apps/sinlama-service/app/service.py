import re
import logging
from collections import defaultdict

from .models import Explanation, ExplanationFeature, IntentRequest, IntentResponse

logger = logging.getLogger(__name__)

DEFAULT_INTENTS = [
    "offers",
    "order_history",
    "buying_suggestions",
    "prices",
    "product_search",
    "general",
]

KEYWORDS: dict[str, list[str]] = {
    "offers": [
        "offer",
        "offers",
        "promotion",
        "discount",
        "deal",
        "වට්ටම්",
        "ඔෆර්",
        "ඔෆර්ස්",
        "ඔපර්",
        "ඔපර්ස්",
        "buy 1 get 1",
        "buy one get one",
        "bogo",
        "buy 2 get 1",
        "3 for 2",
        "get one free",
        "බයිවන් ගෙට්ටුවන්",
        "බයිවන් ගෙට්වන්",
        "බායිවන් ගෙට්වන්",
        "බයිබන් ගෙට්",
        "ගෙට්ටුවන් ඔෆර්",
        "ගෙට්වන් ඔෆර්",
        "ගෙට් 1",
    ],
    "order_history": [
        "order",
        "orders",
        "order history",
        "latest order",
        "recent order",
        "ඇණවුම",
        "ඇණවුම්",
        "මිලදී ගැනීම්",
    ],
    "buying_suggestions": [
        "suggest",
        "recommend",
        "what should i buy",
        "shopping list",
        "buying list",
        "නිර්දේශ",
        "යෝජනා",
        "සැජෙස්ට්",
    ],
    "prices": ["price", "cost", "how much", "මිල", "කීයද", "කීය", "රු"],
    "product_search": [
        "search",
        "find",
        "product",
        "available",
        "availability",
        "stock",
        "භාණ්ඩ",
        "නිෂ්පාදන",
        "හොයන්න",
        "තියෙනවද",
        "තියෙනවාද",
        "තියෙනවා",
    ],
    "general": ["help", "assist", "උදව්", "ප්‍රශ්න"],
}


def _extract_product(text: str) -> str | None:
    quoted = re.findall(r'"([^"]+)"|\'([^\']+)\'', text)
    for pair in quoted:
        candidate = (pair[0] or pair[1]).strip()
        if candidate:
            return candidate
    match = re.search(
        r"(?:price|cost|මිල|search|find|product|භාණ්ඩ)\s+(?:of\s+)?([A-Za-z0-9\u0D80-\u0DFF\s\-]{2,60})",
        text,
        re.IGNORECASE,
    )
    if match:
        return match.group(1).strip(" .,!?:;\"'")
    match = re.search(
        r"([A-Za-z0-9\u0D80-\u0DFF\s\-]{2,60})\s+(?:price|cost|available|availability|stock|තියෙනවද|තියෙනවාද|තියෙනවා)",
        text,
        re.IGNORECASE,
    )
    if match:
        return match.group(1).strip(" .,!?:;\"'")
    return None


def detect_intent(payload: IntentRequest) -> IntentResponse:
    text = payload.text.strip()
    lowered = text.lower()
    intents = payload.allowedIntents or DEFAULT_INTENTS
    scores: dict[str, float] = defaultdict(float)
    matched: dict[str, list[tuple[str, float]]] = defaultdict(list)

    for intent in intents:
        for word in KEYWORDS.get(intent, []):
            if word in lowered:
                weight = 0.3 + (len(word) / 20)
                scores[intent] += weight
                matched[intent].append((word, min(weight, 1.0)))

    best_intent = intents[0] if intents else "general"
    best_score = 0.0
    for intent in intents:
        if scores[intent] > best_score:
            best_score = scores[intent]
            best_intent = intent

    if best_score <= 0:
        best_intent = "general" if "general" in intents else best_intent

    confidence = 0.35 if best_score <= 0 else min(0.95, 0.45 + best_score * 0.15)
    entities: dict[str, str] = {}
    if best_intent in ("prices", "product_search"):
        product = _extract_product(text)
        if product:
            entities["product"] = product

    features = [
        ExplanationFeature(name=name, weight=round(weight, 3), evidence=name)
        for name, weight in matched.get(best_intent, [])[:5]
    ]
    rationale = (
        f"Intent '{best_intent}' selected from matched query signals."
        if features
        else "No strong keyword signal; defaulted to general intent."
    )

    response = IntentResponse(
        intent=best_intent,
        confidence=round(confidence, 3),
        entities=entities,
        explanation=Explanation(rationale=rationale, features=features),
    )
    logger.info(
        "intent_detected sessionId=%s userId=%s language=%s intent=%s confidence=%.3f entities=%s",
        payload.sessionId,
        payload.userId or "unknown",
        payload.language,
        response.intent,
        response.confidence,
        response.entities,
    )
    return response
