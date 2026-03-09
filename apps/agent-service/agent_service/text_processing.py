import re
import unicodedata
from typing import Any

from .config import DEFAULT_INTENTS

_ENTITY_NOISE_WORDS = {
    "කීය",
    "කීයද",
    "මොන",
    "මොනවා",
    "මොනවාද",
    "මොනවද",
    "what",
    "which",
    "how",
    "much",
    "ද",
}

_ENTITY_TRIM_WORDS = {
    "වල",
    "වර්ග",
    "වර්ගයේ",
    "මිල",
    "නිෂ්පාදන",
    "භාණ්ඩ",
    "product",
    "products",
    "of",
}

_ENTITY_LEADING_FILLERS = {
    "මට",
    "මිලදී",
    "ගත",
    "හැකි",
    "ඔබට",
    "අවශ්‍ය",
    "please",
    "show",
    "find",
    "search",
}


def is_prompt_echo(transcript: str, prompt: str | None) -> bool:
    if not transcript:
        return False

    normalized_transcript = " ".join(transcript.lower().split())
    known_bad = "the speech may contain sinhala and english mixed together"
    if known_bad in normalized_transcript:
        return True

    if not prompt:
        return False

    normalized_prompt = " ".join(prompt.lower().split())
    if normalized_transcript == normalized_prompt:
        return True

    return (
        normalized_prompt in normalized_transcript
        and len(normalized_transcript) <= len(normalized_prompt) + 20
    )


def looks_hallucinated_transcript(transcript: str, audio_size: int) -> bool:
    normalized = " ".join(transcript.lower().split())
    if not normalized:
        return True

    sentences = [
        s.strip()
        for s in normalized.replace("!", ".").replace("?", ".").split(".")
        if s.strip()
    ]
    if len(sentences) >= 2 and len(set(sentences)) == 1:
        return True

    if audio_size < 20_000 and len(normalized.split()) >= 10:
        return True

    tokens = normalized.replace(".", " ").replace(",", " ").split()
    if len(tokens) >= 6:
        for n in (1, 2, 3):
            if len(tokens) < n * 3:
                continue
            phrase = tokens[:n]
            chunks = [tokens[i : i + n] for i in range(0, len(tokens) - n + 1, n)]
            if len(chunks) >= 3 and all(
                chunk == phrase for chunk in chunks[: min(len(chunks), 5)]
            ):
                return True

    return False


def has_disallowed_script_chars(text: str) -> bool:
    for ch in text:
        code = ord(ch)
        if ch.isspace() or ch.isdigit():
            continue
        if 0x0D80 <= code <= 0x0DFF:  # Sinhala
            continue
        if 0x0020 <= code <= 0x024F:  # Latin blocks
            continue
        if 0x2000 <= code <= 0x206F or 0x20A0 <= code <= 0x20CF:  # punctuation/symbols
            continue
        return True
    return False


def is_low_confidence_whisper(data: dict[str, Any]) -> bool:
    segments = data.get("segments") if isinstance(data, dict) else None
    if not isinstance(segments, list) or not segments:
        return False

    max_no_speech_prob = 0.0
    min_avg_logprob = 0.0
    max_compression_ratio = 0.0

    for segment in segments:
        if not isinstance(segment, dict):
            continue
        max_no_speech_prob = max(
            max_no_speech_prob, float(segment.get("no_speech_prob", 0.0) or 0.0)
        )
        min_avg_logprob = min(
            min_avg_logprob, float(segment.get("avg_logprob", 0.0) or 0.0)
        )
        max_compression_ratio = max(
            max_compression_ratio, float(segment.get("compression_ratio", 0.0) or 0.0)
        )

    return (
        max_no_speech_prob >= 0.60
        or min_avg_logprob <= -1.2
        or max_compression_ratio >= 2.8
    )


def normalize_transcript(text: str) -> str:
    return re.sub(r"\s+", " ", unicodedata.normalize("NFC", text or "")).strip()


