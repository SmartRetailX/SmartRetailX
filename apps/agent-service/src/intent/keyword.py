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
    "දෙන්න",
    "ගන්න",
    "තියෙනවද",
    "තියෙනවාද",
    "තියෙනවා",
    "තියනවද",
    "තියෙන",
    "තිබෙන",
    "තිබෙනවද",
    "නැද්ද",
    "නැද්ද?",
    "නෑද",
    "නේද",
    "nadda",
    "nada",
    "any",
}
_TRIM_WORDS = {
    "වල",
    "වර්ග",
    "වර්ගයේ",
    "මිල",
    "මිලක්",
    "price",
    "cost",
    "ගණන",
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
    "වලට",
    "සඳහා",
    "offer",
    "offers",
    "promotion",
    "promotions",
    "discount",
    "deal",
    "special",
    "වට්ටම්",
    "ඔෆර්",
    "ඔෆර්ස්",
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
    "අද",
    "දැනට",
    "දැන්",
    "මේ",
    "තියෙන",
    "තිබෙන",
    "today",
    "current",
    "now",
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

_YES_NO_QUERY_WORDS = {
    "ද",
    "ද?",
    "තියෙනවද",
    "තියෙනවාද",
    "තියෙනවා",
    "තියනවද",
    "තිබෙනවද",
    "නැද්ද",
    "නෑද",
    "නේද",
    "nadda",
    "nada",
    "any",
    "available",
}

_OFFER_ENTITY_KEYWORDS = {
    "offer",
    "offers",
    "promotion",
    "promotions",
    "discount",
    "discounts",
    "deal",
    "deals",
    "special",
    "වට්ටම්",
    "ඔෆර්",
    "ඔෆර්ස්",
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
        "ofr",
        "ఆఫర్",
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
        "voucher",
        "bank card offer",
        "loyalty offer",
        "member offer",
        "weekend offer",
        "combo deal",
        "flash deal",
        "multi-buy",
        "bulk deal",
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
        "cancelled order",
        "delivered order",
        "pending order",
        "refund",
        "histroy",
        "histree",
        "ඇණවුම",
        "ඇණවුම්",
        "ඇනවුම",
        "ඇනවුම්",
        "පෙර ඇණවුම්",
        "අවසාන ඇණවුම",
        "අලුත්ම ඇණවුම",
        "අන්තිම ඇණවුම",
        "ඇණවුම් ඉතිහාස",
        "ඇනවුම් ඉතිහාස",
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
        "ඕඩර් හිස්තරික",
        "ඕඩර් ඉතිහාස",
        "හිස්ටරි",
        "ඉතිහාස",
    ],
    "buying_suggestions": [
        "suggest",
        "recommend",
        "suggestion",
        "suggestions",
        "recommended",
        "ideas",
        "idea",
        "options",
        "best for",
        "good for",
        "shopping list",
        "list දෙන්න",
        "items list",
        "top 5",
        "budget",
        "cheap",
        "affordable",
        "breakfast",
        "snack",
        "snacks",
        "tea time",
        "party",
        "healthy",
        "vegan",
        "high protein",
        "sugar free",
        "weight loss",
        "diet",
        "diabetic",
        "kids",
        "lunch box",
        "easy cook",
        "elderly",
        "next purchase",
        "buy",
        "what should i buy",
        "නිර්දේශ",
        "යෝජනා",
        "හොඳ items",
        "items කියන්න",
        "අයිටම්ස්",
        "කුඩා budget",
        "දරුවන්ට",
        "උදේ කෑම",
        "ලංච් බොක්ස්",
        "සෞඛ්‍ය සම්පන්න",
        "දියවැඩියා",
        "වැඩි ප්‍රෝටීන්",
        "සැජෙස්ට්",
        "අදහස",
    ],
    "prices": [
        "price",
        "cost",
        "how much",
        "rate",
        "ගාන",
        "ගාණ",
        "ගාණ කීය",
        "ගාණ කීයද",
        "prce",
        "prise",
        "cheapest",
        "most expensive",
        "price range",
        "unit price",
        "pack price",
        "budget",
        "රු",
        "lkr",
        "rs",
        "රුපියල්",
        "මිල",
        "ගණන",
        "කීයද",
        "කීය",
        "මොකක්ද",
        "මොකද",
        "1000 කට",
        "500 කට",
    ],
    "product_search": [
        "search",
        "find",
        "show product",
        "product",
        "available",
        "availability",
        "stock",
        "in stock",
        "out of stock",
        "stock quantity",
        "stock level",
        "tiyenavada",
        "hoyanna",
        "pennanna",
        "prodcut",
        "serch",
        "shampoo",
        "shampu",
        "භාණ්ඩ",
        "නිෂ්පාදන",
        "හොයන්න",
        "හොයලා",
        "පෙන්නන්න",
        "ඇතිද",
        "ඇතිද?",
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
        "total spend",
        "total spent",
        "loyalty status",
        "loyalty tier",
        "මගේ profile",
        "profile බලන්න",
        "මගේ ගිණුම",
        "ගිණුම් විස්තර",
        "මගේ තොරතුරු",
        "ගනුදෙනු කාණ්ඩය",
        "segment",
        "profile විස්තර",
        "ගිණුම",
        "ගිනුම",
        "මා ගැන",
        "කොතරම් වියදම්",
        "වියදම් කළා",
    ],
    "promotions": [
        "promotion",
        "promotions",
        "promo",
        "prmo",
        "flash sale",
        "sale",
        "seasonal offer",
        "bundle",
        "clearance",
        "active promotion",
        "current promotion",
        "today offer",
        "today deals",
        "promo teka",
        "promo eka",
        "ප්‍රමෝෂන්",
        "ප්‍රමෝ",
        "ප්‍රොමෝෂන්",
        "ප්‍රොමෝ",
        "flash sale",
        "seasonal",
        "දැනට ඇති promotions",
        "දැනට promotions",
        "promotions මොනවාද",
        "දැනට ඇති offers",
        "නව promotions",
        "sale ඇතිද",
        "සේල්",
    ],
    "general": ["help", "assist", "question", "ප්‍රශ්න", "උදව්", "hello", "hi", "හලෝ", "ආයුබෝවන්"],
}

