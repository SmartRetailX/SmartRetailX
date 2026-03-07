import asyncio
import base64
import json
import logging
import os
import shutil
import subprocess
import time
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [agent-service] %(message)s",
)
logger = logging.getLogger("agent-service")
FFMPEG_AVAILABLE = shutil.which("ffmpeg") is not None
if not FFMPEG_AVAILABLE:
    logger.warning("ffmpeg is not installed. Audio normalization is disabled; transcription accuracy may be poor.")

HTTP_PORT = int(os.getenv("AGENT_HTTP_PORT", "8010"))
TCP_HOST = os.getenv("AGENT_TCP_HOST", "0.0.0.0")
TCP_PORT = int(os.getenv("AGENT_TCP_PORT", "8877"))
SINLAMA_API_URL = os.getenv("SINLAMA_API_URL", "")
SINLAMA_API_KEY = os.getenv("SINLAMA_API_KEY", "")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
# Keep transcription config in code for simpler env management.
WHISPER_PROVIDER = "openai"
OPENAI_API_BASE_URL = "https://api.openai.com/v1"
OPENAI_WHISPER_MODEL = "whisper-1"
OPENAI_TRANSCRIBE_PROMPT = ""
OPENAI_STT_TIMEOUT_MS = 90_000
OPENAI_BASE_TRANSCRIBE_PROMPT = (
    "Transcribe this audio verbatim. Keep original spoken words only. "
    "Allowed languages are Sinhala and English (including mixed speech). "
    "Do not translate, summarize, or add extra sentences."
)
OPENAI_SI_TRANSCRIBE_PROMPT = (
    "Sinhala focus: return Sinhala words in Sinhala script and keep English words in English. "
    "Do not transliterate, translate, or add content."
)


def _is_prompt_echo(transcript: str, prompt: str | None) -> bool:
    if not transcript:
        return False

    normalized_transcript = " ".join(transcript.lower().split())
    # Guard against known hallucinated sentence even when no prompt is sent.
    known_bad = "the speech may contain sinhala and english mixed together"
    if known_bad in normalized_transcript:
        return True

    if not prompt:
        return False

    normalized_prompt = " ".join(prompt.lower().split())

    if normalized_transcript == normalized_prompt:
        return True

    # Common failure mode: output contains mostly prompt text.
    if normalized_prompt in normalized_transcript and len(normalized_transcript) <= len(normalized_prompt) + 20:
        return True

    return False


def _looks_hallucinated_transcript(transcript: str, requested_language: str, audio_size: int) -> bool:
    normalized = " ".join(transcript.lower().split())
    if not normalized:
        return True

    # Repeated sentence loop (common on unclear audio)
    sentences = [s.strip() for s in normalized.replace("!", ".").replace("?", ".").split(".") if s.strip()]
    if len(sentences) >= 2 and len(set(sentences)) == 1:
        return True

    # Very short clips with long fluent output are commonly hallucinated.
    if audio_size < 20_000 and len(normalized.split()) >= 10:
        return True

    # Repeated short phrase loop (e.g., "thank you" repeated many times).
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


def _is_low_confidence_whisper(data: dict[str, Any]) -> bool:
    if not isinstance(data, dict):
        return False
    segments = data.get("segments")
    if not isinstance(segments, list) or not segments:
        return False

    max_no_speech_prob = 0.0
    min_avg_logprob = 0.0
    max_compression_ratio = 0.0
    saw_any = False

    for segment in segments:
        if not isinstance(segment, dict):
            continue
        saw_any = True
        max_no_speech_prob = max(max_no_speech_prob, float(segment.get("no_speech_prob", 0.0) or 0.0))
        min_avg_logprob = min(min_avg_logprob, float(segment.get("avg_logprob", 0.0) or 0.0))
        max_compression_ratio = max(
            max_compression_ratio, float(segment.get("compression_ratio", 0.0) or 0.0)
        )

    if not saw_any:
        return False

    # Conservative thresholds that catch common hallucinations.
    if max_no_speech_prob >= 0.60:
        return True
    if min_avg_logprob <= -1.2:
        return True
    if max_compression_ratio >= 2.8:
        return True
    return False


