import re
import unicodedata
from typing import Any

from ..config import settings

_NOISE_WORDS = {
    "කීය",
    "කීයද",
    "මොන",
    "මොනවා",
    "මොනවාද",
    "මොනවද",
    "මොකක්ද",
    "මොකද",
    "what",
    "which",
    "how",
    "much",
    "ද",
    "අඩු",
    "කරලා",
    "තියෙනවා",
    "තියෙනවාද",
    "දෙන්න",
    "ගන්න",
}
_TRIM_WORDS = {
    "වල",
    "වර්ග",
    "වර්ගයේ",
    "මිල",
    "නිෂ්පාදන",
    "භාණ්ඩ",
    "product",
    "products",
    "of",
    "ලිස්ට්",
    "ප්‍රඩක්ලිස්ට්",
    "list",
    "දෙන්න",
    "එක",
    "එකක්",
    "ලබාදෙන්න",
    "කියන්න",
    "පෙන්වන්න",
}
_LEADING_FILLERS = {
    "මට",
    "මිලදී",
    "ගත",
    "හැකි",
    "ඔබට",
    "අවශ්‍ය",
    "හොයන්න",
    "please",
    "show",
    "find",
    "search",
    "available",
    "availability",
}
_DEMONSTRATIVES = {
    "මේකවල",
    "ඒකවල",
    "ඒකේ",
    "මේකේ",
    "මෙකේ",
    "මෙකවල",
    "this",
    "that",
}

