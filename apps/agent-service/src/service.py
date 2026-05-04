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

import json
import time
import uuid
from datetime import datetime, timezone
from typing import Any

from .db.queries import (
    get_active_offers,
    get_buying_suggestions,
    get_product_price_page,
    search_products_page,
)
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

# Intents whose DB results should be surfaced as a structured product list
_PRODUCT_LIST_INTENTS = frozenset({"prices", "product_search", "offers", "buying_suggestions"})
_PRODUCT_PAGE_SIZE = 5
_PRODUCT_PAGE_COMMAND_PREFIX = "__srx_product_page__:"


def _message(role: str, content: str) -> dict[str, str]:
    return {"role": role, "content": content, "timestamp": datetime.now(timezone.utc).isoformat()}


def _clamp_limit(value: int | None) -> int:
    if value is None:
        return _PRODUCT_PAGE_SIZE
    return max(1, min(int(value), 10))

def _to_non_negative_int(value: Any, default: int = 0) -> int:
    try:
        return max(0, int(value))
    except (TypeError, ValueError):
        return default


def _build_product_pagination(
    *,
    intent: str,
    entities: dict[str, Any] | None,
    query: str | None,
    category_hint: str | None,
    total: int,
    offset: int,
    limit: int,
) -> dict[str, Any] | None:
    if total <= limit:
        return None

    next_offset = offset + limit
    return {
        "intent": intent,
        "query": query,
        "categoryHint": category_hint,
        "offset": offset,
        "limit": limit,
        "nextOffset": next_offset,
        "total": total,
        "hasMore": next_offset < total,
        "entities": entities or {},
    }


def _parse_product_page_command(transcription: str) -> dict[str, Any] | None:
    text = (transcription or "").strip()
    if not text.startswith(_PRODUCT_PAGE_COMMAND_PREFIX):
        return None

    payload = text[len(_PRODUCT_PAGE_COMMAND_PREFIX) :].strip()
    if not payload:
        return None

    try:
        raw = json.loads(payload)
        return raw if isinstance(raw, dict) else None
    except json.JSONDecodeError:
        return None


def _render_product_page_response(
    *,
    intent: str,
    query: str | None,
    category_hint: str | None,
    offset: int,
    rows_count: int,
    total: int,
) -> str:
    if total <= 0 or rows_count <= 0:
        if intent == "prices":
            return "ඉල්ලූ භාණ්ඩයට අදාළ වැඩි ප්‍රතිඵල මෙතෙක් හමු නොවුණා."
        if intent == "offers":
            return "දැනට වැඩි offer ප්‍රතිඵල නැහැ."
        if intent == "buying_suggestions":
            return "දැනට අමතර යෝජනා නොමැත."
        return "එම සෙවුමට තවත් භාණ්ඩ හමු නොවුණා."

    start = offset + 1
    end = offset + rows_count
    has_more = end < total

    if intent == "prices":
        title = f"**{query}** සඳහා අමතර මිල ප්‍රතිඵල"
    elif intent == "offers":
        title = "අමතර offers ප්‍රතිඵල"
    elif intent == "buying_suggestions":
        label = f" ({category_hint})" if category_hint else ""
        title = f"අමතර buying suggestions{label}"
    else:
        title = f"**{query}** සඳහා අමතර භාණ්ඩ"

    suffix = (
        f"ප්‍රතිඵල {start}-{end} of {total}."
        if has_more
        else f"ප්‍රතිඵල {start}-{end} of {total}. මේවා අවසන් ප්‍රතිඵල."
    )
    return f"{title} ලබාදුන්නා. {suffix}"