def _has_disallowed_script_chars(text: str) -> bool:
    for ch in text:
        code = ord(ch)
        if ch.isspace() or ch.isdigit():
            continue
        # Sinhala block
        if 0x0D80 <= code <= 0x0DFF:
            continue
        # Basic Latin + Latin-1 supplement
        if 0x0020 <= code <= 0x024F:
            continue
        # Common punctuation/symbol blocks
        if 0x2000 <= code <= 0x206F:
            continue
        if 0x20A0 <= code <= 0x20CF:
            continue
        return True
    return False


def _normalize_audio_to_wav(audio_bytes: bytes, amplify: float = 1.0) -> bytes | None:
    """
    Convert browser-recorded audio (webm/opus) to 16kHz mono WAV to improve STT stability.
    Requires ffmpeg in PATH.
    """
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
        wav_bytes = process.stdout
        if not wav_bytes:
            return None
        return wav_bytes
    except FileNotFoundError:
        logger.warning("ffmpeg not found; skipping audio normalization")
        return None
    except subprocess.CalledProcessError as error:
        logger.warning("ffmpeg normalization failed: %s", error.stderr.decode("utf-8", errors="ignore"))
        return None

app = FastAPI(
    title="Smart RetailX Agent Service",
    description="Sinhala voice-to-chat service (Whisper + SinLama/Gemini)",
    version="1.0.0",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@dataclass
class VoiceChatResult:
    success: bool
    transcription: str
    response: str
    language: str
    sessionId: str
    messages: list[dict[str, str]]
    model: str
    latencyMs: int
    error: str | None = None


tcp_server: asyncio.base_events.Server | None = None


def _make_frame(payload: dict[str, Any]) -> bytes:
    body = json.dumps(payload, ensure_ascii=False)
    return f"{len(body)}#{body}".encode("utf-8")


def _parse_pattern(packet: dict[str, Any]) -> str:
    pattern = packet.get("pattern")
    if isinstance(pattern, str):
        try:
            parsed = json.loads(pattern)
            if isinstance(parsed, dict) and "cmd" in parsed:
                return str(parsed["cmd"])
        except json.JSONDecodeError:
            return pattern
    if isinstance(pattern, dict):
        return str(pattern.get("cmd", ""))
    return ""


async def transcribe_audio(audio_bytes: bytes, language: str) -> str:
    logger.info(
        "Transcribing audio: provider=%s size=%s language=%s",
        WHISPER_PROVIDER,
        len(audio_bytes),
        language,
    )
    if not OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY is not configured")
    requested_language = (language or "").lower()
    if not (
        requested_language.startswith("si")
        or requested_language.startswith("en")
        or requested_language in ("auto", "")
    ):
        raise ValueError("Unsupported language. Allowed values: auto, si-LK, en-US.")
    if len(audio_bytes) < 12_000:
        raise ValueError("Audio clip too short. Please speak for at least 2 seconds.")
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

    try:
        started = time.perf_counter()

        async def _call_openai(
            prompt: str | None,
            audio_name: str,
            audio_payload: bytes,
            model_name: str,
            language_override: str | None = None,
        ) -> dict[str, Any]:
            files = {"file": (audio_name, audio_payload, "audio/wav" if audio_name.endswith(".wav") else "audio/webm")}
            response_format = "verbose_json" if model_name == "whisper-1" else "json"
            form_data: dict[str, str] = {
                "model": model_name,
                "response_format": response_format,
                "temperature": "0",
            }
            if prompt and prompt.strip():
                form_data["prompt"] = prompt.strip()
            if model_name == "whisper-1":
                if language_override:
                    form_data["language"] = language_override
                elif is_sinhala_pref:
                    form_data["language"] = "si"
                elif requested_language.startswith("en"):
                    form_data["language"] = "en"
            async with httpx.AsyncClient(timeout=timeout_config, follow_redirects=True) as client:
                response = await client.post(openai_url, data=form_data, files=files, headers=headers)
                elapsed_ms = int((time.perf_counter() - started) * 1000)
                logger.info(
                    "OpenAI STT responded: model=%s langHint=%s status=%s elapsedMs=%s",
                    model_name,
                    language_override or ("si" if is_sinhala_pref else ("en" if requested_language.startswith("en") else "auto")),
                    response.status_code,
                    elapsed_ms,
                )
                response.raise_for_status()
                data = response.json()
                logger.info("OpenAI STT response keys=%s", list(data.keys()) if isinstance(data, dict) else type(data))
                return data

        audio_variants: list[tuple[str, bytes]] = [("voice.webm", audio_bytes)]
        normalized_wav = _normalize_audio_to_wav(audio_bytes, amplify=1.0)
        if normalized_wav:
            logger.info("Audio normalized for STT: original=%sB normalized=%sB", len(audio_bytes), len(normalized_wav))
            audio_variants.append(("voice.wav", normalized_wav))
            boosted_wav = _normalize_audio_to_wav(audio_bytes, amplify=2.5)
            if boosted_wav:
                logger.info("Audio boosted for STT: original=%sB boosted=%sB", len(audio_bytes), len(boosted_wav))
                audio_variants.append(("voice-boost.wav", boosted_wav))

        model_plan: list[str] = [OPENAI_WHISPER_MODEL]

        last_data: dict[str, Any] | None = None
        for audio_name, audio_payload in audio_variants:
            for model_name in model_plan:
                data = await _call_openai(None, audio_name, audio_payload, model_name)
                last_data = data if isinstance(data, dict) else None
                text = ((data.get("text") if isinstance(data, dict) else "") or "").strip()

                if not text:
                    retry_prompt = OPENAI_BASE_TRANSCRIBE_PROMPT
                    if is_sinhala_pref:
                        retry_prompt = f"{retry_prompt} {OPENAI_SI_TRANSCRIBE_PROMPT}"
                    if OPENAI_TRANSCRIBE_PROMPT:
                        retry_prompt = f"{retry_prompt} {OPENAI_TRANSCRIBE_PROMPT}"
                    data = await _call_openai(
                        retry_prompt,
                        audio_name,
                        audio_payload,
                        model_name,
                    )
                    last_data = data if isinstance(data, dict) else None
                    text = ((data.get("text") if isinstance(data, dict) else "") or "").strip()

                detected_lang = (
                    str(data.get("language")).lower()
                    if isinstance(data, dict) and data.get("language") is not None
                    else None
                )
                if (
                    text
                    and model_name == "whisper-1"
                    and detected_lang in ("sinhala", "si")
                    and _has_disallowed_script_chars(text)
                ):
                    # Recovery pass: Whisper detected Sinhala but returned wrong script/transliteration.
                    recovery_prompt = f"{OPENAI_BASE_TRANSCRIBE_PROMPT} {OPENAI_SI_TRANSCRIBE_PROMPT}"
                    data = await _call_openai(
                        recovery_prompt,
                        audio_name,
                        audio_payload,
                        model_name,
                        "si",
                    )
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
                    logger.warning(
                        "Unsupported detected language=%s for audio=%s model=%s",
                        detected_lang,
                        audio_name,
                        model_name,
                    )
                    text = ""
                if text and model_name == "whisper-1" and _is_low_confidence_whisper(data):
                    logger.warning(
                        "Rejected low-confidence whisper transcript for audio=%s model=%s",
                        audio_name,
                        model_name,
                    )
                    text = ""

                if text and _is_prompt_echo(text, OPENAI_TRANSCRIBE_PROMPT):
                    text = ""
                if text and _looks_hallucinated_transcript(text, language, len(audio_payload)):
                    logger.warning("Rejected likely hallucinated transcript for audio=%s model=%s text=%s", audio_name, model_name, text)
                    text = ""
                if text and _has_disallowed_script_chars(text):
                    text = ""

                if text:
                    logger.info("Final transcription text (audio=%s model=%s): %s", audio_name, model_name, text)
                    return text

                logger.warning("OpenAI STT empty on audio=%s model=%s", audio_name, model_name)

        raise ValueError(
            "OpenAI returned empty transcription after trying cleaned audio variants. "
            f"Last response: {last_data}"
        )
    except httpx.TimeoutException as error:
        raise ValueError("OpenAI Whisper timeout. Please retry in a few seconds.") from error
    except httpx.HTTPStatusError as error:
        response_text = error.response.text if error.response is not None else ""
        raise ValueError(f"OpenAI Whisper HTTP error: {response_text or error}") from error
    except httpx.HTTPError as error:
        raise ValueError(f"OpenAI Whisper HTTP error: {error}") from error


async def process_voice_chat(
    audio_bytes: bytes,
    language: str = "si-LK",
    session_id: str | None = None,
    user_id: str | None = None,
    user_context: dict[str, Any] | None = None,
    intents: list[str] | None = None,
    transcript_text: str | None = None,
) -> VoiceChatResult:
    model_name = "openai+sinlama"
    logger.info("Voice chat start: session=%s language=%s userId=%s", session_id, language, user_id)
    started = time.perf_counter()
    session_id = session_id or f"voice-{uuid.uuid4().hex[:12]}"
    transcription = ""
    response_text = ""

    try:
        transcription = (transcript_text or "").strip()
        if transcription:
            logger.info("Using client transcript override: %s", transcription)
        else:
            transcription = await transcribe_audio(audio_bytes, language)
        if not transcription:
            raise ValueError("No speech detected in audio")

        response_text = await query_sinlama_with_context(
            text=transcription,
            language=language,
            session_id=session_id,
            user_id=user_id,
            user_context=user_context,
            intents=intents,
        )
        latency_ms = int((time.perf_counter() - started) * 1000)

        return VoiceChatResult(
            success=True,
            transcription=transcription,
            response=response_text,
            language=language,
            sessionId=session_id,
            messages=[
                {
                    "role": "user",
                    "content": transcription,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                },
                {
                    "role": "assistant",
                    "content": response_text,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                },
            ],
            model=model_name,
            latencyMs=latency_ms,
        )
    except Exception as error:
        logger.exception("Voice chat failed: %s", error)
        latency_ms = int((time.perf_counter() - started) * 1000)
        return VoiceChatResult(
            success=False,
            transcription=transcription,
            response=response_text,
            language=language,
            sessionId=session_id,
            messages=[],
            model=model_name,
            latencyMs=latency_ms,
            error=str(error),
        )


async def query_sinlama_with_context(
    text: str,
    language: str,
    session_id: str,
    user_id: str | None,
    user_context: dict[str, Any] | None,
    intents: list[str] | None,
) -> str:
    if not SINLAMA_API_URL:
        role = (user_context or {}).get("role", "guest")
        return (
            f"[fallback:{role}] ඔබගේ ප්‍රශ්නය ලැබුණා: \"{text}\". "
            "SinLama API URL සකසා නැති නිසා සත්‍ය AI ප්‍රතිචාරය ලබාගත නොහැක."
        )

    headers = {"Content-Type": "application/json"}
    if SINLAMA_API_KEY:
        headers["Authorization"] = f"Bearer {SINLAMA_API_KEY}"

    payload = {
        "text": text,
        "language": language,
        "sessionId": session_id,
        "userId": user_id,
        "userContext": user_context or {"role": "guest"},
        "intents": intents
        or ["offers", "order_history", "buying_suggestions", "prices", "product_search"],
        "domain": "smart-retail-x",
        "responseStyle": "concise_sinhala",
    }

    try:
        async with httpx.AsyncClient(timeout=45.0) as client:
            response = await client.post(SINLAMA_API_URL, headers=headers, json=payload)
            response.raise_for_status()
            data = response.json()
        return data.get("response") or data.get("answer") or data.get("message") or "SinLama response was empty."
    except httpx.HTTPError as error:
        logger.warning("SinLama unavailable, returning transcription-only fallback: %s", error)
        return "SinLama service is currently unavailable. Showing transcription only."


async def _handle_nest_packet(packet: dict[str, Any]) -> dict[str, Any]:
    cmd = _parse_pattern(packet)
    payload = packet.get("data", {})
    request_id = packet.get("id")

    if cmd != "voice_chat":
        return {"id": request_id, "err": f"Unsupported pattern: {cmd}", "isDisposed": True}

    audio_base64 = payload.get("audioBase64")
    if not audio_base64:
        return {"id": request_id, "err": "audioBase64 is required", "isDisposed": True}

    try:
        audio_bytes = base64.b64decode(audio_base64)
    except Exception:
        return {"id": request_id, "err": "Invalid base64 audio payload", "isDisposed": True}
    logger.info("TCP packet received: cmd=%s audio_size=%s session=%s", cmd, len(audio_bytes), payload.get("sessionId"))

    result = await process_voice_chat(
        audio_bytes=audio_bytes,
        language=payload.get("language", "si-LK"),
        session_id=payload.get("sessionId"),
        user_id=payload.get("userId"),
        user_context=payload.get("userContext"),
        intents=payload.get("intents"),
        transcript_text=payload.get("transcriptText"),
    )

    return {"id": request_id, "response": result.__dict__, "isDisposed": True}


async def _tcp_client_loop(reader: asyncio.StreamReader, writer: asyncio.StreamWriter) -> None:
    try:
        while True:
            header = await reader.readuntil(b"#")
            body_length = int(header[:-1].decode("utf-8"))
            body = await reader.readexactly(body_length)
            packet = json.loads(body.decode("utf-8"))
            response_packet = await _handle_nest_packet(packet)
            writer.write(_make_frame(response_packet))
            await writer.drain()
    except (asyncio.IncompleteReadError, asyncio.LimitOverrunError, ValueError, json.JSONDecodeError):
        pass
    finally:
        writer.close()
        await writer.wait_closed()


@app.on_event("startup")
async def start_tcp_server() -> None:
    global tcp_server
    tcp_server = await asyncio.start_server(_tcp_client_loop, TCP_HOST, TCP_PORT)


@app.on_event("shutdown")
async def stop_tcp_server() -> None:
    global tcp_server
    if tcp_server:
        tcp_server.close()
        await tcp_server.wait_closed()


@app.get("/health")
async def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "httpPort": HTTP_PORT,
        "tcpPort": TCP_PORT,
        "whisperProvider": WHISPER_PROVIDER,
        "openaiModel": OPENAI_WHISPER_MODEL,
    }


@app.post("/api/v1/voice/chat")
async def voice_chat(
    audio: UploadFile = File(...),
    language: str = Form("si-LK"),
    sessionId: str | None = Form(None),
    userId: str | None = Form(None),
    userRole: str = Form("guest"),
    transcriptText: str | None = Form(None),
    intents: str = Form("offers,order_history,buying_suggestions,prices,product_search"),
) -> dict[str, Any]:
    audio_bytes = await audio.read()
    logger.info("HTTP /api/v1/voice/chat: size=%s language=%s session=%s", len(audio_bytes), language, sessionId)
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Audio payload is empty")

    parsed_intents = [part.strip() for part in intents.split(",") if part.strip()]
    result = await process_voice_chat(
        audio_bytes,
        language=language,
        session_id=sessionId,
        user_id=userId,
        user_context={"id": userId, "role": userRole},
        intents=parsed_intents,
        transcript_text=transcriptText,
    )
    # Return structured failure without converting to HTTP 502 so gateway/client
    # can show a user-facing retry message instead of a transport error.
    return result.__dict__
