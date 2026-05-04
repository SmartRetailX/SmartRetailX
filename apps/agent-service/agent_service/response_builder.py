"""
Response builder: converts ResolvedContext → structured Markdown Sinhala response.

Responsibilities:
  - Render DB result data as GitHub-flavoured Markdown tables / bullet lists
  - Append a concise XAI explanation block so users understand *why* the
    assistant answered the way it did (explainability requirement)
  - Produce a complete, ready-to-display Sinhala string without calling any
    external service (deterministic fallback path)
  - Expose a context summary dict for the LLM prompt so the LLM can enrich
    the response with natural-language fluency while staying grounded in
    the DB data
"""

from __future__ import annotations

from typing import Any

from .intent_resolver import ResolvedContext

# Sinhala order status labels
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
    """
    Produce a complete Sinhala Markdown response purely from DB data.
    Used when the LLM is unavailable or the intent is DB-only.
    """
    if ctx.needs_clarification and not ctx.has_data:
        return _with_xai(ctx.clarification_prompt_si or _generic_clarification(), ctx)

    if ctx.intent == "prices":
        return _with_xai(_render_prices(ctx), ctx)

    if ctx.intent == "product_search":
        return _with_xai(_render_product_search(ctx), ctx)

    if ctx.intent == "offers":
        return _with_xai(_render_offers(ctx), ctx)

    if ctx.intent == "order_history":
        return _with_xai(_render_order_history(ctx), ctx)

    if ctx.intent == "buying_suggestions":
        return _with_xai(_render_buying_suggestions(ctx), ctx)

    return _with_xai(
        "ඔබගේ ප්‍රශ්නය ලැබුණා. ටිකක් වැඩි විස්තරයක් දුන්නොත් "
        "මම නිවැරදිව උත්තර දෙන්නම්.",
        ctx,
    )


def build_llm_context_summary(ctx: ResolvedContext) -> str:
    """
    Return a compact, LLM-readable summary of the DB results and XAI data.
    This is injected into the LLM system/user prompt so the model stays
    grounded in real data rather than hallucinating.
    """
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
    header = f"### 💰 {product_name} – මිල ගණන්\n\n" if product_name else "### 💰 භාණ්ඩ මිල ගණන්\n\n"

    rows = ctx.db_results
    if len(rows) == 1:
        p = rows[0]
        stock_label = "✅ ඇත" if (p.get("stock_quantity") or 0) > 0 else "❌ නැත"
        return (
            header
            + f"**{p['name']}**"
            + (f" / {p['name_si']}" if p.get("name_si") else "")
            + "\n\n"
            + f"| | |\n|---|---|\n"
            + f"| මිල | **රු. {p['price']:.2f}** |\n"
            + f"| ස්ටොක් | {stock_label} ({p.get('stock_quantity', 0)} units) |\n"
            + f"| Brand | {p.get('brand', '-')} |\n"
            + f"| Category | {p.get('category', '-')} |\n"
        )

    # Multiple results → table
    table = (
        header
        + "| භාණ්ඩය | Category | මිල (රු.) | ස්ටොක් |\n"
        + "|---|---|---|---|\n"
    )
    for p in rows:
        stock = "✅" if (p.get("stock_quantity") or 0) > 0 else "❌"
        name = p["name"] + (f" / {p['name_si']}" if p.get("name_si") else "")
        table += f"| {name} | {p.get('category', '-')} | {p['price']:.2f} | {stock} |\n"
    return table


def _render_product_search(ctx: ResolvedContext) -> str:
    if not ctx.has_data:
        return ctx.clarification_prompt_si or _generic_clarification()

    query = ctx.entities.get("product", "")
    header = (
        f"### 🔍 \"{query}\" – සෙවීමේ ප්‍රතිඵල\n\n"
        if query else
        "### 🔍 භාණ්ඩ ලැයිස්තුව\n\n"
    )

    table = (
        header
        + "| භාණ්ඩය | Category | මිල (රු.) | ස්ටොක් | Brand |\n"
        + "|---|---|---|---|---|\n"
    )
    for p in ctx.db_results:
        stock = "✅" if (p.get("stock_quantity") or 0) > 0 else "❌"
        name = p["name"] + (f" / {p['name_si']}" if p.get("name_si") else "")
        table += (
            f"| {name} | {p.get('category', '-')} "
            f"| {p['price']:.2f} | {stock} | {p.get('brand', '-')} |\n"
        )
    return table