def _sanitize_entity_candidate(candidate: str) -> str | None:
    value = re.sub(r"\s+", " ", (candidate or "").strip(" .,!?:;\"'")).strip()
    if not value:
        return None

    tokens = [tok for tok in value.split(" ") if tok]
    if not tokens:
        return None

    while tokens and tokens[0].lower() in _ENTITY_LEADING_FILLERS:
        tokens.pop(0)
    while tokens and tokens[-1].lower() in _ENTITY_TRIM_WORDS:
        tokens.pop()
    while tokens and tokens[-1].lower() in _ENTITY_NOISE_WORDS:
        tokens.pop()

    if not tokens:
        return None

    cleaned = " ".join(tokens).strip()
    if not cleaned:
        return None

    cleaned_lower = cleaned.lower()
    if cleaned_lower in _ENTITY_NOISE_WORDS or cleaned_lower in _ENTITY_TRIM_WORDS:
        return None

    return cleaned


def _extract_product_hint(text: str) -> str | None:
    normalized = text.strip()
    quoted = re.findall(r'"([^"]+)"|\'([^\']+)\'', normalized)
    for pair in quoted:
        value = _sanitize_entity_candidate(pair[0] or pair[1])
        if value:
            return value

    patterns = [
        r"(?:price|cost|මිල|මිලක්|ගණන)\s+(?:of\s+)?([A-Za-z0-9\u0D80-\u0DFF\s\-]{2,40})",
        r"(?:search|find|show|find me|product|භාණ්ඩ|නිෂ්පාදන)\s+([A-Za-z0-9\u0D80-\u0DFF\s\-]{2,40})",
        r"([A-Za-z0-9\u0D80-\u0DFF\s\-]{2,40})\s+වල\s+මිල",
        r"([A-Za-z0-9\u0D80-\u0DFF\s\-]{2,40})\s+මිල\s+කීයද",
        r"(?:මිලදී\s+ගත\s+හැකි\s+)?([A-Za-z0-9\u0D80-\u0DFF\s\-]{2,40})\s+නිෂ්පාදන",
    ]
    for pattern in patterns:
        match = re.search(pattern, normalized, re.IGNORECASE)
        if match:
            value = _sanitize_entity_candidate(match.group(1) or "")
            if value:
                return value
    return None


def detect_intent_and_entities(
    text: str, allowed_intents: list[str] | None
) -> tuple[str, float, dict[str, Any], str | None]:
    lowered = text.lower()
    # Preserve configured intent order for deterministic tie-breaking.
    intents = list(dict.fromkeys(allowed_intents or DEFAULT_INTENTS))
    scores: dict[str, int] = {intent: 0 for intent in intents}

    keywords: dict[str, list[str]] = {
        "offers": [
            "offer",
            "promotion",
            "discount",
            "deal",
            "special",
            "වට්ටම්",
            "offer එක",
            "promotions",
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
        "prices": ["price", "cost", "how much", "මිල", "ගණන", "කීයද"],
        "product_search": [
            "search",
            "find",
            "show product",
            "product",
            "භාණ්ඩ",
            "නිෂ්පාදන",
            "හොයන්න",
        ],
        "general": ["help", "assist", "question", "ප්‍රශ්න", "උදව්"],
    }

    for intent, words in keywords.items():
        if intent not in scores:
            continue
        for word in words:
            if word in lowered:
                scores[intent] += 1

    if scores:
        best_score = max(scores.values())
        if best_score <= 0:
            if "general" in scores:
                best_intent = "general"
            else:
                best_intent = intents[0] if intents else "general"
        else:
            best_candidates = [
                intent for intent in intents if scores[intent] == best_score
            ]
            best_intent = best_candidates[0]
    else:
        best_intent = "general"
    best_score = scores.get(best_intent, 0)
    confidence = min(0.95, 0.4 + (best_score * 0.18)) if best_score > 0 else 0.35

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