async def _handle_product_page_command(
    command: dict[str, Any],
    *,
    transcription: str,
    language: str,
    session_id: str,
    user_id: str | None,
    started: float,
) -> VoiceChatResult:
    intent = str(command.get("intent") or "product_search").strip() or "product_search"
    query = str(command.get("query") or "").strip() or None
    category_hint = str(command.get("categoryHint") or "").strip() or None
    offset = _to_non_negative_int(command.get("offset"), default=0)
    limit = _clamp_limit(command.get("limit"))

    rows: list[dict[str, Any]] = []
    total = 0
    display_transcription = f"Show more products for {query}" if query else "Show more products"

    if intent == "prices":
        if not query:
            response_text = "වැඩි මිල ප්‍රතිඵල බලන්න භාණ්ඩ නම අවශ්‍යයි."
            latency_ms = int((time.perf_counter() - started) * 1000)
            return VoiceChatResult(
                success=True,
                transcription=display_transcription,
                response=response_text,
                language=language,
                sessionId=session_id,
                messages=[_message("user", display_transcription), _message("assistant", response_text)],
                model="product-pagination",
                latencyMs=latency_ms,
                intent=intent,
                entities={"product": query or ""},
            )
        rows, total = await get_product_price_page(query, limit=limit, offset=offset)
    elif intent == "offers":
        expanded = await get_active_offers(limit=min(offset + limit + 10, 100))
        total = len(expanded)
        rows = expanded[offset : offset + limit]
    elif intent == "buying_suggestions":
        expanded = await get_buying_suggestions(
            user_id,
            category_hint=category_hint,
            limit=min(offset + limit + 10, 100),
        )
        total = len(expanded)
        rows = expanded[offset : offset + limit]
    else:
        if not query:
            response_text = "වැඩි භාණ්ඩ ප්‍රතිඵල බලන්න සෙවුම් වචනය අවශ්‍යයි."
            latency_ms = int((time.perf_counter() - started) * 1000)
            return VoiceChatResult(
                success=True,
                transcription=display_transcription,
                response=response_text,
                language=language,
                sessionId=session_id,
                messages=[_message("user", display_transcription), _message("assistant", response_text)],
                model="product-pagination",
                latencyMs=latency_ms,
                intent="product_search",
                entities={"product": query or ""},
            )
        rows, total = await search_products_page(query, limit=limit, offset=offset)
        intent = "product_search"

    response_text = _render_product_page_response(
        intent=intent,
        query=query,
        category_hint=category_hint,
        offset=offset,
        rows_count=len(rows),
        total=total,
    )
    pagination = _build_product_pagination(
        intent=intent,
        entities={"product": query} if query else {},
        query=query,
        category_hint=category_hint,
        total=total,
        offset=offset,
        limit=limit,
    )
    latency_ms = int((time.perf_counter() - started) * 1000)
    return VoiceChatResult(
        success=True,
        transcription=display_transcription,
        response=response_text,
        language=language,
        sessionId=session_id,
        messages=[_message("user", display_transcription), _message("assistant", response_text)],
        model="product-pagination",
        latencyMs=latency_ms,
        intent=intent,
        entities={"product": query} if query else {},
        products=rows or None,
        productPagination=pagination,
    )


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

        page_command = _parse_product_page_command(transcription)
        if page_command:
            return await _handle_product_page_command(
                page_command,
                transcription=transcription,
                language=language,
                session_id=session_id,
                user_id=user_id,
                started=started,
            )

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
                suggestions=ctx.suggestions or None,
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

        products = (
            ctx.db_results
            if intent_result.intent in _PRODUCT_LIST_INTENTS and ctx.db_results
            else None
        )
        primary_query = str(intent_result.entities.get("product") or "").strip() or None
        category_hint = str(intent_result.entities.get("category") or "").strip() or None
        product_pagination = (
            _build_product_pagination(
                intent=intent_result.intent,
                entities=intent_result.entities,
                query=primary_query,
                category_hint=category_hint,
                total=len(products),
                offset=0,
                limit=_PRODUCT_PAGE_SIZE,
            )
            if products
            else None
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
            suggestions=ctx.suggestions or None,
            products=products,
            productPagination=product_pagination,
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
