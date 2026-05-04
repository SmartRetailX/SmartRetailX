"""Voice chat orchestration pipeline.

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

import re
import time
import uuid
from datetime import datetime, timezone
from typing import Any

from .intent.keyword import (
    _extract_product_hint,
    detect_intent_and_entities,
    detect_offer_type,
    has_buying_suggestions_signal,
    has_order_history_signal,
    has_promotions_signal,
    has_stock_query_signal,
    has_user_profile_signal,
    is_last_order_query,
)
from .intent.sinllama import detect_intent_with_sinllama
from .llm.client import generate_simple_result_explanation, generate_sinhala_response
from .log import logger
from .models import IntentResult, VoiceChatResult
from .session import get_session
from .pipeline.commands import (
    handle_product_detail_command,
    handle_product_page_command,
    parse_product_detail_command,
    parse_product_page_command,
)
from .pipeline.pagination import _PRODUCT_PAGE_SIZE, build_product_pagination
from .pipeline.resolver import resolve_intent
from .pipeline.response import build_deterministic_response, build_llm_context_summary
from .stt.transcriber import transcribe_audio
from .stt.validation import normalize_transcript

_BUDGET_PRICE_PATTERN = re.compile(
    r"(?:රු\.?\s*|rs\.?\s*|lkr\.?\s*)?[0-9][0-9,]*\s*(?:කට|ට|ට\s+ගන්|ට\s+ඇතුළත|under|below|within|budget)"
    r"|(?:under|below|within)\s+(?:රු\.?\s*|rs\.?\s*)?[0-9][0-9,]*"
    r"|(?:cheapest|ලාභම|most\s+expensive|price\s+range)",
    re.IGNORECASE,
)


def _has_budget_price_signal(text: str) -> bool:
    return bool(_BUDGET_PRICE_PATTERN.search(text or ""))


_RESPONSE_MODEL_LABEL = "openai-grounded-agent"
_PRODUCT_LIST_INTENTS = frozenset(
    {"prices", "product_search", "offers", "buying_suggestions"}
)
_RICH_TEXT_INTENTS = frozenset({"order_history", "user_profile", "promotions"})
_EXPLANATION_SECTION_MARKER = "\n\n---\n\n**🔍"


def _message(role: str, content: str) -> dict[str, str]:
    return {
        "role": role,
        "content": content,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


def _strip_explanation_section(content: str) -> str:
    if not content:
        return content
    index = content.find(_EXPLANATION_SECTION_MARKER)
    return content[:index].rstrip() if index >= 0 else content


def _append_simple_explanation(content: str, sentence: str) -> str:
    body = _strip_explanation_section(content or "").strip()
    explain = (sentence or "").strip()
    if not explain:
        return body
    return f"{body}\n\n---\n\n**🔍 මෙම ප්‍රතිඵල පෙන්වූයේ ඇයි?**\n- {explain}"


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
        session_id,
        language,
        user_id,
    )
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

        # 2. Protocol command shortcuts (bypass the full pipeline)
        page_command = parse_product_page_command(transcription)
        if page_command:
            return await handle_product_page_command(
                page_command,
                transcription=transcription,
                language=language,
                session_id=session_id,
                user_id=user_id,
                started=started,
            )

        detail_command = parse_product_detail_command(transcription)
        if detail_command:
            return await handle_product_detail_command(
                detail_command,
                language=language,
                session_id=session_id,
                started=started,
            )

        # 3. Intent detection (SinLlama → keyword fallback)
        #    But first: check if this turn is a reply to a previous clarification question.
        session = get_session(session_id)
        intent_result = await _resolve_with_session(
            transcription, language, session_id, user_id, intents, session
        )
        buying_signal = has_buying_suggestions_signal(transcription)
        if buying_signal and intent_result.intent != "buying_suggestions":
            local_intent, local_conf, local_entities, _ = detect_intent_and_entities(
                transcription,
                intents,
            )
            if local_intent == "buying_suggestions":
                logger.info(
                    "Buying-suggestions override applied: detected_intent=%s local_conf=%.2f text=%r",
                    intent_result.intent,
                    local_conf,
                    transcription[:160],
                )
                merged_entities = dict(intent_result.entities)
                merged_entities.update(local_entities)
                intent_result = IntentResult(
                    intent="buying_suggestions",
                    confidence=max(intent_result.confidence, max(local_conf, 0.86)),
                    entities=merged_entities,
                    explainability={
                        "source": "buying-suggestions-override",
                        "confidence": max(intent_result.confidence, max(local_conf, 0.86)),
                        "rationale": "Strong recommendation request detected with shopping constraints.",
                        "features": [
                            {
                                "name": "buying_suggestion_signal",
                                "weight": 1.0,
                                "evidence": transcription[:120],
                            }
                        ],
                    },
                )

        if intent_result.intent != "order_history" and has_order_history_signal(
            transcription
        ) and not buying_signal:
            logger.info(
                "Order-history override applied: detected_intent=%s userId=%s text=%r",
                intent_result.intent,
                user_id,
                transcription[:160],
            )
            intent_result = IntentResult(
                intent="order_history",
                confidence=max(intent_result.confidence, 0.90),
                entities={"user_id": user_id} if user_id else {},
                explainability={
                    "source": "order-history-override",
                    "confidence": max(intent_result.confidence, 0.90),
                    "rationale": "Strong order-history keywords detected in user message.",
                    "features": [
                        {
                            "name": "order_history_signal",
                            "weight": 1.0,
                            "evidence": transcription[:120],
                        }
                    ],
                },
            )

        elif intent_result.intent != "user_profile" and has_user_profile_signal(
            transcription
        ):
            logger.info(
                "User-profile override applied: detected_intent=%s userId=%s text=%r",
                intent_result.intent,
                user_id,
                transcription[:160],
            )
            intent_result = IntentResult(
                intent="user_profile",
                confidence=max(intent_result.confidence, 0.88),
                entities={"user_id": user_id} if user_id else {},
                explainability={
                    "source": "user-profile-override",
                    "confidence": max(intent_result.confidence, 0.88),
                    "rationale": "Strong user-profile keywords detected in user message.",
                    "features": [
                        {
                            "name": "user_profile_signal",
                            "weight": 1.0,
                            "evidence": transcription[:120],
                        }
                    ],
                },
            )

        elif intent_result.intent != "promotions" and has_promotions_signal(
            transcription
        ) and not buying_signal:
            logger.info(
                "Promotions override applied: detected_intent=%s text=%r",
                intent_result.intent,
                transcription[:160],
            )
            intent_result = IntentResult(
                intent="promotions",
                confidence=max(intent_result.confidence, 0.88),
                entities={},
                explainability={
                    "source": "promotions-override",
                    "confidence": max(intent_result.confidence, 0.88),
                    "rationale": "Strong promotions keywords detected in user message.",
                    "features": [
                        {
                            "name": "promotions_signal",
                            "weight": 1.0,
                            "evidence": transcription[:120],
                        }
                    ],
                },
            )

        elif intent_result.intent != "prices" and _has_budget_price_signal(transcription) and not buying_signal:
            logger.info(
                "Prices/budget override applied: detected_intent=%s text=%r",
                intent_result.intent,
                transcription[:160],
            )
            from .intent.keyword import _extract_price_modifier, _extract_budget_amount, _extract_category_hint
            _price_modifier = _extract_price_modifier(transcription)
            _budget_amount = _extract_budget_amount(transcription)
            _category = _extract_category_hint(transcription)
            _price_entities: dict[str, Any] = {}
            if _price_modifier:
                _price_entities["price_modifier"] = _price_modifier
            if _budget_amount:
                _price_entities["budget_amount"] = str(int(_budget_amount) if _budget_amount == int(_budget_amount) else _budget_amount)
            if _category:
                _price_entities["category"] = _category
            intent_result = IntentResult(
                intent="prices",
                confidence=max(intent_result.confidence, 0.88),
                entities=_price_entities,
                explainability={
                    "source": "prices-budget-override",
                    "confidence": max(intent_result.confidence, 0.88),
                    "rationale": "Budget/price keywords detected in user message.",
                    "features": [
                        {
                            "name": "budget_price_signal",
                            "weight": 1.0,
                            "evidence": transcription[:120],
                        }
                    ],
                },
            )

        # Backfill missing product entity from transcript for product-centric intents.
        if (
            intent_result.intent
            in {"prices", "product_search", "offers", "promotions", "buying_suggestions"}
            and not str(intent_result.entities.get("product") or "").strip()
        ):
            product_hint = _extract_product_hint(transcription, intent_result.intent)
            if product_hint:
                intent_result.entities["product"] = product_hint
                logger.info(
                    "Entity backfill applied: intent=%s product=%r",
                    intent_result.intent,
                    product_hint,
                )

        explainability = intent_result.explainability
        logger.info(
            "Intent detected: intent=%s confidence=%.2f entities=%s",
            intent_result.intent,
            intent_result.confidence,
            intent_result.entities,
        )

        # Tag last-order queries so the resolver limits to 1 result
        if intent_result.intent == "order_history" and is_last_order_query(
            transcription
        ):
            intent_result.entities["last_order_only"] = True

        # Tag BOGO / multi-buy offer type so the response can acknowledge it
        if intent_result.intent in ("offers", "promotions"):
            offer_type = detect_offer_type(transcription)
            if offer_type:
                intent_result.entities["offer_type"] = offer_type

        # Tag stock queries so response includes stock availability column
        if (
            intent_result.intent in ("product_search", "prices")
            and has_stock_query_signal(transcription)
            and not intent_result.entities.get("include_stock")
        ):
            intent_result.entities["include_stock"] = True

        # 4. Intent resolution (DB query)
        ctx = await resolve_intent(
            intent=intent_result.intent,
            entities=intent_result.entities,
            user_id=user_id,
            explainability=explainability,
        )

        # 5. Clarification shortcut — skip LLM when more info is needed
        if ctx.needs_clarification and not ctx.has_data:
            clarification = ctx.clarification_prompt_si
            # Save pending intent so the next turn can resume without re-asking
            session.set_clarification(intent_result.intent, intent_result.entities)
            latency_ms = int((time.perf_counter() - started) * 1000)
            return VoiceChatResult(
                success=True,
                transcription=transcription,
                response=clarification,
                language=language,
                sessionId=session_id,
                messages=[
                    _message("user", transcription),
                    _message("assistant", clarification),
                ],
                model="clarification",
                latencyMs=latency_ms,
                intent=intent_result.intent,
                entities=intent_result.entities,
                explainability=explainability,
                suggestions=ctx.suggestions or None,
            )

        # 6. Deterministic response draft
        deterministic_draft = build_deterministic_response(ctx)
        db_context_summary = build_llm_context_summary(ctx)

        # 7. LLM enrichment (grounded in DB data)
        # For product-list intents with zero DB rows, keep response deterministic
        # to avoid speculative/placeholder wording (e.g., fake product mentions).
        use_deterministic_only = (
            intent_result.intent in _PRODUCT_LIST_INTENTS and not ctx.has_data
        )
        if use_deterministic_only:
            logger.info(
                "Skipping LLM enrichment for empty product-list result: intent=%s",
                intent_result.intent,
            )
            response_text = deterministic_draft
        else:
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
            session_id,
            intent_result.intent,
            latency_ms,
        )

        products = (
            ctx.db_results
            if intent_result.intent in _PRODUCT_LIST_INTENTS and ctx.db_results
            else None
        )
        if products:
            simple_explanation = await generate_simple_result_explanation(
                intent_name=intent_result.intent,
                entities=intent_result.entities,
                result_count=len(products),
                db_source=ctx.db_source,
                language=language,
            )
            response_text = _append_simple_explanation(
                response_text, simple_explanation
            )

        primary_query = str(intent_result.entities.get("product") or "").strip() or None
        category_hint = (
            str(intent_result.entities.get("category") or "").strip() or None
        )
        product_pagination = (
            build_product_pagination(
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
            messages=[
                _message("user", transcription),
                _message("assistant", response_text),
            ],
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

    intent_name, confidence, entities, _clarification = detect_intent_and_entities(
        transcription, intents
    )
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


async def _resolve_with_session(
    transcription: str,
    language: str,
    session_id: str,
    user_id: str | None,
    intents: list[str] | None,
    session: Any,
) -> IntentResult:
    """Detect intent, merging with any pending clarification state from the session.

    If the previous turn asked the user for a product name (needs_clarification),
    we treat the current short reply as the product entity and resume the saved intent.
    """
    intent_result = await _detect_intent(
        transcription, language, session_id, user_id, intents
    )

    pending = session.consume_clarification()
    if pending:
        saved_intent, saved_entities = pending
        current_intent = intent_result.intent
        current_entities = dict(intent_result.entities)

        # If this turn has no product entity but the last turn was waiting for one,
        # treat the whole transcription as the product answer (unless the user clearly
        # switched to a different intent with real keyword signals).
        missing_product = "product" not in current_entities
        no_intent_switch = current_intent in ("general", saved_intent)

        if missing_product and no_intent_switch:
            from .intent.keyword import _sanitize_entity_candidate

            product_answer = _sanitize_entity_candidate(transcription)
            if product_answer:
                merged_entities = {**saved_entities, "product": product_answer}
                logger.info(
                    "Session clarification resolved: session=%s intent=%s product=%r",
                    session_id,
                    saved_intent,
                    product_answer,
                )
                return IntentResult(
                    intent=saved_intent,
                    confidence=0.90,
                    entities=merged_entities,
                    explainability={
                        "source": "session-clarification",
                        "confidence": 0.90,
                        "rationale": f"User replied with product name after clarification for intent '{saved_intent}'",
                        "features": [
                            {
                                "name": "product",
                                "weight": 1.0,
                                "evidence": product_answer,
                            }
                        ],
                    },
                )

    return intent_result
