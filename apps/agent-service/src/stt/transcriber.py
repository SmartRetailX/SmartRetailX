from __future__ import annotations

import time
from typing import Any

import httpx

from ..config import settings
from ..logging import logger
from .audio import normalize_audio_to_wav, resolve_audio_upload_metadata
from .validation import (
    has_disallowed_script_chars,
    is_low_confidence_whisper,
    is_prompt_echo,
    looks_hallucinated_transcript,
)


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

    audio_variants: list[tuple[str, bytes]] = [("voice.webm", audio_bytes)]
    normalized_wav = normalize_audio_to_wav(audio_bytes, amplify=1.0)
    if normalized_wav:
        logger.info("Audio normalized: original=%dB normalized=%dB", len(audio_bytes), len(normalized_wav))
        audio_variants.append(("voice.wav", normalized_wav))
        boosted_wav = normalize_audio_to_wav(audio_bytes, amplify=2.5)
        if boosted_wav:
            logger.info("Audio boosted: original=%dB boosted=%dB", len(audio_bytes), len(boosted_wav))
            audio_variants.append(("voice-boost.wav", boosted_wav))

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
            if normalized_override.startswith("en") or requested_language.startswith("en"):
                form_data["language"] = "en"

        files = {
            "file": (audio_name, audio_payload, "audio/wav" if audio_name.endswith(".wav") else "audio/webm")
        }
        async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
            response = await client.post(openai_url, data=form_data, files=files, headers=headers)
            elapsed_ms = int((time.perf_counter() - started) * 1000)
            logger.info(
                "OpenAI STT responded: model=%s langHint=%s status=%d elapsedMs=%d",
                settings.openai_whisper_model,
                language_override or ("en" if requested_language.startswith("en") else "auto"),
                response.status_code,
                elapsed_ms,
            )
            response.raise_for_status()
            return response.json()

    try:
        for audio_name, audio_payload in audio_variants:
            data = await _call_openai(None, audio_name, audio_payload)
            last_data = data if isinstance(data, dict) else None
            text = ((data.get("text") if isinstance(data, dict) else "") or "").strip()

            if not text:
                retry_prompt = settings.openai_base_transcribe_prompt
                if is_sinhala_pref:
                    retry_prompt = f"{retry_prompt} {settings.openai_si_transcribe_prompt}"
                if settings.openai_transcribe_prompt:
                    retry_prompt = f"{retry_prompt} {settings.openai_transcribe_prompt}"
                data = await _call_openai(retry_prompt, audio_name, audio_payload)
                last_data = data if isinstance(data, dict) else None
                text = ((data.get("text") if isinstance(data, dict) else "") or "").strip()

            detected_lang = (
                str(data.get("language")).lower()
                if isinstance(data, dict) and data.get("language") is not None
                else None
            )

            if text and detected_lang in ("sinhala", "si") and has_disallowed_script_chars(text):
                recovery = f"{settings.openai_base_transcribe_prompt} {settings.openai_si_transcribe_prompt}"
                data = await _call_openai(recovery, audio_name, audio_payload)
                last_data = data if isinstance(data, dict) else None
                text = ((data.get("text") if isinstance(data, dict) else "") or "").strip()
                detected_lang = (
                    str(data.get("language")).lower()
                    if isinstance(data, dict) and data.get("language") is not None
                    else None
                )

            if detected_lang and not (
                detected_lang.startswith("en")
                or detected_lang.startswith("si")
                or detected_lang == "sinhala"
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
