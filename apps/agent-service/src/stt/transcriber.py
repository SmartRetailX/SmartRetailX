from __future__ import annotations

import asyncio
import time
from typing import Any

import httpx

from ..config import settings
from ..db.queries import get_stt_vocabulary
from ..log import logger
from .audio import normalize_audio_to_wav, resolve_audio_upload_metadata
from .validation import (
    build_vocab_prompt,
    has_disallowed_script_chars,
    is_low_confidence_whisper,
    is_prompt_echo,
    looks_hallucinated_transcript,
    transcript_has_sinhala,
    transcript_is_sinhala_only,
    transcript_looks_english_query,
)

# Audio shorter than this is treated as a very short product-name utterance
# and gets an aggressive English-first pass.
_SHORT_AUDIO_THRESHOLD = 80_000  # ~2.5 s at webm/opus bitrates


async def transcribe_audio(audio_bytes: bytes, language: str, mime_type: str | None = None) -> str:
    logger.info(
        "Transcribing audio: provider=%s size=%d language=%s",
        settings.stt_provider,
        len(audio_bytes),
        language,
    )

    requested_language = (language or "").lower()
    if not (
        requested_language.startswith("si")
        or requested_language.startswith("en")
        or requested_language in ("auto", "")
    ):
        raise ValueError("Unsupported language. Allowed values: auto, si-LK, en-US.")
    if len(audio_bytes) < 12_000:
        raise ValueError("Audio clip too short. Please speak for at least 2 seconds.")

    if settings.stt_provider in ("stt-agent", "hybrid"):
        try:
            text = await _transcribe_via_stt_agent(audio_bytes, language, mime_type)
            logger.info("STT agent transcription succeeded")
            return text
        except Exception as exc:
            if settings.stt_provider == "stt-agent":
                raise ValueError(f"stt-agent transcription failed: {exc}") from exc
            logger.warning("STT agent failed, falling back to OpenAI: %s", exc)

    return await _transcribe_via_openai(audio_bytes, language, mime_type, requested_language)


async def _transcribe_via_stt_agent(
    audio_bytes: bytes,
    language: str,
    mime_type: str | None,
) -> str:
    if not settings.stt_agent_http_url:
        raise ValueError("STT_AGENT_HTTP_URL is not configured")

    timeout_seconds = max(settings.stt_agent_timeout_ms, 1000) / 1000
    timeout = httpx.Timeout(timeout=timeout_seconds, connect=10.0, read=timeout_seconds, write=30.0, pool=10.0)
    audio_name, audio_content_type = resolve_audio_upload_metadata(mime_type)

    async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
        response = await client.post(
            settings.stt_agent_http_url,
            files={"audio": (audio_name, audio_bytes, audio_content_type)},
            data={"language": language or "si-LK"},
        )
        response.raise_for_status()
        payload = response.json() if response.content else {}
        text = str(payload.get("transcription", "")).strip() if isinstance(payload, dict) else ""
        if not text:
            raise ValueError("stt-agent returned empty transcript")
        return text


# ---------------------------------------------------------------------------
# OpenAI Whisper transcription with dual-pass + vocabulary prompt injection
# ---------------------------------------------------------------------------

