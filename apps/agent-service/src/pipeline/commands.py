"""Protocol command handling for paginated product pages and product detail drill-down.

Commands are injected by the frontend as synthetic transcript strings so they
bypass the normal STT→intent→LLM pipeline and go straight to the DB.
"""

from __future__ import annotations

import json
import re
import time
from datetime import datetime, timezone
from typing import Any

from ..db.queries import (
    get_active_offers,
    get_buying_suggestions,
    get_product_details_by_id,
    get_product_price_page,
    search_products_page,
)
from ..log import logger
from ..models import VoiceChatResult
from .pagination import build_product_pagination, clamp_limit, to_non_negative_int

_PRODUCT_PAGE_COMMAND_PREFIX = "__srx_product_page__:"
_PRODUCT_DETAIL_COMMAND_PREFIX = "__srx_product_detail__:"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _message(role: str, content: str) -> dict[str, str]:
    return {"role": role, "content": content, "timestamp": datetime.now(timezone.utc).isoformat()}


def _normalize_show_more_query(raw_query: str | None) -> str | None:
    query = (raw_query or "").strip()
    if not query:
        return None

    query = query.strip('"""').strip()
    query = re.sub(r"^\s*show\s+more\s+products\s+for\s+", "", query, flags=re.IGNORECASE).strip()
    query = re.sub(r"^\s*තවත්\s+භාණ්ඩ\s+පෙන්වන්න\s*", "", query).strip()
    query = re.sub(r"\s*සඳහා\s+තවත්\s+භාණ්ඩ\s+පෙන්වන්න\s*$", "", query).strip()
    query = re.sub(r"\s*තවත්\s+අවශ්‍යද\??\s*$", "", query).strip()

    return query or None


# ---------------------------------------------------------------------------
# Command parsers
# ---------------------------------------------------------------------------

def parse_product_page_command(transcription: str) -> dict[str, Any] | None:
    text = (transcription or "").strip()
    if not text.startswith(_PRODUCT_PAGE_COMMAND_PREFIX):
        return None
    payload = text[len(_PRODUCT_PAGE_COMMAND_PREFIX):].strip()
    if not payload:
        return None
    try:
        raw = json.loads(payload)
        return raw if isinstance(raw, dict) else None
    except json.JSONDecodeError:
        return None


def parse_product_detail_command(transcription: str) -> dict[str, Any] | None:
    text = (transcription or "").strip()
    if not text.startswith(_PRODUCT_DETAIL_COMMAND_PREFIX):
        return None
    payload = text[len(_PRODUCT_DETAIL_COMMAND_PREFIX):].strip()
    if not payload:
        return None
    try:
        raw = json.loads(payload)
        return raw if isinstance(raw, dict) else None
    except json.JSONDecodeError:
        return None


# ---------------------------------------------------------------------------
# Response text renderers
# ---------------------------------------------------------------------------

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


def _render_product_detail_response(row: dict[str, Any]) -> str:
    name = str(row.get("name_si") or row.get("name") or "භාණ්ඩය")
    sku = str(row.get("sku") or "-")
    price = float(row.get("price") or 0.0)
    stock = int(row.get("stock_quantity") or 0)
    brand = str(row.get("brand") or "N/A")
    category = str(row.get("category_si") or row.get("category") or "N/A")
    purchase_frequency = str(row.get("purchase_frequency") or "").strip().lower()
    freq_label = {"high": "ජනප්‍රිය", "medium": "මධ්‍යම", "low": "දුර්ලභ"}.get(purchase_frequency, "නොදනී")
    active = bool(row.get("is_active", True))
    description = str(row.get("description_si") or row.get("description") or "").strip()
    status = "ක්‍රියාකාරී" if active else "අක්‍රිය"
    stock_label = "ලබාගත හැක" if stock > 0 else "Out of stock"

    lines = [
        f"### ℹ️ {name} — භාණ්ඩ විස්තර",
        "",
        f"- **මිල:** රු. {price:.2f}",
        f"- **Stock:** {stock} ({stock_label})",
        f"- **SKU:** `{sku}`",
        f"- **Category:** {category}",
        f"- **Brand:** {brand}",
        f"- **ඉල්ලුම:** {freq_label}",
        f"- **තත්ත්වය:** {status}",
    ]
    if description:
        lines.extend(["", f"**විස්තරය:** {description}"])
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Command handlers
# ---------------------------------------------------------------------------

async def handle_product_page_command(
    command: dict[str, Any],
    *,
    transcription: str,
    language: str,
    session_id: str,
    user_id: str | None,
    started: float,
) -> VoiceChatResult:
    intent = str(command.get("intent") or "product_search").strip() or "product_search"
    query = _normalize_show_more_query(str(command.get("query") or ""))
    category_hint = str(command.get("categoryHint") or "").strip() or None
    offset = to_non_negative_int(command.get("offset"), default=0)
    limit = clamp_limit(command.get("limit"))

    rows: list[dict[str, Any]] = []
    total = 0
    display_transcription = (
        f"{query} සඳහා තවත් භාණ්ඩ පෙන්වන්න" if query else "තවත් භාණ්ඩ පෙන්වන්න"
    )

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
        rows = expanded[offset: offset + limit]

    elif intent == "buying_suggestions":
        expanded = await get_buying_suggestions(
            user_id,
            category_hint=category_hint,
            limit=min(offset + limit + 10, 100),
        )
        total = len(expanded)
        rows = expanded[offset: offset + limit]

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
    pagination = build_product_pagination(
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


async def handle_product_detail_command(
    command: dict[str, Any],
    *,
    language: str,
    session_id: str,
    started: float,
) -> VoiceChatResult:
    product_id = str(command.get("productId") or "").strip()
    product_name = str(command.get("productName") or "").strip()
    display_transcription = (
        f"{product_name} ගැන වැඩි විස්තර" if product_name else "Select product details"
    )

    if not product_id:
        response_text = "භාණ්ඩ විස්තර බලන්න product id එක හමු නොවුණා."
        latency_ms = int((time.perf_counter() - started) * 1000)
        return VoiceChatResult(
            success=True,
            transcription=display_transcription,
            response=response_text,
            language=language,
            sessionId=session_id,
            messages=[_message("user", display_transcription), _message("assistant", response_text)],
            model="product-detail",
            latencyMs=latency_ms,
            intent="product_search",
        )

    row = await get_product_details_by_id(product_id)
    if not row:
        response_text = "ඔබ තෝරාගත් භාණ්ඩයට අදාළ දත්ත හමු නොවුණා."
        latency_ms = int((time.perf_counter() - started) * 1000)
        return VoiceChatResult(
            success=True,
            transcription=display_transcription,
            response=response_text,
            language=language,
            sessionId=session_id,
            messages=[_message("user", display_transcription), _message("assistant", response_text)],
            model="product-detail",
            latencyMs=latency_ms,
            intent="product_search",
            entities={"productId": product_id},
        )

    response_text = _render_product_detail_response(row)
    latency_ms = int((time.perf_counter() - started) * 1000)
    return VoiceChatResult(
        success=True,
        transcription=display_transcription,
        response=response_text,
        language=language,
        sessionId=session_id,
        messages=[_message("user", display_transcription), _message("assistant", response_text)],
        model="product-detail",
        latencyMs=latency_ms,
        intent="product_search",
        entities={"productId": product_id, "product": row.get("name")},
        products=[row],
    )
