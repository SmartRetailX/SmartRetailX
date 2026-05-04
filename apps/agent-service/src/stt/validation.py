import re
import unicodedata
from typing import Any

# Sinhala Unicode block: U+0D80–U+0DFF
_SINHALA_RE = re.compile(r"[඀-෿]")
# Looks like a short all-Latin utterance (1–5 words, no Sinhala)
_SHORT_LATIN_RE = re.compile(r"^[A-Za-z0-9\s\-&./,''\"()]{1,80}$")

# Maximum characters we'll stuff into the Whisper prompt
_VOCAB_PROMPT_MAX_CHARS = 224


def normalize_transcript(text: str) -> str:
    return re.sub(r"\s+", " ", unicodedata.normalize("NFC", text or "")).strip()


def build_vocab_prompt(base_prompt: str, vocabulary: list[str]) -> str:
    """
    Append product/brand/category terms to the Whisper prompt so the model
    biases toward correct spellings.

    Whisper uses the prompt as a style/vocabulary hint; keeping it under
    ~224 chars is recommended to avoid the model echoing it back.
    Terms are space-separated, highest-value (shorter, common) terms first.
    """
    if not vocabulary:
        return base_prompt

    # Sort: shorter terms first (vegetables like "Onion" beat long SKU names)
    sorted_terms = sorted(set(vocabulary), key=len)

    # Pack as many as fit within the budget
    suffix_parts: list[str] = []
    budget = _VOCAB_PROMPT_MAX_CHARS - len(base_prompt) - 2  # 2 = ". "
    for term in sorted_terms:
        if len(term) + 2 > budget:
            break
        suffix_parts.append(term)
        budget -= len(term) + 2  # ", "

    if not suffix_parts:
        return base_prompt

    return f"{base_prompt}. {', '.join(suffix_parts)}."


def transcript_is_sinhala_only(text: str) -> bool:
    """True when every non-space character is Sinhala script."""
    stripped = text.replace(" ", "")
    return bool(stripped) and all(
        0x0D80 <= ord(ch) <= 0x0DFF for ch in stripped
    )


def transcript_has_sinhala(text: str) -> bool:
    return bool(_SINHALA_RE.search(text))


def transcript_looks_english_query(text: str) -> bool:
    """Heuristic: short utterance with only Latin chars → likely a product name query."""
    return bool(_SHORT_LATIN_RE.match(text.strip()))


def is_prompt_echo(transcript: str, prompt: str | None) -> bool:
    if not transcript:
        return False

    normalized = " ".join(transcript.lower().split())
    if "the speech may contain sinhala and english mixed together" in normalized:
        return True

    if not prompt:
        return False

    normalized_prompt = " ".join(prompt.lower().split())
    if normalized == normalized_prompt:
        return True

    return normalized_prompt in normalized and len(normalized) <= len(normalized_prompt) + 20


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
            if len(chunks) >= 3 and all(chunk == phrase for chunk in chunks[: min(len(chunks), 5)]):
                return True

    return False


def has_disallowed_script_chars(text: str) -> bool:
    for ch in text:
        code = ord(ch)
        if ch.isspace() or ch.isdigit():
            continue
        if 0x0D80 <= code <= 0x0DFF:   # Sinhala
            continue
        if 0x0020 <= code <= 0x024F:   # Latin
            continue
        if 0x2000 <= code <= 0x206F or 0x20A0 <= code <= 0x20CF:  # punctuation/currency
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

    for seg in segments:
        if not isinstance(seg, dict):
            continue
        max_no_speech_prob = max(max_no_speech_prob, float(seg.get("no_speech_prob", 0.0) or 0.0))
        min_avg_logprob = min(min_avg_logprob, float(seg.get("avg_logprob", 0.0) or 0.0))
        max_compression_ratio = max(max_compression_ratio, float(seg.get("compression_ratio", 0.0) or 0.0))

    return (
        max_no_speech_prob >= 0.60
        or min_avg_logprob <= -1.2
        or max_compression_ratio >= 2.8
    )