_KEYWORDS: dict[str, list[str]] = {
    "offers": [
        "offer",
        "promotion",
        "discount",
        "deal",
        "special",
        "වට්ටම්",
        "offer එක",
        "promotions",
        "ඔෆර්",
        "ඔෆර්ස්",
        "ඔපර්",
        "ඔපර්ස්",
        "අඩු",
        "මිල අඩු",
        "අඩු කරලා",
        "price reduced",
        "price cut",
        "reduced price",
        "ලාභ",
        "ලාභ මිල",
        "sale price",
        "discounted",
        "buy 1 get 1",
        "buy one get one",
        "bogo",
        "buy 2 get 1",
        "3 for 2",
        "buy one",
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
        "order history",
        "order status",
        "order details",
        "past order",
        "previous order",
        "last order",
        "latest order",
        "recent order",
        "orders",
        "purchase history",
        "latest purchase",
        "recent purchase",
        "previous purchase",
        "past purchase",
        "purchases",
        "ඇණවුම",
        "ඇණවුම්",
        "ඇනවුම",
        "ඇනවුම්",
        "පෙර ඇණවුම්",
        "අවසාන ඇණවුම",
        "අලුත්ම ඇණවුම",
        "අන්තිම ඇණවුම",
        "ඇණවුම් ඉතිහාස",
        "පෙර මිලදී ගැනීම්",
        "මගේ මිලදී ගැනීම්",
        "මිලදී ගත්",
        "අන්තිමට ගත්",
        "අන්තිම",
        "ගත්තේ",
        "ගත්",
        "අලුත්ම",
        "අවසාන",
        "ඔර්ඩර්",
        "ඔර්ඩර්ස්",
        "ඕඩර්",
        "ඕඩර්ස්",
        "ඔඩර්",
        "ඔඩර්ස්",
        "ඕඩර",
        "ඕඩරස්",
        "ඔඩර",
        "ඔඩරස්",
    ],
    "buying_suggestions": [
        "suggest",
        "recommend",
        "buy",
        "what should i buy",
        "නිර්දේශ",
        "සැජෙස්ට්",
        "අදහස",
    ],
    "prices": [
        "price",
        "cost",
        "how much",
        "මිල",
        "ගණන",
        "කීයද",
        "කීය",
        "මොකක්ද",
        "මොකද",
    ],
    "product_search": [
        "search",
        "find",
        "show product",
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
    "user_profile": [
        "my profile",
        "profile",
        "my account",
        "account details",
        "my info",
        "personal info",
        "who am i",
        "user details",
        "loyalty",
        "my segment",
        "customer segment",
        "මගේ profile",
        "profile බලන්න",
        "මගේ ගිණුම",
        "ගිණුම් විස්තර",
        "මගේ තොරතුරු",
        "ගනුදෙනු කාණ්ඩය",
        "segment",
        "loyalty tier",
        "profile විස්තර",
        "ගිණුම",
        "ගිනුම",
        "මා ගැන",
    ],
    "promotions": [
        "promotion",
        "promotions",
        "promo",
        "flash sale",
        "sale",
        "seasonal offer",
        "bundle",
        "clearance",
        "active promotion",
        "current promotion",
        "today offer",
        "today deals",
        "ප්‍රමෝෂන්",
        "ප්‍රමෝ",
        "flash sale",
        "seasonal",
        "දැනට ඇති promotions",
        "දැනට promotions",
        "promotions මොනවාද",
        "දැනට ඇති offers",
        "නව promotions",
        "sale ඇතිද",
        "ප්‍රොමෝෂන්",
        "ප්‍රොමෝ",
        "සේල්",
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
    "අන්තිමට ගත්",
    "ගත්තේ",
    "ඔර්ඩර්",
    "ඔර්ඩර්ස්",
    "ඕඩර්",
    "ඕඩර්ස්",
    "ඔඩර්",
    "ඔඩර්ස්",
    "ඕඩර",
    "ඕඩරස්",
]


_USER_PROFILE_STRONG_SIGNALS = [
    "my profile",
    "my account",
    "profile",
    "account details",
    "who am i",
    "my segment",
    "customer segment",
    "loyalty",
    "මගේ profile",
    "profile බලන්න",
    "මගේ ගිණුම",
    "ගිණුම් විස්තර",
    "ගනුදෙනු කාණ්ඩය",
    "segment",
    "profile විස්තර",
    "මා ගැන",
    "loyalty tier",
]

_PROMOTIONS_STRONG_SIGNALS = [
    "promotion",
    "promotions",
    "promo",
    "flash sale",
    "clearance",
    "seasonal offer",
    "bundle deal",
    "active promotion",
    "current promotion",
    "ප්‍රමෝෂන්",
    "ප්‍රොමෝෂන්",
    "ප්‍රමෝ",
    "ප්‍රොමෝ",
    "දැනට ඇති promotions",
    "නව promotions",
    "මිල අඩු",
    "අඩු කරලා",
    "price reduced",
    "price cut",
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
]


def has_user_profile_signal(text: str) -> bool:
    lowered = (text or "").lower()
    return any(signal in lowered for signal in _USER_PROFILE_STRONG_SIGNALS)


def has_promotions_signal(text: str) -> bool:
    lowered = (text or "").lower()
    return any(signal in lowered for signal in _PROMOTIONS_STRONG_SIGNALS)


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
            best_intent = (
                "general"
                if "general" in scores
                else (intents[0] if intents else "general")
            )
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
        clarification = (
            "ඔබට අවශ්‍ය භාණ්ඩයේ නම කියන්න. එතකොට මට නිවැරදිව උත්තර දෙන්න පුළුවන්."
        )

    return best_intent, confidence, entities, clarification


_LAST_ORDER_SIGNALS = [
    "last order",
    "latest order",
    "most recent order",
    "අන්තිමට ගත්",
    "ගත්තේ",
    "අලුත්ම ඇණවුම",
    "අවසාන ඇණවුම",
    "අන්තිම ඇණවුම",
    "latest purchase",
    "last purchase",
    "අලුත්ම order",
    "latest order",
]


def has_order_history_signal(text: str) -> bool:
    lowered = (text or "").lower()
    return any(signal in lowered for signal in _ORDER_HISTORY_STRONG_SIGNALS)


def is_last_order_query(text: str) -> bool:
    lowered = (text or "").lower()
    return any(signal in lowered for signal in _LAST_ORDER_SIGNALS)


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

    # Drop demonstratives (this/that/මේකවල) — they refer to context, not a product name
    tokens = [t for t in tokens if t.lower() not in _DEMONSTRATIVES]

    if not tokens:
        return None

    cleaned = " ".join(tokens).strip()
    if not cleaned or cleaned.lower() in _NOISE_WORDS or cleaned.lower() in _TRIM_WORDS:
        return None
    return cleaned


# Maps every recognisable BOGO/multi-buy signal to a canonical offer_type label.
# Longer / more specific phrases must come first so they match before substrings.
_BOGO_SIGNAL_MAP: list[tuple[str, str]] = [
    ("buy 1 get 1", "buy_one_get_one"),
    ("buy one get one", "buy_one_get_one"),
    ("buy 2 get 1", "buy_two_get_one"),
    ("3 for 2", "three_for_two"),
    ("bogo", "buy_one_get_one"),
    ("get one free", "buy_one_get_one"),
    # Sinhala STT phonetic variants — order matters (longer first)
    ("බයිවන් ගෙට්ටුවන්", "buy_one_get_one"),
    ("බයිවන් ගෙට්වන්", "buy_one_get_one"),
    ("බායිවන් ගෙට්වන්", "buy_one_get_one"),
    ("බයිබන් ගෙට්", "buy_one_get_one"),
    ("ගෙට්ටුවන් ඔෆර්", "buy_one_get_one"),
    ("ගෙට්වන් ඔෆර්", "buy_one_get_one"),
    ("ගෙට් 1", "buy_one_get_one"),
]

# Flat set for fast membership test (used in product-hint guard and keyword lists)
_OFFER_TYPE_SIGNALS: set[str] = {phrase for phrase, _ in _BOGO_SIGNAL_MAP}


def detect_offer_type(text: str) -> str | None:
    """Return a canonical offer-type label if the text describes a multi-buy deal."""
    lowered = (text or "").lower()
    for phrase, label in _BOGO_SIGNAL_MAP:
        if phrase in lowered:
            return label
    return None


def _extract_product_hint(text: str) -> str | None:
    normalized = text.strip()
    lowered = normalized.lower()

    # Don't extract a product name when the query describes an offer type
    if any(sig in lowered for sig in _OFFER_TYPE_SIGNALS):
        return None

    for pair in re.findall(r'"([^"]+)"|\'([^\']+)\'', normalized):
        value = _sanitize_entity_candidate(pair[0] or pair[1])
        if value:
            return value

    patterns = [
        r"([A-Za-z0-9඀-෿\s\-]{2,40})\s+(?:කිලෝ|kg|කිලෝව|gram|g)\s+(?:එකේ|එකට|1|එකක)?\s*(?:මිල|price|ගණන)",
        r"(?:price|cost|මිල|මිලක්|ගණන)\s+(?:of\s+)?(?!අඩු|reduced|cut)([A-Za-z0-9඀-෿\s\-]{2,40})",
        r"(?:search|find|show|find me|product|භාණ්ඩ|නිෂ්පාදන|හොයන්න)\s+([A-Za-z0-9඀-෿\s\-]{2,60})",
        r"([A-Za-z0-9඀-෿\s\-]{2,60})\s+(?:price|cost|available|availability|stock)",
        r"([A-Za-z0-9඀-෿\s\-]{2,60})\s+(?:තියෙනවද|තියෙනවාද|තියෙනවා|තියනවද)",
        r"([A-Za-z0-9඀-෿\s\-]{2,40})\s+වල\s+මිල",
        r"([A-Za-z0-9඀-෿\s\-]{2,40})\s+මිල\s+(?:කීයද|මොකක්ද|මොකද)",
        r"(?:මිලදී\s+ගත\s+හැකි\s+)?([A-Za-z0-9඀-෿\s\-]{2,40})\s+නිෂ්පාදන",
        r"(?:මට|මමට)?\s*([A-Za-z0-9඀-෿\s\-]{2,60})\s+හොයන්න",
        r"(?:මට|මමට)\s+([A-Za-z0-9඀-෿\s\-]{2,40})\s+(?:මිල|price|ගණන)",
    ]
    for pattern in patterns:
        match = re.search(pattern, normalized, re.IGNORECASE)
        if match:
            value = _sanitize_entity_candidate(match.group(1) or "")
            if value:
                return value

    return None
