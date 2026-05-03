import time
import uuid
from datetime import datetime, timezone
from typing import Any

from .intent import detect_intent_and_entities, normalize_transcript
from .llm_client import generate_sinhala_response
from .logging_setup import logger
from .models import VoiceChatResult
from .sinllama_client import detect_intent_with_sinllama
from .stt import transcribe_audio


def _message(role: str, content: str) -> dict[str, str]:
    return {
        "role": role,
        "content": content,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


def _fallback_response(intent_name: str, entities: dict[str, Any] | None) -> str:
    product = str((entities or {}).get("product") or "").strip()
    db_only_intents = {
        "prices",
        "product_search",
        "offers",
        "order_history",
        "buying_suggestions",
    }
    if intent_name in db_only_intents:
        return (
            "මට database මත පදනම් වූ නිවැරදි දත්ත පමණක් ලබාදිය හැක. "
            "කරුණාකර product name, offer, price, stock, order number වගේ විස්තරාත්මක එකක් අහන්න."
        )
    if intent_name in ("prices", "product_search") and not product:
        return "ඔබට බලන්න ඕන භාණ්ඩයේ නම කියන්න. එතකොට මට නිවැරදිව උත්තර දෙන්න පුළුවන්."
    if intent_name == "offers":
        return "දැනට ඇති offers බලලා කියන්න මට පුළුවන්. offer ගැන වැඩි විස්තරයක් ඇහුවොත් මම පැහැදිලිව උත්තර දෙන්නම්."
    if intent_name == "order_history":
        return "ඔබගේ ඇණවුම් ඉතිහාසය ගැන උදව් කරන්න මට පුළුවන්. නවතම order එක හෝ අවශ්‍ය order එක කියන්න."
    if intent_name == "buying_suggestions":
        return "ඔබට ගැලපෙන භාණ්ඩ යෝජනා දෙන්න මට පුළුවන්. අවශ්‍ය category එකක් කියන්න."
    return "ඔබගේ ප්‍රශ්නය ලැබුණා. ටිකක් වැඩි විස්තරයක් දුන්නොත් මම නිවැරදිව උත්තර දෙන්නම්."


async def process_voice_chat(
    audio_bytes: bytes,
    language: str = "si-LK",
    mime_type: str | None = None,
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
    explainability: dict[str, Any] | None = None

    try:
        transcription = (transcript_text or "").strip()
        if transcription:
            logger.info("Using client transcript override: %s", transcription)
        elif audio_bytes:
            transcription = await transcribe_audio(audio_bytes, language, mime_type)

        transcription = normalize_transcript(transcription)
        if not transcription:
            raise ValueError("No speech detected in audio")

        remote_intent = await detect_intent_with_sinllama(
            text=transcription,
            language=language,
            session_id=session_id,
            user_id=user_id,
            allowed_intents=intents,
        )
        if remote_intent:
            intent_name = str(remote_intent["intent"])
            intent_confidence = float(remote_intent.get("confidence", 0.0) or 0.0)
            entities = remote_intent.get("entities") or {}
            explainability = remote_intent.get("explainability")
            clarification = None
            if intent_name in ("prices", "product_search") and "product" not in entities:
                clarification = "ඔබට අවශ්‍ය භාණ්ඩයේ නම කියන්න. එතකොට මට නිවැරදිව උත්තර දෙන්න පුළුවන්."
        else:
            intent_name, intent_confidence, entities, clarification = detect_intent_and_entities(transcription, intents)
            explainability = {
                "source": "fallback-keyword",
                "confidence": intent_confidence,
                "rationale": "keyword based fallback",
                "features": [],
            }
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
                intent=intent_name,
                entities=entities,
                explainability=explainability,
            )

        if intent_name in (
            "prices",
            "product_search",
            "offers",
            "order_history",
            "buying_suggestions",
        ):
            response_text = _fallback_response(intent_name, entities)
            latency_ms = int((time.perf_counter() - started) * 1000)
            return VoiceChatResult(
                success=True,
                transcription=transcription,
                response=response_text,
                language=language,
                sessionId=session_id,
                messages=[_message("user", transcription), _message("assistant", response_text)],
                model="db-grounded-agent-safety",
                latencyMs=latency_ms,
                intent=intent_name,
                entities=entities,
                explainability=explainability,
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
            explainability=explainability,
        )
        if not (response_text or "").strip():
            logger.warning("LLM returned empty response; using deterministic Sinhala fallback")
            response_text = _fallback_response(intent_name, entities)

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
            intent=intent_name,
            entities=entities,
            explainability=explainability,
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
            explainability=explainability,
            error=str(error),
        )
