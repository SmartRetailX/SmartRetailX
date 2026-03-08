import time
import uuid
from datetime import datetime, timezone
from typing import Any

from .intent import detect_intent_and_entities, normalize_transcript
from .llm_client import generate_sinhala_response
from .logging_setup import logger
from .models import VoiceChatResult
from .stt import transcribe_audio


def _message(role: str, content: str) -> dict[str, str]:
    return {
        "role": role,
        "content": content,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


async def process_voice_chat(
    audio_bytes: bytes,
    language: str = "si-LK",
    session_id: str | None = None,
    user_id: str | None = None,
    user_context: dict[str, Any] | None = None,
    intents: list[str] | None = None,
    transcript_text: str | None = None,
) -> VoiceChatResult:
    model_name = "openai-intent-assistant"
    logger.info("Voice chat start: session=%s language=%s userId=%s", session_id, language, user_id)
    started = time.perf_counter()
    session_id = session_id or f"voice-{uuid.uuid4().hex[:12]}"
    transcription = ""
    response_text = ""

    try:
        transcription = (transcript_text or "").strip()
        if transcription:
            logger.info("Using client transcript override: %s", transcription)
        elif audio_bytes:
            transcription = await transcribe_audio(audio_bytes, language)

        transcription = normalize_transcript(transcription)
        if not transcription:
            raise ValueError("No speech detected in audio")

        intent_name, intent_confidence, entities, clarification = detect_intent_and_entities(transcription, intents)
        logger.info("Intent detected: intent=%s confidence=%.2f entities=%s", intent_name, intent_confidence, entities)

        if clarification:
            latency_ms = int((time.perf_counter() - started) * 1000)
            return VoiceChatResult(
                success=True,
                transcription=transcription,
                response=clarification,
                language=language,
                sessionId=session_id,
                messages=[_message("user", transcription), _message("assistant", clarification)],
                model=model_name,
                latencyMs=latency_ms,
            )

        response_text = await generate_sinhala_response(
            text=transcription,
            language=language,
            session_id=session_id,
            user_id=user_id,
            user_context=user_context,
            intents=[intent_name],
            intent_name=intent_name,
            intent_confidence=intent_confidence,
            entities=entities,
        )

        latency_ms = int((time.perf_counter() - started) * 1000)
        return VoiceChatResult(
            success=True,
            transcription=transcription,
            response=response_text,
            language=language,
            sessionId=session_id,
            messages=[_message("user", transcription), _message("assistant", response_text)],
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