def _render_offers(ctx: ResolvedContext) -> str:
    if not ctx.has_data:
        return "දැනට විශේෂ offers හමු නොවුණා. ටිකක් ඉවසන්න – ළඟදීම නව offers එකතු වෙනවා!"

    header = "### 🎉 දැනට ඇති Offers & Featured Products\n\n"
    table = (
        header
        + "| භාණ්ඩය | Category | මිල (රු.) | Brand |\n"
        + "|---|---|---|---|\n"
    )
    for p in ctx.db_results:
        name = p["name"] + (f" / {p['name_si']}" if p.get("name_si") else "")
        discount = p.get("avg_discount")
        discount_str = f" (රු. {discount:.2f} discount)" if discount and discount > 0 else ""
        table += (
            f"| {name}{discount_str} | {p.get('category', '-')} "
            f"| {p['price']:.2f} | {p.get('brand', '-')} |\n"
        )
    return table


def _render_order_history(ctx: ResolvedContext) -> str:
    if not ctx.has_data:
        return ctx.clarification_prompt_si or "ඔබගේ ඇණවුම් ඉතිහාසයක් හමු නොවුණා."

    header = "### 📦 ඔබගේ ඇණවුම් ඉතිහාසය\n\n"
    sections: list[str] = [header]

    for order in ctx.db_results:
        status_si = _ORDER_STATUS_SI.get(str(order.get("status", "")), str(order.get("status", "")))
        created = str(order.get("created_at", ""))[:10]
        sections.append(
            f"#### ඇණවුම #{order['order_number']}  "
            f"&nbsp; `{status_si}` &nbsp; _{created}_\n\n"
        )

        items: list[dict] = order.get("items", [])
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

        sections.append(
            f"\n> **මුළු මුදල:** රු. {order['total']:.2f}"
            + (f" &nbsp;|&nbsp; **Discount:** රු. {order['discount']:.2f}" if order.get("discount", 0) > 0 else "")
            + "\n\n---\n\n"
        )

    return "".join(sections)


def _render_buying_suggestions(ctx: ResolvedContext) -> str:
    if not ctx.has_data:
        return (
            "ඔබට ගැලපෙන භාණ්ඩ යෝජනා දෙන්නට මොහොතකට නොහැකි වුණා. "
            "Category නමක් කිවොත් නිශ්චිතව කියන්නම්."
        )

    source_label = {
        "personalised":  "ඔබේ ගැනුම් ඉතිහාසය මත",
        "category-match": "ඔබ ඉල්ලූ category එකෙන්",
        "bestsellers":   "ජනප්‍රිය භාණ්ඩ",
    }.get(
        str((ctx.db_results[0] or {}).get("recommendation_source", "bestsellers")),
        "යෝජිත භාණ්ඩ",
    )

    header = f"### 🛍️ ඔබට නිර්දේශ – {source_label}\n\n"
    table = (
        header
        + "| භාණ්ඩය | Category | මිල (රු.) | ජනප්‍රියතාව |\n"
        + "|---|---|---|---|\n"
    )
    for p in ctx.db_results:
        name = p["name"] + (f" / {p['name_si']}" if p.get("name_si") else "")
        freq = _PURCHASE_FREQ_SI.get(str(p.get("purchase_frequency", "")), "-")
        table += (
            f"| {name} | {p.get('category', '-')} "
            f"| {p['price']:.2f} | {freq} |\n"
        )
    return table


# ---------------------------------------------------------------------------
# XAI block
# ---------------------------------------------------------------------------

def _with_xai(body: str, ctx: ResolvedContext) -> str:
    """Append a short, user-readable XAI explanation after the main body."""
    if not ctx.xai_features:
        return body

    lines = ["\n\n---\n\n**🔍 මෙම පිළිතුර ලැබුණේ ඇයි?**\n"]
    for feat in ctx.xai_features[:3]:
        name = feat.get("name", "")
        evidence = feat.get("evidence", "")
        weight = feat.get("weight")
        weight_str = f" ({weight:.2f})" if isinstance(weight, (int, float)) else ""
        evidence_str = f" – _{evidence}_" if evidence else ""
        lines.append(f"- **{name}**{weight_str}{evidence_str}")

    return body + "\n".join(lines)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _generic_clarification() -> str:
    return (
        "ඔබගේ ප්‍රශ්නය ලැබුණා. ටිකක් වැඩි විස්තරයක් දුන්නොත් "
        "මම නිවැරදිව උත්තර දෙන්නම්."
    )


def _compact_row(row: dict[str, Any]) -> str:
    """Single-line summary of a DB row for LLM context injection."""
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