async def _transcribe_via_openai(
    audio_bytes: bytes,
    language: str,
    mime_type: str | None,
    requested_language: str,
) -> str:
    if not settings.openai_api_key:
        raise RuntimeError("OPENAI_API_KEY is not configured")

    is_sinhala_pref = requested_language.startswith("si")
    openai_url = f"{settings.openai_api_base_url.rstrip('/')}/audio/transcriptions"
    headers = {"Authorization": f"Bearer {settings.openai_api_key}"}
    timeout = httpx.Timeout(
        timeout=settings.openai_stt_timeout_ms / 1000,
        connect=10.0,
        read=settings.openai_stt_timeout_ms / 1000,
        write=30.0,
        pool=10.0,
    )
    started = time.perf_counter()

    # Fetch vocabulary for prompt injection (cached, near-zero cost on warm path)
    vocabulary = await get_stt_vocabulary()

    # Build the base prompt + vocabulary hint
    base_prompt = settings.openai_base_transcribe_prompt
    si_hint = settings.openai_si_transcribe_prompt
    extra = settings.openai_transcribe_prompt

    # The vocabulary prompt biases Whisper toward correct English product spellings
    vocab_prompt = build_vocab_prompt(base_prompt, vocabulary)
    si_vocab_prompt = build_vocab_prompt(f"{base_prompt} {si_hint}".strip(), vocabulary)
    full_prompt = f"{vocab_prompt} {extra}".strip() if extra else vocab_prompt

    # Prepare audio variants: original + normalized WAV + boosted WAV
    audio_variants: list[tuple[str, bytes]] = [("voice.webm", audio_bytes)]
    normalized_wav = normalize_audio_to_wav(audio_bytes, amplify=1.0)
    if normalized_wav:
        logger.info("Audio normalized: original=%dB normalized=%dB", len(audio_bytes), len(normalized_wav))
        audio_variants.append(("voice.wav", normalized_wav))
        boosted_wav = normalize_audio_to_wav(audio_bytes, amplify=2.5)
        if boosted_wav:
            logger.info("Audio boosted: original=%dB boosted=%dB", len(audio_bytes), len(boosted_wav))
            audio_variants.append(("voice-boost.wav", boosted_wav))

    is_short_audio = len(audio_bytes) < _SHORT_AUDIO_THRESHOLD
    last_data: dict[str, Any] | None = None

    async def _call_openai(
        prompt: str | None,
        audio_name: str,
        audio_payload: bytes,
        language_override: str | None = None,
    ) -> dict[str, Any]:
        form_data: dict[str, str] = {
            "model": settings.openai_whisper_model,
            "response_format": "verbose_json" if settings.openai_whisper_model == "whisper-1" else "json",
            "temperature": "0",
        }
        if prompt and prompt.strip():
            form_data["prompt"] = prompt.strip()

        if settings.openai_whisper_model == "whisper-1":
            normalized_override = (language_override or "").lower()
            if normalized_override.startswith("en"):
                form_data["language"] = "en"
            elif requested_language.startswith("en"):
                form_data["language"] = "en"

        files = {
            "file": (audio_name, audio_payload, "audio/wav" if audio_name.endswith(".wav") else "audio/webm")
        }
        async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
            response = await client.post(openai_url, data=form_data, files=files, headers=headers)
            elapsed_ms = int((time.perf_counter() - started) * 1000)
            logger.info(
                "OpenAI STT responded: model=%s lang=%s status=%d elapsedMs=%d",
                settings.openai_whisper_model,
                language_override or form_data.get("language", "auto"),
                response.status_code,
                elapsed_ms,
            )
            response.raise_for_status()
            return response.json()

    def _confidence_score(data: dict[str, Any]) -> float:
        """Lower is better: combines no_speech_prob and avg_logprob."""
        segments = data.get("segments") if isinstance(data, dict) else None
        if not isinstance(segments, list) or not segments:
            return 0.5  # unknown → neutral
        total_no_speech = sum(float(s.get("no_speech_prob", 0) or 0) for s in segments) / len(segments)
        total_logprob = sum(float(s.get("avg_logprob", 0) or 0) for s in segments) / len(segments)
        # Normalise: high no_speech → bad, very negative logprob → bad
        return total_no_speech - total_logprob  # lower is worse (inverted)

    def _pick_better(
        en_data: dict[str, Any] | None,
        si_data: dict[str, Any] | None,
    ) -> tuple[str, dict[str, Any] | None]:
        """
        Choose between an English-pass and Sinhala-pass result.

        Rules (in order):
        1. Short product-name override: if English text is ≤3 words of pure
           Latin AND the Sinhala result is pure Sinhala script of comparable
           short length → the user almost certainly said a product name in
           English (e.g. "Onion") that the Sinhala pass garbled.
        2. Mixed-Sinhala rule: if the Sinhala text is a mix of scripts and
           the English text is a short clean Latin query, prefer English.
        3. Confidence-based fallback for all other cases.
        """
        en_text = (((en_data or {}).get("text") or "")).strip() if en_data else ""
        si_text = (((si_data or {}).get("text") or "")).strip() if si_data else ""

        if not en_text and not si_text:
            return "", None
        if not en_text:
            return si_text, si_data
        if not si_text:
            return en_text, en_data

        en_words = en_text.split()
        en_clean = not transcript_has_sinhala(en_text)
        si_is_pure_sinhala = transcript_is_sinhala_only(si_text)
        si_words = si_text.split()

        # Rule 1: short pure-Latin result vs. short pure-Sinhala result
        # Only fire when the English result is ≤4 words (a product name / short
        # query) so we don't accidentally override full Sinhala sentences.
        if (
            en_clean
            and si_is_pure_sinhala
            and len(en_words) <= 4
            and len(si_words) <= 6  # comparable length — not a long sentence
            and transcript_looks_english_query(en_text)
        ):
            logger.info(
                "Dual-pass Rule 1: preferring English %r over Sinhala-only %r",
                en_text, si_text,
            )
            return en_text, en_data

        # Rule 2: mixed-script Sinhala result + short clean English query
        if (
            en_clean
            and len(en_words) <= 4
            and transcript_looks_english_query(en_text)
            and transcript_has_sinhala(si_text)
            and not si_is_pure_sinhala  # mixed script → unreliable
        ):
            logger.info(
                "Dual-pass Rule 2: preferring English product query %r over mixed %r",
                en_text, si_text,
            )
            return en_text, en_data

        # Rule 3: confidence-based fallback
        if en_data and si_data:
            en_score = _confidence_score(en_data)
            si_score = _confidence_score(si_data)
            logger.info("Dual-pass confidence: en=%.3f si=%.3f", en_score, si_score)
            if en_score < si_score:
                return en_text, en_data

        return si_text, si_data

    try:
        for audio_name, audio_payload in audio_variants:
            # ------------------------------------------------------------------
            # Dual-pass: for Sinhala-preferred short audio, run both an
            # English pass and a Sinhala pass concurrently, then pick the better
            # result. For longer audio, only run the Sinhala-aware pass.
            # ------------------------------------------------------------------
            if is_sinhala_pref and is_short_audio:
                en_task = asyncio.create_task(
                    _call_openai(vocab_prompt, audio_name, audio_payload, "en")
                )
                si_task = asyncio.create_task(
                    _call_openai(si_vocab_prompt, audio_name, audio_payload, None)
                )
                en_result, si_result = await asyncio.gather(en_task, si_task, return_exceptions=True)
                en_data = en_result if isinstance(en_result, dict) else None
                si_data = si_result if isinstance(si_result, dict) else None
                text, data = _pick_better(en_data, si_data)
                last_data = data
            else:
                data = await _call_openai(
                    full_prompt if not is_sinhala_pref else si_vocab_prompt,
                    audio_name,
                    audio_payload,
                )
                last_data = data if isinstance(data, dict) else None
                text = ((data.get("text") if isinstance(data, dict) else "") or "").strip()

            # ------------------------------------------------------------------
            # Retry with vocab prompt if first pass returned nothing
            # ------------------------------------------------------------------
            if not text:
                data = await _call_openai(full_prompt, audio_name, audio_payload)
                last_data = data if isinstance(data, dict) else None
                text = ((data.get("text") if isinstance(data, dict) else "") or "").strip()

            detected_lang = (
                str(data.get("language")).lower()
                if isinstance(data, dict) and data.get("language") is not None
                else None
            )

            # ------------------------------------------------------------------
            # Sinhala-only result for short audio → try English recovery pass
            # This catches "Onion" → "අනියම්" type mis-transcriptions.
            # ------------------------------------------------------------------
            if (
                text
                and is_short_audio
                and transcript_is_sinhala_only(text)
            ):
                logger.info(
                    "Short audio produced pure Sinhala %r — attempting English recovery pass",
                    text,
                )
                try:
                    en_data = await _call_openai(vocab_prompt, audio_name, audio_payload, "en")
                    en_text = ((en_data.get("text") if isinstance(en_data, dict) else "") or "").strip()
                    if en_text and transcript_looks_english_query(en_text) and not is_low_confidence_whisper(en_data):
                        logger.info("English recovery succeeded: %r → %r", text, en_text)
                        text = en_text
                        data = en_data
                        last_data = en_data
                        detected_lang = "english"
                except Exception as exc:
                    logger.warning("English recovery pass failed: %s", exc)

            # ------------------------------------------------------------------
            # Mixed Sinhala+disallowed script → recovery prompt
            # ------------------------------------------------------------------
            if text and detected_lang in ("sinhala", "si") and has_disallowed_script_chars(text):
                recovery = f"{base_prompt} {si_hint}"
                data = await _call_openai(recovery, audio_name, audio_payload)
                last_data = data if isinstance(data, dict) else None
                text = ((data.get("text") if isinstance(data, dict) else "") or "").strip()
                detected_lang = (
                    str(data.get("language")).lower()
                    if isinstance(data, dict) and data.get("language") is not None
                    else None
                )

            # ------------------------------------------------------------------
            # Quality filters
            # ------------------------------------------------------------------
            if detected_lang and not (
                detected_lang.startswith("en")
                or detected_lang.startswith("si")
                or detected_lang == "sinhala"
                or detected_lang == "english"
            ):
                logger.warning("Unsupported detected language=%s for audio=%s", detected_lang, audio_name)
                text = ""

            if text and is_low_confidence_whisper(data):
                logger.warning("Rejected low-confidence whisper transcript for audio=%s", audio_name)
                text = ""

            if text and is_prompt_echo(text, settings.openai_transcribe_prompt):
                text = ""
            if text and looks_hallucinated_transcript(text, len(audio_payload)):
                logger.warning("Rejected likely hallucinated transcript for audio=%s text=%s", audio_name, text)
                text = ""
            if text and has_disallowed_script_chars(text):
                text = ""

            if text:
                logger.info("Final transcription (audio=%s): %s", audio_name, text)
                return text

            logger.warning("OpenAI STT empty on audio=%s", audio_name)

        raise ValueError(
            f"OpenAI returned empty transcription after trying all audio variants. Last response: {last_data}"
        )

    except httpx.TimeoutException as exc:
        raise ValueError("OpenAI Whisper timeout. Please retry in a few seconds.") from exc
    except httpx.HTTPStatusError as exc:
        body = exc.response.text if exc.response is not None else ""
        raise ValueError(f"OpenAI Whisper HTTP error: {body or exc}") from exc
    except httpx.HTTPError as exc:
        raise ValueError(f"OpenAI Whisper HTTP error: {exc}") from exc