_OFFERS_STRONG_SIGNALS = [
    "offer",
    "offers",
    "voucher",
    "bank card offer",
    "loyalty offer",
    "loyalty members",
    "member offer",
    "weekend offer",
    "combo deal",
    "flash deal",
    "multi-buy",
    "buy 1 get 1",
    "buy one get one",
    "bogo",
    "buy 2 get 1",
    "3 for 2",
    "get one free",
    "ofr",
    "ඔෆර්",
    "ඔෆර්ස්",
    "ඔපර්",
    "මිල අඩු",
    "වට්ටම්",
]

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
    "cancelled order",
    "delivered order",
    "pending order",
    "refund",
    "histroy",
    "histree",
    "ඇණවුම් ඉතිහාස",
    "ඇනවුම් ඉතිහාස",
    "පෙර ඇණවුම්",
    "මගේ ඇණවුම්",
    "ඇණවුම",
    "ඇණවුම්",
    "ඇනවුම",
    "ඇනවුම්",
    "අන්තිමට ගත්",
    "ගත්තේ",
    "ඕඩර් හිස්තරික",
    "හිස්ටරි",
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
    "prmo",
    "flash sale",
    "clearance",
    "seasonal offer",
    "bundle deal",
    "active promotion",
    "current promotion",
    "promo teka",
    "promo eka",
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

