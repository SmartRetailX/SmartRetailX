"""
Response builder: ResolvedContext → structured Sinhala Markdown.

Responsibilities:
  - Render DB results as GitHub-flavoured Markdown tables / bullet lists.
  - Append a concise XAI explanation block (explainability requirement).
  - Produce a complete, ready-to-display response without any external calls.
  - Expose a compact context summary for the LLM prompt so the model stays
    grounded in real data and cannot hallucinate.
"""

from __future__ import annotations

from typing import Any

from .resolver import ResolvedContext

_ORDER_STATUS_SI: dict[str, str] = {
    "pending":    "බලාපොරොත්තු",
    "confirmed":  "තහවුරු",
    "processing": "සකස් කරමින්",
    "shipped":    "යවා ඇත",
    "delivered":  "ලැබුණා",
    "cancelled":  "අවලංගු",
}

_PURCHASE_FREQ_SI: dict[str, str] = {
    "high":   "ජනප්‍රිය",
    "medium": "මධ්‍යම",
    "low":    "දුර්ලභ",
}


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def build_deterministic_response(ctx: ResolvedContext) -> str:
    """Produce a complete Sinhala Markdown response purely from DB data."""
    if ctx.needs_clarification and not ctx.has_data:
        return _with_xai(ctx.clarification_prompt_si or _generic_clarification(), ctx)

    renderers = {
        "prices":            _render_prices,
        "product_search":    _render_product_search,
        "offers":            _render_offers,
        "order_history":     _render_order_history,
        "buying_suggestions": _render_buying_suggestions,
    }
    renderer = renderers.get(ctx.intent)
    if renderer:
        return _with_xai(renderer(ctx), ctx)

    return _with_xai(
        "ඔබගේ ප්‍රශ්නය ලැබුණා. ටිකක් වැඩි විස්තරයක් දුන්නොත් "
        "මම නිවැරදිව උත්තර දෙන්නම්.",
        ctx,
    )


def build_llm_context_summary(ctx: ResolvedContext) -> str:
    """Compact LLM-readable summary of DB results and XAI data."""
    lines: list[str] = [
        f"[DB Source: {ctx.db_source}]",
        f"[Intent: {ctx.intent}]",
        f"[Has Data: {ctx.has_data}]",
    ]
    if ctx.entities:
        lines.append(f"[Entities: {ctx.entities}]")
    if ctx.needs_clarification:
        lines.append(f"[Needs clarification: {ctx.clarification_prompt_si}]")
    if ctx.xai_features:
        feat_strs = [
            f"{f['name']} (weight={f.get('weight', '?')}, evidence={f.get('evidence', '')})"
            for f in ctx.xai_features
        ]
        lines.append(f"[XAI features: {'; '.join(feat_strs)}]")
    if ctx.db_results:
        lines.append(f"\n--- DB Results ({len(ctx.db_results)} rows) ---")
        for i, row in enumerate(ctx.db_results[:10], 1):
            lines.append(f"Row {i}: {_compact_row(row)}")

    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Per-intent renderers
# ---------------------------------------------------------------------------

def _render_prices(ctx: ResolvedContext) -> str:
    if not ctx.has_data:
        return ctx.clarification_prompt_si or _generic_clarification()

    product_name = ctx.entities.get("product", "")
    count = len(ctx.db_results)
    header = f"### 💰 {product_name} – මිල ගණන්\n\n" if product_name else "### 💰 භාණ්ඩ මිල ගණන්\n\n"
    # Product cards are rendered by the frontend UI — just emit the header + count summary
    return header + f"භාණ්ඩ {count}ක් හමු විය. පහත කාඩ්ස් බලන්න."


def _render_product_search(ctx: ResolvedContext) -> str:
    if not ctx.has_data:
        return ctx.clarification_prompt_si or _generic_clarification()

    query = ctx.entities.get("product", "")
    count = len(ctx.db_results)
    header = (
        f"### 🔍 \"{query}\" – සෙවීමේ ප්‍රතිඵල\n\n" if query
        else "### 🔍 භාණ්ඩ ලැයිස්තුව\n\n"
    )
    return header + f"ගැලපෙන භාණ්ඩ {count}ක් හමු විය. පහත කාඩ්ස් බලන්න."


