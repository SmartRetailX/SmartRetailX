"""
Voice chat orchestration pipeline.

Flow
----
Audio / Text
  └─► STT (stt.transcriber)
        └─► Intent detection (intent.sinllama → intent.keyword fallback)
              └─► Intent resolver  (pipeline.resolver)
                    └─► Response builder (pipeline.response)
                          └─► LLM enrichment (llm.client)
                                └─► VoiceChatResult
"""

from __future__ import annotations

import time
import uuid
from datetime import datetime, timezone
from typing import Any

from .intent.keyword import detect_intent_and_entities
from .intent.sinllama import detect_intent_with_sinllama
from .llm.client import generate_sinhala_response
from .logging import logger
from .models import IntentResult, VoiceChatResult
from .pipeline.resolver import resolve_intent
from .pipeline.response import build_deterministic_response, build_llm_context_summary
from .stt.transcriber import transcribe_audio
from .stt.validation import normalize_transcript

_RESPONSE_MODEL_LABEL = "openai-grounded-agent"


def _message(role: str, content: str) -> dict[str, str]:
    return {"role": role, "content": content, "timestamp": datetime.now(timezone.utc).isoformat()}


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
    logger.info("Voice chat start: session=%s language=%s userId=%s", session_id, language, user_id)
    started = time.perf_counter()
    session_id = session_id or f"voice-{uuid.uuid4().hex[:12]}"
    transcription = ""
    response_text = ""
    explainability: dict[str, Any] | None = None

    try:
        # 1. Transcription
        transcription = (transcript_text or "").strip()
        if transcription:
            logger.info("Using client transcript override: %s", transcription[:120])
        elif audio_bytes:
            transcription = await transcribe_audio(audio_bytes, language, mime_type)

        transcription = normalize_transcript(transcription)
        if not transcription:
            raise ValueError("No speech detected in audio")

        # 2. Intent detection (SinLlama → keyword fallback)
        intent_result = await _detect_intent(transcription, language, session_id, user_id, intents)
        explainability = intent_result.explainability

        logger.info(
            "Intent detected: intent=%s confidence=%.2f entities=%s",
            intent_result.intent, intent_result.confidence, intent_result.entities,
        )

        # 3. Intent resolution (DB query)
        ctx = await resolve_intent(
            intent=intent_result.intent,
            entities=intent_result.entities,
            user_id=user_id,
            explainability=explainability,
        )

        # 4. Clarification shortcut – skip LLM if we need more info
        if ctx.needs_clarification and not ctx.has_data:
            clarification = ctx.clarification_prompt_si
            latency_ms = int((time.perf_counter() - started) * 1000)
            return VoiceChatResult(
                success=True,
                transcription=transcription,
                response=clarification,
                language=language,
                sessionId=session_id,
                messages=[_message("user", transcription), _message("assistant", clarification)],
                model="clarification",
                latencyMs=latency_ms,
                intent=intent_result.intent,
                entities=intent_result.entities,
                explainability=explainability,
            )

        # 5. Deterministic response draft
        deterministic_draft = build_deterministic_response(ctx)
        db_context_summary = build_llm_context_summary(ctx)

        # 6. LLM enrichment (grounded in DB data)
        response_text = await generate_sinhala_response(
            text=transcription,
            language=language,
            session_id=session_id,
            user_id=user_id,
            user_context=user_context,
            intents=intents or [intent_result.intent],
            intent_name=intent_result.intent,
            intent_confidence=intent_result.confidence,
            entities=intent_result.entities,
            explainability=explainability,
            db_context_summary=db_context_summary,
            deterministic_draft=deterministic_draft,
        )

        if not (response_text or "").strip():
            logger.warning("LLM returned empty – using deterministic draft")
            response_text = deterministic_draft

        latency_ms = int((time.perf_counter() - started) * 1000)
        logger.info(
            "Voice chat done: session=%s intent=%s latency=%dms",
            session_id, intent_result.intent, latency_ms,
        )

        return VoiceChatResult(
            success=True,
            transcription=transcription,
            response=response_text,
            language=language,
            sessionId=session_id,
            messages=[_message("user", transcription), _message("assistant", response_text)],
            model=_RESPONSE_MODEL_LABEL,
            latencyMs=latency_ms,
            intent=intent_result.intent,
            entities=intent_result.entities,
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
            model="error",
            latencyMs=latency_ms,
            explainability=explainability,
            error=str(error),
        )


async def _detect_intent(
    transcription: str,
    language: str,
    session_id: str,
    user_id: str | None,
    intents: list[str] | None,
) -> IntentResult:
    """Try SinLlama first; fall back to local keyword matching."""
    remote = await detect_intent_with_sinllama(
        text=transcription,
        language=language,
        session_id=session_id,
        user_id=user_id,
        allowed_intents=intents,
    )
    if remote:
        return remote

    intent_name, confidence, entities, _clarification = detect_intent_and_entities(transcription, intents)
    return IntentResult(
        intent=intent_name,
        confidence=confidence,
        entities=entities,
        explainability={
            "source": "fallback-keyword",
            "confidence": confidence,
            "rationale": f"Keyword matching selected intent '{intent_name}'",
            "features": [
                {"name": k, "weight": None, "evidence": str(v)}
                for k, v in entities.items()
            ],
        },
    )