_BUYING_SUGGESTION_STRONG_SIGNALS = [
    "suggest",
    "suggestion",
    "suggestions",
    "recommend",
    "recommended",
    "ideas",
    "options",
    "what should i buy",
    "shopping list",
    "buying list",
    "items list",
    "top 5",
    "breakfast",
    "snack",
    "snacks",
    "tea time",
    "party",
    "healthy",
    "vegan",
    "high protein",
    "sugar free",
    "weight loss",
    "diet",
    "kids",
    "lunch box",
    "easy cook",
    "elderly",
    "next purchase",
    "budget",
    "affordable",
    "නිර්දේශ",
    "යෝජනා",
    "සැජෙස්ට්",
    "කුඩා budget",
    "දරුවන්ට",
    "ලංච් බොක්ස්",
    "දියවැඩියා",
]

_BUYING_CONTEXT_ENTITY_MAP: list[tuple[str, str, str]] = [
    ("breakfast", "occasion", "breakfast"),
    ("උදේ කෑම", "occasion", "breakfast"),
    ("tea time", "occasion", "tea_time"),
    ("party", "occasion", "party"),
    ("lunch box", "occasion", "lunch_box"),
    ("lunchbox", "occasion", "lunch_box"),
    ("ලංච් බොක්ස්", "occasion", "lunch_box"),
    ("kids lunch", "occasion", "lunch_box"),
    ("weight loss", "diet_goal", "weight_loss"),
    ("diet", "diet_goal", "diet"),
    ("healthy", "diet_goal", "healthy"),
    ("vegan", "dietary", "vegan"),
    ("high protein", "dietary", "high_protein"),
    ("protein", "dietary", "high_protein"),
    ("sugar free", "dietary", "sugar_free"),
    ("sugar-free", "dietary", "sugar_free"),
    ("diabetic", "dietary", "diabetic_friendly"),
    ("දියවැඩියා", "dietary", "diabetic_friendly"),
    ("kids", "audience", "kids"),
    ("children", "audience", "kids"),
    ("දරුවන්", "audience", "kids"),
    ("ළමයි", "audience", "kids"),
    ("elderly", "audience", "elderly"),
    ("senior", "audience", "elderly"),
    ("වයස්ගත", "audience", "elderly"),
    ("easy cook", "preparation", "easy_cook"),
    ("easy-to-cook", "preparation", "easy_cook"),
]

_BUYING_TOPIC_KEYWORDS: list[tuple[str, str]] = [
    ("snacks", "snack"),
    ("snack", "snack"),
    ("snaks", "snack"),
    ("drinks", "drinks"),
    ("drink", "drinks"),
    ("beverage", "drinks"),
    ("tea", "tea"),
    ("groceries", "grocery"),
    ("grocery", "grocery"),
    ("products", "products"),
    ("items", "items"),
]

_PROMO_REQUEST_KEYWORDS = [
    "promo",
    "promotion",
    "promotions",
    "offer",
    "offers",
    "discount",
    "deals",
    "වට්ටම්",
    "ඔෆර්",
]

_NEXT_PURCHASE_KEYWORDS = [
    "next purchase",
    "recommend next",
    "order history බලලා",
    "history බලලා",
]

_PRICE_MODIFIER_KEYWORDS: list[tuple[str, str]] = [
    ("cheapest", "cheapest"),
    ("most expensive", "most_expensive"),
    ("price range", "range"),
    ("range", "range"),
    ("budget", "budget"),
    ("lowest price", "cheapest"),
    ("highest price", "most_expensive"),
    ("unit price", "unit"),
    ("pack price", "pack"),
    ("1000 කට", "budget_1000"),
    ("500 කට", "budget_500"),
    ("රු. 1000", "budget_1000"),
    ("රු. 500", "budget_500"),
    ("under 1000", "budget_1000"),
    ("under 500", "budget_500"),
    ("1000 ට", "budget_1000"),
]

_STOCK_SIGNAL_KEYWORDS = [
    "stock",
    "in stock",
    "out of stock",
    "stock quantity",
    "stock level",
    "available stock",
    "stock ඇතිද",
    "ගබඩා",
    "ගබඩාවේ",
]

