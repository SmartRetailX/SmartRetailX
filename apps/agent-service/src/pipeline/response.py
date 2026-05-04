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

import re
from typing import Any

from .resolver import ResolvedContext

_ORDER_STATUS_SI: dict[str, str] = {
    "pending": "පිළියෙළ කිරීමට නියමිතයි",
    "confirmed": "තහවුරු කළා",
    "processing": "සකස් කරමින්",
    "shipped": "යවා ඇත",
    "delivered": "ලැබී ඇත",
    "cancelled": "අවලංගු කළා",
}

_PURCHASE_FREQ_SI: dict[str, str] = {
    "high": "ජනප්‍රිය",
    "medium": "මධ්‍යම",
    "low": "දුර්ලභ",
}

_GENDER_SI: dict[str, str] = {
    "male": "පිරිමි",
    "female": "ගැහැනු",
    "other": "වෙනත්",
}

_SEGMENT_SI: dict[str, str] = {
    "premium": "ප්‍රීමියම්",
    "regular": "සාමාන්‍ය",
    "occasional": "කලාතුරකින්",
    "vip": "VIP",
    "new": "නව",
}

_SEGMENT_DESCRIPTION_SI: dict[str, str] = {
    "premium": (
        "ඔබ **ප්‍රීමියම් ගනුදෙනුකරු** කාණ්ඩයේ සිටිනවා. "
        "ඒ කියන්නේ ඔබ නිතරම ගුණාත්මක සේවාවක් ලබාගන්නා, "
        "SmartRetailX හි විශ්වාසවන්ත ගනුදෙනුකරු කෙනෙක්."
    ),
    "vip": (
        "ඔබ **VIP ගනුදෙනුකරු** කාණ්ඩයේ සිටිනවා — "
        "අපේ ශ්‍රේෂ්ඨතම පිරිසෙන් කෙනෙක්. "
        "ඔබට විශේෂ වරප්‍රසාද සහ exclusive offers හිමි වෙනවා."
    ),
    "regular": (
        "ඔබ **සාමාන්‍ය ගනුදෙනුකරු** කාණ්ඩයේ සිටිනවා. "
        "ඔබ SmartRetailX හි නිරන්තරව සිටිනා, "
        "ඉදිරියේදී loyalty tier upgrade කරගන්නට ඉඩ ඇත."
    ),
    "occasional": (
        "ඔබ **කලාතුරකින් ගනුදෙනු කරන** කාණ්ඩයේ සිටිනවා. "
        "ඔබේ ගනුදෙනු සංඛ්‍යාව වැඩිකළොත් premium tier එකට ළඟා වෙන්නට පුළුවන්."
    ),
    "new": (
        "ඔබ **නව ගනුදෙනුකරු** කෙනෙක්. "
        "SmartRetailX වලට සාදරයෙන් පිළිගනිමු! "
        "ඔබේ පළමු ගනුදෙනු ආරම්භ කරන්නට අපි සෑහෙන products offer කරනවා."
    ),
}

_PROMOTION_TYPE_SI: dict[str, str] = {
    "percentage": "ප්‍රතිශත වට්ටමක්",
    "flash_sale": "Flash Sale",
    "seasonal": "සෘතුමය ඉතිරිය",
    "clearance": "Clearance Sale",
    "bundle": "Bundle Deal",
    "buy_one_get_one": "Buy 1 Get 1",
    "buy_two_get_one": "Buy 2 Get 1",
    "three_for_two": "3 for 2",
}