def _render_offers(ctx: ResolvedContext) -> str:
    if not ctx.has_data:
        return "දැනට විශේෂ offers හමු නොවුණා. ටිකක් ඉවසන්න – ළඟදීම නව offers එකතු වෙනවා!"

    count = len(ctx.db_results)
    return f"### 🎉 දැනට ඇති Offers & Featured Products\n\nවිශේෂ offers සහිත භාණ්ඩ {count}ක් හමු විය. පහත කාඩ්ස් බලන්න."


def _render_order_history(ctx: ResolvedContext) -> str:
    if not ctx.has_data:
        return ctx.clarification_prompt_si or "ඔබගේ ඇණවුම් ඉතිහාසයක් හමු නොවුණා."

    sections: list[str] = ["### 📦 ඔබගේ ඇණවුම් ඉතිහාසය\n\n"]
    for order in ctx.db_results:
        status_si = _ORDER_STATUS_SI.get(str(order.get("status", "")), str(order.get("status", "")))
        created = str(order.get("created_at", ""))[:10]
        sections.append(f"#### ඇණවුම #{order['order_number']}  &nbsp; `{status_si}` &nbsp; _{created}_\n\n")

        items: list[dict[str, Any]] = order.get("items", [])
        if items:
            sections.append("| භාණ්ඩය | ප්‍රමාණය | එකක මිල | එකතුව |\n|---|---|---|---|\n")
            for item in items:
                name = item.get("product_name", "-")
                if item.get("product_name_si"):
                    name += f" / {item['product_name_si']}"
                sections.append(
                    f"| {name} | {item['quantity']} "
                    f"| රු. {item['unit_price']:.2f} "
                    f"| රු. {item['total_price']:.2f} |\n"
                )

        total_line = f"\n> **මුළු මුදල:** රු. {order['total']:.2f}"
        if order.get("discount", 0) > 0:
            total_line += f" &nbsp;|&nbsp; **Discount:** රු. {order['discount']:.2f}"
        sections.append(total_line + "\n\n---\n\n")

    return "".join(sections)


def _render_buying_suggestions(ctx: ResolvedContext) -> str:
    if not ctx.has_data:
        return (
            "ඔබට ගැලපෙන භාණ්ඩ යෝජනා දෙන්නට මොහොතකට නොහැකි වුණා. "
            "Category නමක් කිවොත් නිශ්චිතව කියන්නම්."
        )

    source = str((ctx.db_results[0] or {}).get("recommendation_source", "bestsellers"))
    source_label = {
        "personalised":   "ඔබේ ගැනුම් ඉතිහාසය මත",
        "category-match": "ඔබ ඉල්ලූ category එකෙන්",
        "bestsellers":    "ජනප්‍රිය භාණ්ඩ",
    }.get(source, "යෝජිත භාණ්ඩ")

    count = len(ctx.db_results)
    return (
        f"### 🛍️ ඔබට නිර්දේශ – {source_label}\n\n"
        f"යෝජිත භාණ්ඩ {count}ක් හමු විය. පහත කාඩ්ස් බලන්න."
    )


# ---------------------------------------------------------------------------
# XAI block
# ---------------------------------------------------------------------------

def _with_xai(body: str, ctx: ResolvedContext) -> str:
    if not ctx.xai_features and not ctx.entities and not ctx.db_source:
        return body

    lines = ["\n\n---\n\n**🔍 මෙම ප්‍රතිඵල පෙන්වූයේ ඇයි?**\n"]
    reason_lines = _build_user_friendly_reasons(ctx)
    for reason in reason_lines:
        lines.append(f"- {reason}")

    return body + "\n".join(lines)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _build_user_friendly_reasons(ctx: ResolvedContext) -> list[str]:
    reasons: list[str] = []

    product = str(ctx.entities.get("product") or "").strip() if ctx.entities else ""
    category = str(ctx.entities.get("category") or "").strip() if ctx.entities else ""

    if product:
        reasons.append(f"ඔබ **{product}** ගැන අහපු නිසා ඒකට ගැලපෙන ප්‍රතිඵල සොයා පෙන්වුවා.")
    elif category:
        reasons.append(f"ඔබ ඉල්ලූ **{category}** category එකට ගැලපෙන දත්ත පාවිච්චි කළා.")
    else:
        reasons.append(_intent_reason(ctx.intent))

    source = _db_source_reason(ctx.db_source)
    if source:
        reasons.append(source)

    feature_reason = _feature_reason(ctx.xai_features)
    if feature_reason:
        reasons.append(feature_reason)

    if ctx.has_data:
        count = len(ctx.db_results)
        if ctx.intent in {"prices", "product_search", "offers", "buying_suggestions"}:
            reasons.append(f"මෙම පිළිතුර අදාළ භාණ්ඩ **{count}ක්** මත ගොඩනැගුණා.")
        elif ctx.intent == "order_history":
            reasons.append(f"මෙම පිළිතුර ඔබගේ ඇණවුම් **{count}ක්** පදනම් කරගෙන දීලා තියෙනවා.")
    elif ctx.needs_clarification:
        reasons.append("නිවැරදි ප්‍රතිඵල දෙන්න තව ටිකක් පැහැදිලි විස්තර අවශ්‍ය වුණා.")

    # Keep the block concise and non-repetitive.
    deduped: list[str] = []
    seen: set[str] = set()
    for item in reasons:
        cleaned = item.strip()
        if not cleaned or cleaned in seen:
            continue
        seen.add(cleaned)
        deduped.append(cleaned)
        if len(deduped) >= 3:
            break

    return deduped


