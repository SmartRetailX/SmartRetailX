import re
import unicodedata
from typing import Any

from ..config import settings

_NOISE_WORDS = {
    "කීය", "කීයද", "මොන", "මොනවා", "මොනවාද", "මොනවද",
    "what", "which", "how", "much", "ද",
}
_TRIM_WORDS = {
    "වල", "වර්ග", "වර්ගයේ", "මිල", "නිෂ්පාදන", "භාණ්ඩ",
    "product", "products", "of",
}
_LEADING_FILLERS = {
    "මට", "මිලදී", "ගත", "හැකි", "ඔබට", "අවශ්‍ය",
    "please", "show", "find", "search", "available", "availability",
}

_KEYWORDS: dict[str, list[str]] = {
    "offers": [
        "offer", "promotion", "discount", "deal", "special",
        "වට්ටම්", "offer එක", "promotions", "ඔෆර්", "ඔෆර්ස්", "ඔපර්", "ඔපර්ස්",
    ],
    "order_history": [
        "order history", "order status", "order details", "past order",
        "previous order", "last order", "latest order", "recent order",
        "orders", "purchase history", "latest purchase", "recent purchase",
        "previous purchase", "past purchase", "purchases",
        "ඇණවුම", "ඇණවුම්", "ඇනවුම", "ඇනවුම්", "පෙර ඇණවුම්",
        "අවසාන ඇණවුම", "අලුත්ම ඇණවුම", "අන්තිම ඇණවුම", "ඇණවුම් ඉතිහාස",
        "පෙර මිලදී ගැනීම්", "මගේ මිලදී ගැනීම්", "මිලදී ගත්",
        "ඔර්ඩර්", "ඔර්ඩර්ස්", "ඕඩර්", "ඕඩර්ස්", "ඔඩර්", "ඔඩර්ස්",
        "ඕඩර", "ඕඩරස්", "ඔඩර", "ඔඩරස්",
    ],
    "buying_suggestions": [
        "suggest", "recommend", "buy", "what should i buy",
        "නිර්දේශ", "සැජෙස්ට්", "අදහස",
    ],
    "prices": ["price", "cost", "how much", "මිල", "ගණන", "කීයද", "කීය"],
    "product_search": [
        "search", "find", "show product", "product", "available",
        "availability", "stock", "භාණ්ඩ", "නිෂ්පාදන", "හොයන්න",
        "තියෙනවද", "තියෙනවාද", "තියෙනවා",
    ],
    "general": ["help", "assist", "question", "ප්‍රශ්න", "උදව්"],
}

_ORDER_HISTORY_STRONG_SIGNALS = [
    "order history",
    "order status",
    "order details",
    "past order",
    "previous order",
    "latest order",
    "recent order",
    "orders",
    "purchase history",
    "latest purchase",
    "recent purchase",
    "ඇණවුම් ඉතිහාස",
    "පෙර ඇණවුම්",
    "මගේ ඇණවුම්",
    "ඇණවුම",
    "ඇණවුම්",
    "ඇනවුම",
    "ඇනවුම්",
    "ඔර්ඩර්",
    "ඔර්ඩර්ස්",
    "ඕඩර්",
    "ඕඩර්ස්",
    "ඔඩර්",
    "ඔඩර්ස්",
    "ඕඩර",
    "ඕඩරස්",
]


def detect_intent_and_entities(
    text: str,
    allowed_intents: list[str] | None,
) -> tuple[str, float, dict[str, Any], str | None]:
    lowered = text.lower()
    intents = list(dict.fromkeys(allowed_intents or settings.default_intents))
    scores: dict[str, int] = {intent: 0 for intent in intents}

    for intent, words in _KEYWORDS.items():
        if intent not in scores:
            continue
        for word in words:
            if word in lowered:
                scores[intent] += 1

    if scores:
        best_score = max(scores.values())
        if best_score <= 0:
            best_intent = "general" if "general" in scores else (intents[0] if intents else "general")
        else:
            best_intent = next(i for i in intents if scores[i] == best_score)
    else:
        best_intent = "general"

    best_score = scores.get(best_intent, 0)
    confidence = min(0.95, 0.4 + best_score * 0.18) if best_score > 0 else 0.35

    entities: dict[str, Any] = {}
    product_hint = _extract_product_hint(text)
    if product_hint:
        entities["product"] = product_hint

    price_match = re.search(r"(රු\.?|lkr|rs\.?)\s*([0-9,]+)", lowered, re.IGNORECASE)
    if price_match:
        entities["price"] = price_match.group(2).replace(",", "")

    clarification: str | None = None
    if best_intent in ("prices", "product_search") and "product" not in entities:
        clarification = "ඔබට අවශ්‍ය භාණ්ඩයේ නම කියන්න. එතකොට මට නිවැරදිව උත්තර දෙන්න පුළුවන්."

    return best_intent, confidence, entities, clarification


def has_order_history_signal(text: str) -> bool:
    lowered = (text or "").lower()
    return any(signal in lowered for signal in _ORDER_HISTORY_STRONG_SIGNALS)


def _sanitize_entity_candidate(candidate: str) -> str | None:
    value = re.sub(r"\s+", " ", (candidate or "").strip(" .,!?:;\"'")).strip()
    if not value:
        return None

    tokens = [t for t in value.split() if t]
    if not tokens:
        return None

    while tokens and tokens[0].lower() in _LEADING_FILLERS:
        tokens.pop(0)
    while tokens and tokens[-1].lower() in _TRIM_WORDS:
        tokens.pop()
    while tokens and tokens[-1].lower() in _NOISE_WORDS:
        tokens.pop()

    if not tokens:
        return None

    cleaned = " ".join(tokens).strip()
    if not cleaned or cleaned.lower() in _NOISE_WORDS or cleaned.lower() in _TRIM_WORDS:
        return None
    return cleaned


def _extract_product_hint(text: str) -> str | None:
    normalized = text.strip()

    for pair in re.findall(r'"([^"]+)"|\'([^\']+)\'', normalized):
        value = _sanitize_entity_candidate(pair[0] or pair[1])
        if value:
            return value

    patterns = [
        r"(?:price|cost|මිල|මිලක්|ගණන)\s+(?:of\s+)?([A-Za-z0-9඀-෿\s\-]{2,40})",
        r"(?:search|find|show|find me|product|භාණ්ඩ|නිෂ්පාදන)\s+([A-Za-z0-9඀-෿\s\-]{2,40})",
        r"([A-Za-z0-9඀-෿\s\-]{2,60})\s+(?:price|cost|available|availability|stock)",
        r"([A-Za-z0-9඀-෿\s\-]{2,60})\s+(?:තියෙනවද|තියෙනවාද|තියෙනවා|තියනවද)",
        r"([A-Za-z0-9඀-෿\s\-]{2,40})\s+වල\s+මිල",
        r"([A-Za-z0-9඀-෿\s\-]{2,40})\s+මිල\s+කීයද",
        r"(?:මිලදී\s+ගත\s+හැකි\s+)?([A-Za-z0-9඀-෿\s\-]{2,40})\s+නිෂ්පාදන",
    ]
    for pattern in patterns:
        match = re.search(pattern, normalized, re.IGNORECASE)
        if match:
            value = _sanitize_entity_candidate(match.group(1) or "")
            if value:
                return value

    return None