_ORDER_FILTER_KEYWORDS: list[tuple[str, str]] = [
    ("cancel", "cancelled"),
    ("cancelled", "cancelled"),
    ("delivered", "delivered"),
    ("pending", "pending"),
    ("refund", "refunded"),
    ("refunded", "refunded"),
    ("shipped", "shipped"),
    ("processing", "processing"),
    ("අවලංගු", "cancelled"),
    ("ලැබී", "delivered"),
    ("රිෆන්ඩ්", "refunded"),
    ("රිෆන්", "refunded"),
    ("අපේක්ෂිත", "pending"),
]

_LAST_N_ORDER_PATTERN = re.compile(
    r"(?:last|latest|recent|orders?|අන්තිම|ඇනවුම්?)\s+(\d+)"
    r"|(\d+)\s+(?:orders?|ඇනවුම්?)",
    re.IGNORECASE,
)


_BUDGET_AMOUNT_PATTERN = re.compile(
    r"(?:රු\.?\s*|rs\.?\s*|lkr\.?\s*)([0-9][0-9,]*)"
    r"|([0-9][0-9,]*)\s*(?:කට|ට|ට\s+ගන්|ට\s+ඇතුළත|under|below|within)"
    r"|(?:budget|under|below|within)\s+(?:රු\.?\s*|rs\.?\s*|lkr\.?\s*)?([0-9][0-9,]*)",
    re.IGNORECASE,
)

# Common retail category keywords mapped to canonical category names
_CATEGORY_KEYWORDS: list[tuple[str, str]] = [
    ("dairy", "dairy"),
    ("milk", "dairy"),
    ("cheese", "dairy"),
    ("beverage", "beverages"),
    ("beverages", "beverages"),
    ("drink", "beverages"),
    ("drinks", "beverages"),
    ("juice", "beverages"),
    ("snack", "snacks"),
    ("snacks", "snacks"),
    ("biscuit", "snacks"),
    ("chocolate", "confectionery"),
    ("candy", "confectionery"),
    ("confectionery", "confectionery"),
    ("rice", "staples"),
    ("flour", "staples"),
    ("cereal", "breakfast"),
    ("breakfast", "breakfast"),
    ("personal care", "personal care"),
    ("shampoo", "personal care"),
    ("shampu", "personal care"),
    ("soap", "personal care"),
    ("cleaning", "household"),
    ("household", "household"),
    ("detergent", "household"),
    ("frozen", "frozen"),
    ("bread", "bakery"),
    ("bakery", "bakery"),
    ("fruit", "fresh produce"),
    ("vegetable", "fresh produce"),
    ("meat", "meat"),
    ("fish", "seafood"),
    ("seafood", "seafood"),
    ("organic", "organic"),
    ("baby", "baby"),
    ("infant", "baby"),
    ("pet", "pet food"),
    ("condiment", "condiments"),
    ("sauce", "condiments"),
    ("spice", "spices"),
    ("oil", "oils"),
    ("cooking oil", "oils"),
    ("health", "health"),
    ("vitamin", "health"),
    ("supplement", "health"),
]


def _extract_budget_amount(text: str) -> float | None:
    """Extract a numeric budget/price amount from the query text."""
    m = _BUDGET_AMOUNT_PATTERN.search(text or "")
    if not m:
        return None
    raw = m.group(1) or m.group(2) or m.group(3)
    if not raw:
        return None
    try:
        return float(raw.replace(",", ""))
    except ValueError:
        return None


def _extract_category_hint(text: str) -> str | None:
    """Return a canonical category name if the query mentions a product category."""
    lowered = (text or "").lower()
    for token, canonical in _CATEGORY_KEYWORDS:
        if token in lowered:
            return canonical
    return None


def _extract_price_modifier(text: str) -> str | None:
    lowered = (text or "").lower()
    for token, modifier in _PRICE_MODIFIER_KEYWORDS:
        if token in lowered:
            return modifier
    return None