_OFFER_TYPE_LABEL_SI: dict[str, str] = {
    "buy_one_get_one": "Buy 1 Get 1",
    "buy_two_get_one": "Buy 2 Get 1",
    "three_for_two": "3 for 2",
}


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def build_deterministic_response(ctx: ResolvedContext) -> str:
    """Produce a complete Sinhala Markdown response purely from DB data."""
    if ctx.needs_clarification and not ctx.has_data:
        return _with_xai(ctx.clarification_prompt_si or _generic_clarification(), ctx)

    renderers = {
        "prices": _render_prices,
        "product_search": _render_product_search,
        "offers": _render_offers,
        "order_history": _render_order_history,
        "buying_suggestions": _render_buying_suggestions,
        "user_profile": _render_user_profile,
        "promotions": _render_promotions,
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
    header = (
        f"### 💰 {product_name} – මිල ගණන්\n\n"
        if product_name
        else "### 💰 භාණ්ඩ මිල ගණන්\n\n"
    )
    return header + f"භාණ්ඩ {count}ක් හමු විය."


def _render_product_search(ctx: ResolvedContext) -> str:
    if not ctx.has_data:
        return ctx.clarification_prompt_si or _generic_clarification()

    query = ctx.entities.get("product", "")
    count = len(ctx.db_results)
    header = (
        f'### 🔍 "{query}" – සෙවීමේ ප්‍රතිඵල\n\n'
        if query
        else "### 🔍 භාණ්ඩ ලැයිස්තුව\n\n"
    )
    return header + f"ගැලපෙන භාණ්ඩ {count}ක් හමු විය."


def _render_offers(ctx: ResolvedContext) -> str:
    product_name = _normalize_entity_text(ctx.entities.get("product"))
    offer_type = str(ctx.entities.get("offer_type") or "")
    offer_label = _OFFER_TYPE_LABEL_SI.get(offer_type, "")

    if not ctx.has_data:
        if product_name:
            if offer_label:
                return (
                    f"දැනට **{product_name}** සඳහා **{offer_label}** offers නැත. "
                    "ළඟදීම නව offers එකතු වෙනවා!"
                )
            return (
                f"දැනට **{product_name}** වලට offers නැත. "
                "ළඟදීම නව offers එකතු වෙනවා!"
            )
        if offer_label:
            return (
                f"දැනට **{offer_label}** ආකාරයේ offers හමු නොවුණා. "
                "ළඟදීම නව offers එකතු වෙනවා. ටික වේලාවකට පසු නැවත උත්සාහ කරන්න."
            )
        return (
            "දැනට විශේෂ offers හමු නොවුණා. ටිකක් ඉවසන්න – ළඟදීම නව offers එකතු වෙනවා!"
        )

    count = len(ctx.db_results)
    heading = (
        f"### 🎉 {offer_label} Offers"
        if offer_label
        else "### 🎉 දැනට ඇති Offers & Featured Products"
    )
    return f"{heading}\n\nවිශේෂ offers සහිත භාණ්ඩ {count}ක් හමු විය."


def _render_order_history(ctx: ResolvedContext) -> str:
    if not ctx.has_data:
        return ctx.clarification_prompt_si or "ඔබගේ ඇණවුම් ඉතිහාසයක් හමු නොවුණා."

    last_only = bool(ctx.entities.get("last_order_only"))
    count = len(ctx.db_results)
    if last_only:
        heading = "### 📦 ඔබගේ අන්තිම ඇණවුම\n\n"
    else:
        heading = f"### 📦 ඔබගේ ඇණවුම් ඉතිහාසය\n\nමෑත ඇණවුම් **{count}ක්** හමු විය.\n\n"
    sections: list[str] = [heading]
    for order in ctx.db_results:
        raw_status = str(order.get("status", ""))
        status_si = _ORDER_STATUS_SI.get(raw_status, raw_status)
        created = str(order.get("created_at", ""))[:10]
        order_num = order.get("order_number", "N/A")

        status_emoji = {
            "pending": "⏳",
            "confirmed": "✅",
            "processing": "🔄",
            "shipped": "🚚",
            "delivered": "📬",
            "cancelled": "❌",
        }.get(raw_status, "📋")

        sections.append(
            f"#### {status_emoji} ඇණවුම් [#{order_num}](/orders)\n"
            f"**තත්ත්වය:** {status_si} &nbsp;|&nbsp; **දිනය:** {created}\n\n"
        )

        items: list[dict[str, Any]] = order.get("items", [])
        if items:
            sections.append(
                "| භාණ්ඩය | ප්‍රමාණය | එකක මිල (රු.) | එකතුව (රු.) |\n|---|:---:|---:|---:|\n"
            )
            for item in items:
                name = item.get("product_name", "-")
                if item.get("product_name_si"):
                    name += f" / {item['product_name_si']}"
                sections.append(
                    f"| {name} | {item['quantity']} "
                    f"| රු. {item['unit_price']:,.2f} "
                    f"| රු. {item['total_price']:,.2f} |\n"
                )

        total = float(order.get("total", 0))
        discount = float(order.get("discount", 0))
        tax = float(order.get("tax", 0))

        summary_parts = [f"**මුළු මුදල: රු. {total:,.2f}**"]
        if discount > 0:
            summary_parts.append(f"**වට්ටම: රු. {discount:,.2f}**")
        if tax > 0:
            summary_parts.append(f"බදු: රු. {tax:,.2f}")

        sections.append(f"\n> {' &nbsp;|&nbsp; '.join(summary_parts)}\n\n---\n\n")

    return "".join(sections)


def _render_buying_suggestions(ctx: ResolvedContext) -> str:
    if not ctx.has_data:
        return (
            "ඔබට ගැලපෙන භාණ්ඩ යෝජනා දෙන්නට මොහොතකට නොහැකි වුණා. "
            "Category නමක් කිවොත් නිශ්චිතව කියන්නම්."
        )

    source = str((ctx.db_results[0] or {}).get("recommendation_source", "bestsellers"))
    source_label = {
        "personalised": "ඔබේ ගැනුම් ඉතිහාසය මත",
        "category-match": "ඔබ ඉල්ලූ category එකෙන්",
        "bestsellers": "ජනප්‍රිය භාණ්ඩ",
    }.get(source, "යෝජිත භාණ්ඩ")

    count = len(ctx.db_results)
    return (
        f"### 🛍️ ඔබට නිර්දේශ – {source_label}\n\n"
        f"යෝජිත භාණ්ඩ {count}ක් හමු විය."
    )


def _render_user_profile(ctx: ResolvedContext) -> str:
    if not ctx.has_data or not ctx.db_results:
        return ctx.clarification_prompt_si or "ඔබගේ profile දත්ත හමු නොවුණා."

    p = ctx.db_results[0]

    name = str(p.get("name") or "")
    email = str(p.get("email") or "")
    city = str(p.get("city") or "")
    mobile = str(p.get("mobile_number") or "")
    gender = _GENDER_SI.get(str(p.get("gender") or "").lower(), "")
    age = p.get("age")
    segment = str(p.get("customer_segment") or "").lower()
    joined = str(p.get("joined_at") or "")[:10]
    total_orders = int(p.get("total_orders") or 0)
    total_spent = float(p.get("total_spent") or 0)
    last_order = (
        str(p.get("last_order_at") or "")[:10] if p.get("last_order_at") else None
    )

    segment_label = _SEGMENT_SI.get(
        segment, segment.capitalize() if segment else "නිර්ණය කර නැත"
    )
    segment_desc = _SEGMENT_DESCRIPTION_SI.get(segment, "")

    lines: list[str] = [f"### 👤 ඔබගේ Profile – {name}\n\n"]

    lines.append("#### 📋 පෞද්ගලික විස්තර\n\n")
    lines.append(f"| තොරතුරු | විස්තර |\n|---|---|\n")
    lines.append(f"| **නම** | {name} |\n")
    lines.append(f"| **විද්‍යුත් තැපෑල** | {email} |\n")
    if city:
        lines.append(f"| **නගරය** | {city} |\n")
    if mobile:
        lines.append(f"| **ජංගම දුරකථන** | {mobile} |\n")
    if gender:
        lines.append(f"| **ස්ත්‍රී/පුරුෂ භාවය** | {gender} |\n")
    if age:
        lines.append(f"| **වයස** | {age} |\n")
    lines.append(f"| **සාමාජික දිනය** | {joined} |\n")
    lines.append("\n")

    lines.append("#### 🛒 ගනුදෙනු සාරාංශය\n\n")
    lines.append(f"| | |\n|---|---|\n")
    lines.append(f"| **ඇණවුම් ගණන** | {total_orders} |\n")
    lines.append(f"| **මුළු වියදම** | රු. {total_spent:,.2f} |\n")
    if last_order:
        lines.append(f"| **අවසාන ඇණවුම** | {last_order} |\n")
    lines.append("\n")

    lines.append("#### 🏅 ගනුදෙනු කාණ්ඩය\n\n")
    lines.append(f"**{segment_label}**")
    if segment_desc:
        lines.append(f"\n\n{segment_desc}")
    lines.append("\n")

    return "".join(lines)


def _render_promotions(ctx: ResolvedContext) -> str:
    offer_type = str(ctx.entities.get("offer_type") or "")
    offer_label = _OFFER_TYPE_LABEL_SI.get(offer_type, "")

    if not ctx.has_data:
        if offer_label:
            return (
                f"දැනට **{offer_label}** ආකාරයේ promotions හමු නොවුණා. "
                "ළඟදීම නව promotions එකතු වෙනවා. ටික වේලාවකට පසු නැවත උත්සාහ කරන්න."
            )
        return (
            "දැනට සක්‍රිය promotions හමු නොවුණා. "
            "ළඟදීම නව offers හා promotions එකතු වෙනවා. ටික වේලාවකට පසු නැවත උත්සාහ කරන්න."
        )

    count = len(ctx.db_results)
    heading = (
        f"### 🎁 {offer_label} Promotions"
        if offer_label
        else "### 🎁 දැනට ක්‍රියාත්මක Promotions"
    )
    lines: list[str] = [
        f"{heading}\n\n"
        f"ඔබට ලැබිය හැකි **{count}ක්** promotions හමු විය!\n\n"
        "| භාණ්ඩය | Brand | වට්ටම | ආකාරය | අවසන් දිනය |\n"
        "|---|---|:---:|---|---|\n"
    ]

    for promo in ctx.db_results:
        product_name = str(promo.get("product_name") or "")
        product_name_si = str(promo.get("product_name_si") or "")
        name_display = (
            f"{product_name_si} / {product_name}" if product_name_si else product_name
        )

        brand = str(promo.get("brand") or "-")
        discount_pct = float(promo.get("discount_percentage") or 0)
        promo_type = str(promo.get("promotion_type") or "")
        promo_type_si = _PROMOTION_TYPE_SI.get(promo_type, promo_type)
        end_date = str(promo.get("end_date") or "")[:10]

        original_price = float(promo.get("original_price") or 0)
        discounted_price = original_price * (1 - discount_pct / 100)

        price_note = ""
        if original_price > 0:
            price_note = (
                f" ~~රු.{original_price:,.2f}~~ → **රු.{discounted_price:,.2f}**"
            )

        lines.append(
            f"| {name_display}{price_note} | {brand} | **{discount_pct:.0f}%** | {promo_type_si} | {end_date} |\n"
        )

    lines.append(
        "\n> 💡 **ඉක්මනින් ගන්න!** Promotions ගෙවී ගිය දිනට ස්වයංක්‍රීයව අවලංගු වෙනවා.\n"
    )
    return "".join(lines)


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

    product = _normalize_entity_text(ctx.entities.get("product")) if ctx.entities else ""
    category = str(ctx.entities.get("category") or "").strip() if ctx.entities else ""

    if product:
        reasons.append(
            f"ඔබ **{product}** ගැන අහපු නිසා ඒකට ගැලපෙන ප්‍රතිඵල සොයා පෙන්වුවා."
        )
    elif category:
        reasons.append(
            f"ඔබ ඉල්ලූ **{category}** category එකට ගැලපෙන දත්ත පාවිච්චි කළා."
        )
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
            reasons.append(
                f"මෙම පිළිතුර ඔබගේ ඇණවුම් **{count}ක්** පදනම් කරගෙන දීලා තියෙනවා."
            )
        elif ctx.intent == "promotions":
            reasons.append(f"සක්‍රිය promotions **{count}ක්** catalog එකෙන් ලබාගත්තා.")
        elif ctx.intent == "user_profile":
            reasons.append(
                "ඔබගේ account දත්ත ආරක්ෂිතව ලබාගෙන profile සාරාංශය සකස් කළා."
            )
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
        return (
            "ඔබ offers ගැන අහපු නිසා discount සහ ගනුදෙනු දත්ත බලලා ප්‍රතිඵල තෝරාගත්තා."
        )
    if intent == "order_history":
        return "ඔබගේ ඉල්ලීම අනුව ඔබට අදාළ ඇණවුම් ඉතිහාස දත්ත භාවිත කළා."
    if intent == "buying_suggestions":
        return "ඔබට ගැලපෙන නිර්දේශ දෙන්න ගැනුම් රටාව සහ භාණ්ඩ තොරතුරු භාවිත කළා."
    if intent == "user_profile":
        return "ඔබ profile ගැන අහපු නිසා ඔබගේ ගිණුම් දත්ත ආරක්ෂිතව ලබාගෙන සාරාංශ කළා."
    if intent == "promotions":
        return "ඔයා promotions ගැන අහපු නිසා, දැනට තියෙන promotions catalog එකෙන් මම විස්තර ටික ගත්තා."
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
    if db_source == "db-profile":
        return "දත්ත මූලාශ්‍රය ලෙස ඔබගේ **account profile** දත්ත භාවිතා කළා."
    if db_source == "db-promotions":
        return "දත්ත මූලාශ්‍රය ලෙස **promotions** catalog දත්ත භාවිතා කළා."
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
    return "ප්‍රශ්නය පැහැදිලියි, හැබැයි ඒ ගැන තව විස්තර ටිකක් දෙනවා නම් මට වඩාත් නිවැරදිව උදව් කරන්න පුළුවන්."


def _normalize_entity_text(value: Any) -> str:
    text = re.sub(r"\s+", " ", str(value or "")).strip()
    if not text:
        return ""
    # Trim common markdown/control wrappers to avoid placeholder-like output.
    text = text.strip("*`_~|[](){}<>")
    if not re.search(r"[A-Za-z0-9඀-෿]", text):
        return ""
    return text


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