def _intent_reason(intent: str) -> str:
    if intent == "prices":
        return "ඔබ මිල ගැන අහපු නිසා catalog දත්තෙන් අදාළ මිල ප්‍රතිඵල තෝරාගත්තා."
    if intent == "product_search":
        return "ඔබ භාණ්ඩ සෙවුමක් කළ නිසා නම/brand/category ගැලපීම් අනුව ප්‍රතිඵල තෝරාගත්තා."
    if intent == "offers":
        return "ඔබ offers ගැන අහපු නිසා discount සහ ගනුදෙනු දත්ත බලලා ප්‍රතිඵල තෝරාගත්තා."
    if intent == "order_history":
        return "ඔබගේ ඉල්ලීම අනුව ඔබට අදාළ ඇණවුම් ඉතිහාස දත්ත භාවිත කළා."
    if intent == "buying_suggestions":
        return "ඔබට ගැලපෙන නිර්දේශ දෙන්න ගැනුම් රටාව සහ භාණ්ඩ තොරතුරු භාවිත කළා."
    return "ඔබගේ ප්‍රශ්නයේ අර්ථය අනුව ගැලපෙන දත්ත තෝරාගෙන පිළිතුර සකස් කළා."


def _db_source_reason(db_source: str) -> str:
    if db_source == "db-catalog":
        return "දත්ත මූලාශ්‍රය ලෙස **catalog** භාවිතා කළා."
    if db_source == "db-offers":
        return "දත්ත මූලාශ්‍රය ලෙස **offers** සහ discount දත්ත භාවිතා කළා."
    if db_source == "db-order":
        return "දත්ත මූලාශ්‍රය ලෙස ඔබගේ **order history** භාවිතා කළා."
    if db_source == "db-recommendation":
        return "දත්ත මූලාශ්‍රය ලෙස **recommendation** engine එකේ දත්ත භාවිතා කළා."
    return ""


def _feature_reason(features: list[dict[str, Any]]) -> str:
    if not features:
        return ""

    top = features[0] if features else {}
    name = str(top.get("name") or "").strip()
    evidence = str(top.get("evidence") or "").strip()

    if name and evidence:
        return f"ඔබගේ ඉල්ලීමේ ප්‍රධාන සංඥාව ලෙස **{name}** ({evidence}) හඳුනාගත්තා."
    if name:
        return f"ඔබගේ ඉල්ලීමෙන් **{name}** ප්‍රධාන අදහසක් ලෙස හඳුනාගත්තා."
    if evidence:
        return f"ඔබ දුන් **{evidence}** වචන/තොරතුරු පදනම් කරගෙන ප්‍රතිඵල තෝරාගත්තා."
    return ""


def _generic_clarification() -> str:
    return "ඔබගේ ප්‍රශ්නය ලැබුණා. ටිකක් වැඩි විස්තරයක් දුන්නොත් මම නිවැරදිව උත්තර දෙන්නම්."


def _compact_row(row: dict[str, Any]) -> str:
    skip = {"product_id", "image_url", "description", "descriptionSi"}
    parts = []
    for k, v in row.items():
        if k in skip or v is None:
            continue
        if isinstance(v, float):
            parts.append(f"{k}={v:.2f}")
        elif isinstance(v, list):
            parts.append(f"{k}=[{len(v)} items]")
        else:
            parts.append(f"{k}={v!r}")
    return ", ".join(parts)
