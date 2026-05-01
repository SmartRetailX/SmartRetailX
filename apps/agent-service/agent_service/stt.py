import subprocess
import time
from typing import Any

import httpx

from .config import (
    OPENAI_API_BASE_URL,
    OPENAI_API_KEY,
    OPENAI_BASE_TRANSCRIBE_PROMPT,
    OPENAI_SI_TRANSCRIBE_PROMPT,
    OPENAI_STT_TIMEOUT_MS,
    OPENAI_TRANSCRIBE_PROMPT,
    OPENAI_WHISPER_MODEL,
    STT_AGENT_HTTP_URL,
    STT_AGENT_TIMEOUT_MS,
    STT_PROVIDER,
)
from .logging_setup import logger
from .text_processing import (
    has_disallowed_script_chars,
    is_low_confidence_whisper,
    is_prompt_echo,
    looks_hallucinated_transcript,
)


def normalize_audio_to_wav(audio_bytes: bytes, amplify: float = 1.0) -> bytes | None:
    try:
        audio_filters = "highpass=f=80,lowpass=f=7800"
        if amplify > 1.0:
            audio_filters = f"{audio_filters},volume={amplify}"

        process = subprocess.run(
            [
                "ffmpeg",
                "-hide_banner",
                "-loglevel",
                "error",
                "-i",
                "pipe:0",
                "-af",
                audio_filters,
                "-ac",
                "1",
                "-ar",
                "16000",
                "-f",
                "wav",
                "pipe:1",
            ],
            input=audio_bytes,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=True,
        )
        return process.stdout or None
    except FileNotFoundError:
        logger.warning("ffmpeg not found; skipping audio normalization")
        return None
    except subprocess.CalledProcessError as error:
        logger.warning(
            "ffmpeg normalization failed: %s",
            error.stderr.decode("utf-8", errors="ignore"),
        )
        return None