def _extract_order_filter(text: str) -> str | None:
    lowered = (text or "").lower()
    for token, filter_val in _ORDER_FILTER_KEYWORDS:
        if token in lowered:
            return filter_val
    return None


def _extract_last_n_orders(text: str) -> int | None:
    m = _LAST_N_ORDER_PATTERN.search(text or "")
    if m:
        try:
            raw = m.group(1) or m.group(2)
            n = int(raw)
            return n if 1 <= n <= 50 else None
        except (ValueError, TypeError):
            return None
    return None


def has_stock_query_signal(text: str) -> bool:
    lowered = (text or "").lower()
    return any(signal in lowered for signal in _STOCK_SIGNAL_KEYWORDS)


def has_offers_signal(text: str) -> bool:
    lowered = (text or "").lower()
    return any(signal in lowered for signal in _OFFERS_STRONG_SIGNALS)


def has_user_profile_signal(text: str) -> bool:
    lowered = (text or "").lower()
    return any(signal in lowered for signal in _USER_PROFILE_STRONG_SIGNALS)


def has_promotions_signal(text: str) -> bool:
    lowered = (text or "").lower()
    return any(signal in lowered for signal in _PROMOTIONS_STRONG_SIGNALS)


def has_buying_suggestions_signal(text: str) -> bool:
    lowered = (text or "").lower()
    return any(signal in lowered for signal in _BUYING_SUGGESTION_STRONG_SIGNALS)


def _extract_buying_suggestion_entities(text: str) -> dict[str, Any]:
    lowered = (text or "").lower()
    entities: dict[str, Any] = {}

    for token, key, value in _BUYING_CONTEXT_ENTITY_MAP:
        if token in lowered and key not in entities:
            entities[key] = value

    for token, topic in _BUYING_TOPIC_KEYWORDS:
        if token in lowered:
            entities["topic"] = topic
            if "category" not in entities and topic not in {"items", "products"}:
                entities["category"] = topic
            break

    if any(token in lowered for token in _PROMO_REQUEST_KEYWORDS):
        entities["requires_promo"] = True

    if any(token in lowered for token in _NEXT_PURCHASE_KEYWORDS):
        entities["use_order_history"] = True

    if any(token in lowered for token in {"budget", "affordable", "cheap", "කුඩා budget"}):
        entities["budget"] = "low"

    if "category" not in entities and "breakfast" in lowered:
        entities["category"] = "breakfast"

    return entities


