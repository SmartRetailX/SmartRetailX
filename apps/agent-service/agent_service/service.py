"""
Voice chat orchestration pipeline.

Flow
----
Audio/Text
  └─► STT (transcribe_audio)
        └─► Intent detection (sinLlama → keyword fallback)
              └─► Intent resolver  (DB query per intent)
                    └─► Response builder (deterministic Markdown draft)
                          └─► LLM enrichment (fluent Sinhala, grounded in DB data)
                                └─► VoiceChatResult
"""

from __future__ import annotations

import time
import uuid
from datetime import datetime, timezone
from typing import Any

from .intent import detect_intent_and_entities, normalize_transcript
from .intent_resolver import resolve_intent
from .llm_client import generate_sinhala_response
from .logging_setup import logger
from .models import VoiceChatResult
from .response_builder import build_deterministic_response, build_llm_context_summary
from .sinllama_client import detect_intent_with_sinllama
from .stt import transcribe_audio


def _message(role: str, content: str) -> dict[str, str]:
    return {
        "role": role,
        "content": content,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


# ---------------------------------------------------------------------------
# Public entry-point
# ---------------------------------------------------------------------------

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
    logger.info(
        "Voice chat start: session=%s language=%s userId=%s",
        session_id, language, user_id,
    )
    started = time.perf_counter()
    session_id = session_id or f"voice-{uuid.uuid4().hex[:12]}"
    transcription = ""
    response_text = ""
    explainability: dict[str, Any] | None = None

    try:
        # ── 1. TRANSCRIPTION ──────────────────────────────────────────────
        transcription = (transcript_text or "").strip()
        if transcription:
            logger.info("Using client transcript override: %s", transcription[:120])
        elif audio_bytes:
            transcription = await transcribe_audio(audio_bytes, language, mime_type)

        transcription = normalize_transcript(transcription)
        if not transcription:
            raise ValueError("No speech detected in audio")

        # ── 2. INTENT DETECTION ───────────────────────────────────────────
        intent_name, intent_confidence, entities = await _detect_intent(
            transcription, language, session_id, user_id, intents
        )
        explainability = _build_explainability(intent_name, intent_confidence, entities)

        logger.info(
            "Intent detected: intent=%s confidence=%.2f entities=%s",
            intent_name, intent_confidence, entities,
        )

        # ── 3. INTENT RESOLUTION (DB QUERY) ──────────────────────────────
        ctx = await resolve_intent(
            intent=intent_name,
            entities=entities,
            user_id=user_id,
            explainability=explainability,
        )

        # ── 4. CLARIFICATION SHORTCUT ─────────────────────────────────────
        # If we need more info from the user return immediately – no LLM call.
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
                intent=intent_name,
                entities=entities,
                explainability=explainability,
            )

        # ── 5. DETERMINISTIC RESPONSE DRAFT ──────────────────────────────
        deterministic_draft = build_deterministic_response(ctx)
        db_context_summary = build_llm_context_summary(ctx)

        # ── 6. LLM ENRICHMENT ────────────────────────────────────────────
        # The LLM receives the DB context + deterministic draft so it can
        # only improve natural-language fluency, not invent new facts.
        response_text = await generate_sinhala_response(
            text=transcription,
            language=language,
            session_id=session_id,
            user_id=user_id,
            user_context=user_context,
            intents=intents or [intent_name],
            intent_name=intent_name,
            intent_confidence=intent_confidence,
            entities=entities,
            explainability=explainability,
            db_context_summary=db_context_summary,
            deterministic_draft=deterministic_draft,
        )

        # LLM unavailable or returned nothing → use deterministic draft directly
        if not (response_text or "").strip():
            logger.warning("LLM returned empty – using deterministic draft")
            response_text = deterministic_draft

        latency_ms = int((time.perf_counter() - started) * 1000)
        logger.info(
            "Voice chat done: session=%s intent=%s latency=%dms",
            session_id, intent_name, latency_ms,
        )

        return VoiceChatResult(
            success=True,
            transcription=transcription,
            response=response_text,
            language=language,
            sessionId=session_id,
            messages=[
                _message("user", transcription),
                _message("assistant", response_text),
            ],
            model=OPENAI_RESPONSE_MODEL_LABEL,
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
            model="error",
            latencyMs=latency_ms,
            explainability=explainability,
            error=str(error),
        )


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

OPENAI_RESPONSE_MODEL_LABEL = "openai-grounded-agent"


async def _detect_intent(
    transcription: str,
    language: str,
    session_id: str,
    user_id: str | None,
    intents: list[str] | None,
) -> tuple[str, float, dict[str, Any]]:
    """
    Try sinLlama first; fall back to local keyword matching.
    Returns (intent_name, confidence, entities).
    """
    remote = await detect_intent_with_sinllama(
        text=transcription,
        language=language,
        session_id=session_id,
        user_id=user_id,
        allowed_intents=intents,
    )
    if remote:
        return (
            str(remote["intent"]),
            float(remote.get("confidence", 0.0) or 0.0),
            remote.get("entities") or {},
        )

    # keyword fallback
    intent_name, intent_confidence, entities, _clarification = detect_intent_and_entities(
        transcription, intents
    )
    return intent_name, intent_confidence, entities


def _build_explainability(
    intent_name: str,
    intent_confidence: float,
    entities: dict[str, Any],
) -> dict[str, Any]:
    """Construct explainability dict from keyword-fallback result."""
    return {
        "source": "fallback-keyword",
        "confidence": intent_confidence,
        "rationale": f"Keyword matching selected intent '{intent_name}'",
        "features": [
            {"name": k, "weight": None, "evidence": str(v)}
            for k, v in (entities or {}).items()
        ],
    }