async def transcribe_audio(audio_bytes: bytes, language: str) -> str:
    logger.info(
        "Transcribing audio: provider=%s size=%s language=%s",
        STT_PROVIDER,
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

    async def _transcribe_via_stt_agent() -> str:
        if not STT_AGENT_HTTP_URL:
            raise ValueError("STT_AGENT_HTTP_URL is not configured")

        timeout_seconds = max(STT_AGENT_TIMEOUT_MS, 1000) / 1000
        timeout_config = httpx.Timeout(
            timeout=timeout_seconds,
            connect=10.0,
            read=timeout_seconds,
            write=30.0,
            pool=10.0,
        )

        files = {"audio": ("voice.webm", audio_bytes, "audio/webm")}
        data = {"language": language or "si-LK"}
        async with httpx.AsyncClient(timeout=timeout_config, follow_redirects=True) as client:
            response = await client.post(STT_AGENT_HTTP_URL, files=files, data=data)
            response.raise_for_status()
            payload = response.json() if response.content else {}
            text = (
                str(payload.get("transcription", "")).strip()
                if isinstance(payload, dict)
                else ""
            )
            if not text:
                raise ValueError("stt-agent returned empty transcript")
            return text

    if STT_PROVIDER in ("stt-agent", "hybrid"):
        try:
            text = await _transcribe_via_stt_agent()
            logger.info("STT agent transcription succeeded")
            return text
        except Exception as error:
            if STT_PROVIDER == "stt-agent":
                logger.exception("STT agent transcription failed")
                raise ValueError(f"stt-agent transcription failed: {error}") from error
            logger.warning("STT agent failed, falling back to OpenAI: %s", error)

    if not OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY is not configured")

    is_sinhala_pref = requested_language.startswith("si")
    openai_url = f"{OPENAI_API_BASE_URL.rstrip('/')}/audio/transcriptions"
    headers = {"Authorization": f"Bearer {OPENAI_API_KEY}"}
    timeout_seconds = OPENAI_STT_TIMEOUT_MS / 1000
    timeout_config = httpx.Timeout(
        timeout=timeout_seconds,
        connect=10.0,
        read=timeout_seconds,
        write=30.0,
        pool=10.0,
    )

    started = time.perf_counter()

    async def _call_openai(
        prompt: str | None,
        audio_name: str,
        audio_payload: bytes,
        model_name: str,
        language_override: str | None = None,
    ) -> dict[str, Any]:
        files = {
            "file": (
                audio_name,
                audio_payload,
                "audio/wav" if audio_name.endswith(".wav") else "audio/webm",
            )
        }
        form_data: dict[str, str] = {
            "model": model_name,
            "response_format": "verbose_json" if model_name == "whisper-1" else "json",
            "temperature": "0",
        }
        if prompt and prompt.strip():
            form_data["prompt"] = prompt.strip()

        if model_name == "whisper-1":
            # Some OpenAI deployments reject Sinhala language codes (e.g. "si").
            # Use explicit language only for English and rely on auto-detection otherwise.
            normalized_override = (language_override or "").lower()
            if normalized_override.startswith("en"):
                form_data["language"] = "en"
            elif requested_language.startswith("en"):
                form_data["language"] = "en"

        async with httpx.AsyncClient(
            timeout=timeout_config, follow_redirects=True
        ) as client:
            response = await client.post(
                openai_url, data=form_data, files=files, headers=headers
            )
            elapsed_ms = int((time.perf_counter() - started) * 1000)
            logger.info(
                "OpenAI STT responded: model=%s langHint=%s status=%s elapsedMs=%s",
                model_name,
                language_override
                or ("en" if requested_language.startswith("en") else "auto"),
                response.status_code,
                elapsed_ms,
            )
            response.raise_for_status()
            data = response.json()
            logger.info(
                "OpenAI STT response keys=%s",
                list(data.keys()) if isinstance(data, dict) else type(data),
            )
            return data

    audio_variants: list[tuple[str, bytes]] = [("voice.webm", audio_bytes)]
    normalized_wav = normalize_audio_to_wav(audio_bytes, amplify=1.0)
    if normalized_wav:
        logger.info(
            "Audio normalized for STT: original=%sB normalized=%sB",
            len(audio_bytes),
            len(normalized_wav),
        )
        audio_variants.append(("voice.wav", normalized_wav))
        boosted_wav = normalize_audio_to_wav(audio_bytes, amplify=2.5)
        if boosted_wav:
            logger.info(
                "Audio boosted for STT: original=%sB boosted=%sB",
                len(audio_bytes),
                len(boosted_wav),
            )
            audio_variants.append(("voice-boost.wav", boosted_wav))

    last_data: dict[str, Any] | None = None

    try:
        for audio_name, audio_payload in audio_variants:
            data = await _call_openai(
                None, audio_name, audio_payload, OPENAI_WHISPER_MODEL
            )
            last_data = data if isinstance(data, dict) else None
            text = ((data.get("text") if isinstance(data, dict) else "") or "").strip()

            if not text:
                retry_prompt = OPENAI_BASE_TRANSCRIBE_PROMPT
                if is_sinhala_pref:
                    retry_prompt = f"{retry_prompt} {OPENAI_SI_TRANSCRIBE_PROMPT}"
                if OPENAI_TRANSCRIBE_PROMPT:
                    retry_prompt = f"{retry_prompt} {OPENAI_TRANSCRIBE_PROMPT}"
                data = await _call_openai(
                    retry_prompt, audio_name, audio_payload, OPENAI_WHISPER_MODEL
                )
                last_data = data if isinstance(data, dict) else None
                text = (
                    (data.get("text") if isinstance(data, dict) else "") or ""
                ).strip()

            detected_lang = (
                str(data.get("language")).lower()
                if isinstance(data, dict) and data.get("language") is not None
                else None
            )

            if (
                text
                and detected_lang in ("sinhala", "si")
                and has_disallowed_script_chars(text)
            ):
                recovery_prompt = (
                    f"{OPENAI_BASE_TRANSCRIBE_PROMPT} {OPENAI_SI_TRANSCRIBE_PROMPT}"
                )
                data = await _call_openai(
                    recovery_prompt, audio_name, audio_payload, OPENAI_WHISPER_MODEL
                )
                last_data = data if isinstance(data, dict) else None
                text = (
                    (data.get("text") if isinstance(data, dict) else "") or ""
                ).strip()
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
                logger.warning(
                    "Unsupported detected language=%s for audio=%s",
                    detected_lang,
                    audio_name,
                )
                text = ""

            if text and is_low_confidence_whisper(data):
                logger.warning(
                    "Rejected low-confidence whisper transcript for audio=%s",
                    audio_name,
                )
                text = ""

            if text and is_prompt_echo(text, OPENAI_TRANSCRIBE_PROMPT):
                text = ""
            if text and looks_hallucinated_transcript(text, len(audio_payload)):
                logger.warning(
                    "Rejected likely hallucinated transcript for audio=%s text=%s",
                    audio_name,
                    text,
                )
                text = ""
            if text and has_disallowed_script_chars(text):
                text = ""

            if text:
                logger.info("Final transcription text (audio=%s): %s", audio_name, text)
                return text

            logger.warning("OpenAI STT empty on audio=%s", audio_name)

        raise ValueError(
            "OpenAI returned empty transcription after trying cleaned audio variants. "
            f"Last response: {last_data}"
        )
    except httpx.TimeoutException as error:
        raise ValueError(
            "OpenAI Whisper timeout. Please retry in a few seconds."
        ) from error
    except httpx.HTTPStatusError as error:
        response_text = error.response.text if error.response is not None else ""
        raise ValueError(
            f"OpenAI Whisper HTTP error: {response_text or error}"
        ) from error
    except httpx.HTTPError as error:
        raise ValueError(f"OpenAI Whisper HTTP error: {error}") from error