def detect_intent_and_entities(
    text: str,
    allowed_intents: list[str] | None,
) -> tuple[str, float, dict[str, Any], str | None]:
    lowered = text.lower()
    intents = list(dict.fromkeys(allowed_intents or settings.default_intents))
    scores: dict[str, float] = {intent: 0.0 for intent in intents}

    for intent, words in _KEYWORDS.items():
        if intent not in scores:
            continue
        for word in words:
            if word in lowered:
                scores[intent] += 1.0

    buying_signal = has_buying_suggestions_signal(text)
    promo_signal = has_promotions_signal(text)
    order_signal = has_order_history_signal(text)
    offers_signal = has_offers_signal(text)

    # Strong offers signal: boost offers, suppress competing product_search
    if "offers" in scores and offers_signal and not buying_signal:
        scores["offers"] += 2.5
        if "product_search" in scores:
            scores["product_search"] = max(0.0, scores["product_search"] - 1.0)

    # Strong order history filter signals (cancel/refund/pending/delivered + orders)
    order_filter = _extract_order_filter(text)
    if "order_history" in scores and order_filter and order_signal:
        scores["order_history"] += 3.0
        if "product_search" in scores:
            scores["product_search"] = max(0.0, scores["product_search"] - 1.5)

    # Budget-price detection: any numeric budget/price threshold → prices intent
    budget_amount = _extract_budget_amount(text)
    budget_price_match = budget_amount is not None or re.search(
        r"cheapest|ලාභම|most\s+expensive|price\s+range", lowered
    )
    if "prices" in scores and budget_price_match:
        scores["prices"] += 3.0
        if "buying_suggestions" in scores:
            scores["buying_suggestions"] = max(0.0, scores["buying_suggestions"] - 2.0)

    # Promotions: clearance/flash sale should win even over product_search
    if "promotions" in scores and has_promotions_signal(text):
        scores["promotions"] += 2.0
        if "product_search" in scores:
            scores["product_search"] = max(0.0, scores["product_search"] - 1.0)

    # Very short order query "order?"
    if "order_history" in scores and re.fullmatch(r"order\s*\??", lowered.strip()):
        scores["order_history"] += 3.0

    # Multi-intent: search + price → product_search wins (user is searching first, price is secondary)
    search_words = {"හොයලා", "හොයන්න", "search", "find", "show", "পেন্নান্ন", "pennanna"}
    price_words = {"price", "මිල", "ගණන", "කීයද", "cost", "rate", "ගාණ"}
    has_search = any(w in lowered for w in search_words)
    has_price = any(w in lowered for w in price_words)
    if "product_search" in scores and has_search and has_price:
        scores["product_search"] += 1.5
        if "prices" in scores:
            scores["prices"] = max(0.0, scores["prices"] - 1.0)

    # User profile: "loyalty tier" should not go to prices even if "කීයද" is present
    if "user_profile" in scores and has_user_profile_signal(text):
        scores["user_profile"] += 2.0
        # suppress prices if user-profile signal is strong
        if "prices" in scores:
            scores["prices"] = max(0.0, scores["prices"] - 1.5)

    if "buying_suggestions" in scores:
        if buying_signal:
            scores["buying_suggestions"] += 2.0

        buying_entities = _extract_buying_suggestion_entities(text)
        if buying_entities:
            scores["buying_suggestions"] += 0.9

        # "promo + recommend" and "history + next purchase suggest" should stay
        # in buying_suggestions, with those conditions carried as entities.
        if buying_signal and promo_signal:
            scores["buying_suggestions"] += 1.1
            for promo_intent in ("offers", "promotions"):
                if promo_intent in scores:
                    scores[promo_intent] = max(0.0, scores[promo_intent] - 0.35)
        if buying_signal and order_signal:
            scores["buying_suggestions"] += 1.3
            if "order_history" in scores:
                scores["order_history"] = max(0.0, scores["order_history"] - 0.2)

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

    best_score = scores.get(best_intent, 0.0)
    confidence = min(0.95, 0.4 + best_score * 0.12) if best_score > 0 else 0.35

    entities: dict[str, Any] = {}
    if best_intent == "buying_suggestions":
        entities.update(_extract_buying_suggestion_entities(text))

    product_hint = _extract_product_hint(text, best_intent)
    if product_hint and "product" not in entities:
        entities["product"] = product_hint

    # For suggestion queries, a product-like hint often behaves as a topic/category.
    if best_intent == "buying_suggestions" and "category" not in entities:
        candidate = str(entities.get("product") or "").strip().lower()
        if candidate in {"snack", "snacks", "snaks", "drink", "drinks", "grocery", "groceries", "breakfast"}:
            entities["category"] = "snack" if candidate in {"snack", "snacks", "snaks"} else candidate.rstrip("s")

    price_match = re.search(r"(රු\.?|lkr|rs\.?)\s*([0-9,]+)", lowered, re.IGNORECASE)
    if price_match:
        entities["price"] = price_match.group(2).replace(",", "")

    # Extract price modifier (cheapest, range, budget, etc.)
    if best_intent == "prices":
        modifier = _extract_price_modifier(text)
        if modifier:
            entities["price_modifier"] = modifier
        # Extract budget amount using the robust pattern
        extracted_budget = _extract_budget_amount(text)
        if extracted_budget is not None:
            entities["budget_amount"] = str(int(extracted_budget) if extracted_budget == int(extracted_budget) else extracted_budget)
        # Extract category hint for budget/cheapest queries
        category = _extract_category_hint(text)
        if category and "category" not in entities:
            entities["category"] = category

    # Also extract category for product_search and buying_suggestions
    if best_intent in ("product_search", "buying_suggestions") and "category" not in entities:
        category = _extract_category_hint(text)
        if category:
            entities["category"] = category

    # Extract order status filter and last-N request
    if best_intent == "order_history":
        order_filter = _extract_order_filter(text)
        if order_filter:
            entities["order_status_filter"] = order_filter
        last_n = _extract_last_n_orders(text)
        if last_n:
            entities["last_n_orders"] = last_n

    # Tag stock queries so resolver can include stock data
    if has_stock_query_signal(text) and best_intent in ("product_search", "prices"):
        entities["include_stock"] = True

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

    # Iterative cleanup: removing one suffix token can expose another removable suffix.
    changed = True
    while tokens and changed:
        changed = False
        while tokens and tokens[0].lower() in _LEADING_FILLERS:
            tokens.pop(0)
            changed = True
        while (
            tokens
            and (
                tokens[-1].lower() in _TRIM_WORDS
                or tokens[-1].lower() in _NOISE_WORDS
                or tokens[-1].lower() in _YES_NO_QUERY_WORDS
            )
        ):
            tokens.pop()
            changed = True

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


def _is_generic_offer_query(lowered_text: str) -> bool:
    tokens = re.findall(r"[A-Za-z0-9඀-෿]+", lowered_text or "")
    if not tokens:
        return False
    if not any(token in _OFFER_ENTITY_KEYWORDS for token in tokens):
        return False

    non_offer_tokens = [token for token in tokens if token not in _OFFER_ENTITY_KEYWORDS]
    if not non_offer_tokens:
        return True

    return all(
        token in _NOISE_WORDS
        or token in _TRIM_WORDS
        or token in _YES_NO_QUERY_WORDS
        or token in _LEADING_FILLERS
        for token in non_offer_tokens
    )


def _extract_product_hint(text: str, intent: str | None = None) -> str | None:
    normalized = text.strip()
    lowered = normalized.lower()
    intent_name = (intent or "").strip().lower()

    # Don't extract a product name when the query describes an offer type
    if any(sig in lowered for sig in _OFFER_TYPE_SIGNALS):
        return None

    if intent_name in {"offers", "promotions"} and _is_generic_offer_query(lowered):
        return None

    for pair in re.findall(r'"([^"]+)"|\'([^\']+)\'', normalized):
        value = _sanitize_entity_candidate(pair[0] or pair[1])
        if value:
            return value

    offer_patterns = [
        r"([A-Za-z0-9඀-෿\s\-]{2,60})\s+(?:වලට|වල|සඳහා)\s+(?:offer|offers|promotion|promotions|discount|deal|special|වට්ටම්|ඔෆර්|ඔෆර්ස්)",
        r"(?:offer|offers|promotion|promotions|discount|deal|special|වට්ටම්|ඔෆර්|ඔෆර්ස්)\s+(?:on|for|about)?\s*([A-Za-z0-9඀-෿\s\-]{2,60})",
        r"([A-Za-z0-9඀-෿\s\-]{2,60})\s+(?:offer|offers|promotion|promotions|discount|deal|special|වට්ටම්|ඔෆර්|ඔෆර්ස්)\b",
        r"(?:offers?|promotions?|discounts?|deals?)\s+(?:තියෙන|තිබෙන)\s*([A-Za-z0-9඀-෿\s\-]{2,60})",
    ]
    general_patterns = [
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
    patterns = (
        offer_patterns
        if intent_name in {"offers", "promotions"}
        else (offer_patterns + general_patterns)
    )
    for pattern in patterns:
        match = re.search(pattern, normalized, re.IGNORECASE)
        if match:
            value = _sanitize_entity_candidate(match.group(1) or "")
            if value:
                return value

    return None
