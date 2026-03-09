"""
Campaign generation & product listing API routes.
"""

import os
import sys
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from api.database import save_campaign, get_campaigns, get_campaign_by_id, save_customer_promotions

router = APIRouter()


# ── Request / Response Models ──────────────────────────────

class GenerateCampaignRequest(BaseModel):
    productId: str
    discountPercent: float = 10.0
    maxCustomers: int = 50


# ── XAI helper ─────────────────────────────────────────────

# Human-readable labels and display format for each feature.
# (feature_col, label, format_str, lower_is_better)
_XAI_FEATURES = [
    ('customer_purchase_frequency',  'Purchase Frequency',   '{:.0f} purchases',          False),
    ('customer_avg_transaction',     'Avg. Spend',           'Rs. {:.0f} per transaction', False),
    ('customer_recency',             'Recency',              '{:.0f} days since last buy',  True),   # lower = more recent = better
    ('customer_promo_response_rate', 'Promo Response Rate',  '{:.0%} response rate',        False),
    ('category_affinity',            'Category Affinity',    '{:.2f} affinity score',       False),
    ('category_purchase_count',      'Category Purchases',   '{:.0f} purchases here',       False),
]


def _build_xai_reasons(targets_df, purchase_model, top_k: int = 3):
    """
    Compute per-customer XAI explanations using:
        contribution = feature_importance × z_score

    A positive contribution means the customer is above-average on an
    important feature (or below-average on a lower-is-better feature),
    which pushes their purchase probability higher.

    Returns: dict  { customer_id -> list[{feature, label, formattedValue, strength}] }
    """
    if purchase_model is None or purchase_model.feature_importance is None:
        return {}

    # Build importance lookup  {feature: importance_value}
    fi = dict(zip(
        purchase_model.feature_importance['feature'],
        purchase_model.feature_importance['importance'],
    ))

    # Population stats across the targeted set (their peer group)
    pop_stats = {}
    for feat, *_ in _XAI_FEATURES:
        if feat not in targets_df.columns:
            continue
        std = targets_df[feat].std()
        pop_stats[feat] = {
            'mean': float(targets_df[feat].mean()),
            'std': float(std) if std > 1e-6 else 1.0,
        }

    result = {}
    for _, row in targets_df.iterrows():
        reasons = []
        for feat, label, fmt, lower_is_better in _XAI_FEATURES:
            if feat not in pop_stats:
                continue
            importance = fi.get(feat, 0.0)
            if importance < 0.03:
                continue  # Skip near-zero importance features
            value = float(row.get(feat, 0))
            z = (value - pop_stats[feat]['mean']) / pop_stats[feat]['std']
            if lower_is_better:
                z = -z
            contribution = importance * z
            reasons.append({
                'feature': feat,
                'label': label,
                'formattedValue': fmt.format(value),
                'contribution': round(float(contribution), 4),
                'importance': round(float(importance), 4),
            })

        # Sort by contribution descending, keep top positive ones
        reasons.sort(key=lambda x: x['contribution'], reverse=True)
        top = [r for r in reasons if r['contribution'] > 0][:top_k]
        if not top:
            top = reasons[:top_k]  # Fallback: just show highest importance

        # Normalise to 0-1 strength for frontend progress bars
        max_c = max((abs(r['contribution']) for r in top), default=1.0) or 1.0
        for r in top:
            r['strength'] = round(min(abs(r['contribution']) / max_c, 1.0), 3)

        result[str(row['CustomerID'])] = top

    return result


class XaiReason(BaseModel):
    feature: str
    label: str
    formattedValue: str
    contribution: float
    importance: float
    strength: float   # 0-1, for frontend progress bar


class CustomerTarget(BaseModel):
    customerId: str
    customerName: str
    location: str
    segment: str
    purchaseProbability: float
    cfScore: float
    hybridScore: float
    targetingMethod: str
    reasons: list[XaiReason] = []


class CampaignSummary(BaseModel):
    productId: str
    productName: str
    productCategory: str
    productPrice: float
    discountPercent: float
    totalTargeted: int
    avgPurchaseProbability: float
    expectedConversions: int
    expectedRevenue: float
    expectedCost: float
    expectedProfit: float
    costSavingsVsBroadcast: float


class GenerateCampaignResponse(BaseModel):
    success: bool
    campaign: CampaignSummary
    targets: list[CustomerTarget]


class ProductItem(BaseModel):
    id: str
    name: str
    category: str
    price: float


class ProductListResponse(BaseModel):
    success: bool
    products: list[ProductItem]
    total: int


# ── Helper ─────────────────────────────────────────────────

def _get_state():
    from api.main import app_state
    if not app_state["ready"]:
        raise HTTPException(503, "Models not loaded yet. Please wait.")
    return app_state["engine"], app_state["preprocessor"]


# ── Routes ─────────────────────────────────────────────────

@router.get("/products", response_model=ProductListResponse)
async def list_products(category: Optional[str] = None, limit: int = 100):
    """List products available for promotion campaigns."""
    _, preprocessor = _get_state()
    df = preprocessor.products.copy()

    if category:
        df = df[df['Category'] == category]
    df = df.head(limit)

    products = [
        ProductItem(
            id=str(row['ProductID']),
            name=row['ProductName'],
            category=row['Category'],
            price=float(row['Price']),
        )
        for _, row in df.iterrows()
    ]
    return ProductListResponse(success=True, products=products, total=len(products))


@router.get("/products/categories")
async def list_categories():
    """List available product categories."""
    _, preprocessor = _get_state()
    categories = sorted(preprocessor.products['Category'].unique().tolist())
    return {"success": True, "categories": categories}


@router.get("/products/{product_id}/bundles")
async def get_product_bundles(product_id: str, min_support: float = 0.05, limit: int = 6):
    """
    Market basket analysis: products frequently bought together with product_id.
    Uses the trained Collaborative Filtering model's co-purchase counts.
    """
    engine, preprocessor = _get_state()

    if engine.cf_model is None:
        raise HTTPException(503, "CF model not loaded")

    # Validate product exists
    products_df = preprocessor.products
    product_row = products_df[products_df['ProductID'].astype(str) == str(product_id)]
    if product_row.empty:
        raise HTTPException(404, f"Product '{product_id}' not found")

    co_purchased = engine.cf_model.find_co_purchased_products(
        product_id, min_support=min_support
    )

    # Enrich with product metadata
    bundles = []
    for item in co_purchased[:limit]:
        pid = str(item["ProductID"])
        meta = products_df[products_df['ProductID'].astype(str) == pid]
        if meta.empty:
            continue
        row = meta.iloc[0]
        bundles.append({
            "productId": pid,
            "productName": str(row["ProductName"]),
            "category": str(row["Category"]),
            "price": float(row["Price"]),
            "coPurchaseCount": int(item["co_purchase_count"]),
            "support": round(float(item["support"]) * 100, 1),  # as %
        })

    anchor = product_row.iloc[0]
    return {
        "success": True,
        "productId": product_id,
        "productName": str(anchor["ProductName"]),
        "totalBuyers": len(bundles),
        "bundles": bundles,
    }


@router.post("/campaigns/generate", response_model=GenerateCampaignResponse)
async def generate_campaign(request: GenerateCampaignRequest):
    """
    Generate a personalized promotion campaign.
    Uses CF + Random Forest hybrid pipeline to find the best customers.
    """
    engine, preprocessor = _get_state()

    # Validate product
    product_df = preprocessor.products[
        preprocessor.products['ProductID'] == request.productId
    ]
    if len(product_df) == 0:
        raise HTTPException(404, f"Product {request.productId} not found")

    product = product_df.iloc[0]

    try:
        # Run the ML pipeline
        targets_df = engine.generate_promotion_targets(
            request.productId, top_n=request.maxCustomers
        )

        if targets_df is None or len(targets_df) == 0:
            raise HTTPException(404, "No suitable customers found for this product.")

        # Build response
        xai_map = _build_xai_reasons(targets_df, engine.purchase_model)
        target_list = []
        for _, row in targets_df.iterrows():
            cid = row['CustomerID']
            cust = preprocessor.customers[preprocessor.customers['CustomerID'] == cid]

            target_list.append(CustomerTarget(
                customerId=str(cid),
                customerName=str(cust.iloc[0]['Name']) if len(cust) > 0 else 'Unknown',
                location=str(cust.iloc[0].get('Location', 'Unknown')) if len(cust) > 0 else 'Unknown',
                segment=str(cust.iloc[0].get('CustomerSegment', 'Unknown')) if len(cust) > 0 else 'Unknown',
                purchaseProbability=float(row.get('purchase_probability', 0)),
                cfScore=float(row.get('cf_score', 0)),
                hybridScore=float(row.get('hybrid_score', 0)),
                targetingMethod=str(row.get('targeting_method', 'hybrid')),
                reasons=xai_map.get(str(cid), []),
            ))

        # Campaign stats
        total = len(target_list)
        avg_prob = sum(t.purchaseProbability for t in target_list) / max(total, 1)
        expected_conv = int(total * avg_prob)
        discount_amt = float(product['Price']) * (request.discountPercent / 100)
        exp_revenue = expected_conv * float(product['Price'])
        exp_cost = expected_conv * discount_amt
        exp_profit = exp_revenue - exp_cost
        broadcast_cost = len(preprocessor.customers) * discount_amt * 0.1
        savings = max(0, broadcast_cost - exp_cost)

        summary = CampaignSummary(
            productId=request.productId,
            productName=product['ProductName'],
            productCategory=product['Category'],
            productPrice=float(product['Price']),
            discountPercent=request.discountPercent,
            totalTargeted=total,
            avgPurchaseProbability=round(avg_prob, 4),
            expectedConversions=expected_conv,
            expectedRevenue=round(exp_revenue, 2),
            expectedCost=round(exp_cost, 2),
            expectedProfit=round(exp_profit, 2),
            costSavingsVsBroadcast=round(savings, 2),
        )

        # Persist campaign to database and fan-out per-customer notifications
        try:
            campaign_id = save_campaign(
                campaign_data=summary.model_dump(),
                targets_list=[t.model_dump() for t in target_list],
            )
            save_customer_promotions(
                campaign_id=campaign_id,
                campaign_data=summary.model_dump(),
                targets_list=[t.model_dump() for t in target_list],
            )
        except Exception as db_err:
            print(f"[WARN] Could not save campaign to DB: {db_err}")

        return GenerateCampaignResponse(
            success=True, campaign=summary, targets=target_list
        )

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(500, f"Campaign generation failed: {str(e)}")


# ── A/B Test Comparison ────────────────────────────────────

class CompareRequest(BaseModel):
    productId: str
    personalizedDiscount: float = 10.0
    broadcastDiscount: float = 15.0
    maxCustomers: int = 100


@router.post("/campaigns/compare")
async def compare_campaigns(request: CompareRequest):
    """
    Compare personalized ML-targeted campaign vs broadcast to all customers.
    Returns side-by-side metrics to demonstrate research thesis.
    """
    engine, preprocessor = _get_state()

    product_df = preprocessor.products[
        preprocessor.products['ProductID'] == request.productId
    ]
    if len(product_df) == 0:
        raise HTTPException(404, f"Product '{request.productId}' not found")

    product = product_df.iloc[0]
    price = float(product['Price'])

    try:
        total_customers = int(len(preprocessor.customers))

        # Score ALL eligible customers with the ML pipeline in one pass.
        # Using a very large top_n returns every customer the CF+ML pipeline
        # considers eligible (above the dynamic percentile threshold).
        # This is the single source of truth for BOTH arms of the test:
        #   - Personalized  = top maxCustomers customers by hybrid score
        #   - Broadcast     = population-level average probability across all
        #                     eligible customers (non-eligible contribute ~0)
        #
        # This avoids the historical-cumulative-rate bug where _calculate_
        # historical_conversion_rate() returned 88%+ for common categories
        # by counting lifetime unique buyers, not per-campaign conversions.
        all_scored_df = engine.generate_promotion_targets(
            request.productId, top_n=9999
        )
        if all_scored_df is None or len(all_scored_df) == 0:
            raise HTTPException(404, "No suitable customers found for this product.")

        # Personalized: best maxCustomers customers
        targets_df = all_scored_df.head(request.maxCustomers).copy()

        # Broadcast population-level average probability:
        # sum of all ML-predicted probabilities / total customers in DB.
        # Customers not retrieved by CF (~no purchase history for similar
        # products) are assumed to have near-zero affinity, so dividing by
        # total_customers naturally discounts them.
        eligible_prob_sum = float(all_scored_df['purchase_probability'].sum())
        b_avg_prob = eligible_prob_sum / total_customers  # effective population rate

        # ── Personalized metrics ──────────────────────────────
        p_targeted = int(len(targets_df))
        p_avg_prob = float(targets_df['purchase_probability'].mean()) if p_targeted > 0 else 0.0
        p_conversions = int(round(p_targeted * p_avg_prob))
        p_discount_amt = price * (request.personalizedDiscount / 100)
        p_revenue = round(p_conversions * price, 2)
        # cost = discount given only to actual buyers (same applies to both arms)
        p_cost = round(p_conversions * p_discount_amt, 2)
        p_profit = round(p_revenue - p_cost, 2)
        p_roi = round((p_profit / p_cost * 100) if p_cost > 0 else 0.0, 2)
        p_conv_rate = round(p_avg_prob * 100, 2)  # % of targeted customers who convert

        # ── Broadcast metrics (all customers, ML-derived population prob) ──
        b_conversions = int(round(total_customers * b_avg_prob))
        b_discount_amt = price * (request.broadcastDiscount / 100)
        b_revenue = round(b_conversions * price, 2)
        # Broadcast discount cost: same model as personalized — discount is paid
        # only when a customer buys, not to every recipient.
        # The key difference exposed by this fair comparison is the CONVERSION RATE:
        # broadcast has a low population-average probability, so far fewer of its
        # 1,000 targets actually convert, making every discounted sale less predictable.
        b_cost = round(b_conversions * b_discount_amt, 2)
        b_profit = round(b_revenue - b_cost, 2)
        b_roi = round((b_profit / b_cost * 100) if b_cost > 0 else 0.0, 2)
        b_conv_rate = round(b_avg_prob * 100, 2)  # % of targeted customers who convert

        # ── Improvement metrics ──────────────────────────────
        # ROI improvement: how many percentage points better personalized is
        roi_improvement = round(p_roi - b_roi, 2)
        # Conversion rate lift: personalized hit-rate vs broadcast hit-rate
        conv_rate_lift = round(
            ((p_avg_prob - b_avg_prob) / b_avg_prob * 100) if b_avg_prob > 0 else 0.0, 2
        )
        # Discount budget savings: less total discount paid because fewer (but richer)
        # targets are engaged — each discounted sale is to a highly-likely buyer
        discount_budget_savings = round(max(0.0, b_cost - p_cost), 2)
        profit_improvement = round(
            ((p_profit - b_profit) / abs(b_profit) * 100) if b_profit != 0 else 0.0, 2
        )
        customer_efficiency = round(
            (p_targeted / total_customers * 100) if total_customers > 0 else 0.0, 2
        )
        cost_reduction = round(100 - customer_efficiency, 2)
        # Revenue per customer reached — the definitive targeting efficiency metric.
        # Personalized selects high-probability buyers, so each customer reached
        # generates far more revenue than a random broadcast recipient.
        revenue_per_customer_personalized = round(p_revenue / p_targeted, 2) if p_targeted > 0 else 0.0
        revenue_per_customer_broadcast = round(b_revenue / total_customers, 2) if total_customers > 0 else 0.0
        revenue_efficiency = round(
            revenue_per_customer_personalized / revenue_per_customer_broadcast, 2
        ) if revenue_per_customer_broadcast > 0 else 0.0

        return {
            "success": True,
            "productName": str(product['ProductName']),
            "productCategory": str(product['Category']),
            "productPrice": price,
            "conversionRate": round(b_avg_prob, 4),
            "totalCustomers": total_customers,
            "eligibleCustomers": int(len(all_scored_df)),
            "conversionMethodNote": "Broadcast conversion rate = ML-predicted probability averaged across all customers (same model as personalized targeting)",
            "personalized": {
                "customersReached": p_targeted,
                "discountPercent": request.personalizedDiscount,
                "avgPurchaseProbability": round(p_avg_prob, 4),
                "conversionRate": p_conv_rate,
                "conversions": p_conversions,
                "revenue": p_revenue,
                "cost": p_cost,
                "profit": p_profit,
                "roi": p_roi,
            },
            "broadcast": {
                "customersReached": total_customers,
                "discountPercent": request.broadcastDiscount,
                "avgPurchaseProbability": round(b_avg_prob, 4),
                "conversionRate": b_conv_rate,
                "conversions": b_conversions,
                "revenue": b_revenue,
                "cost": b_cost,
                "profit": b_profit,
                "roi": b_roi,
            },
            "comparison": {
                "costSavings": discount_budget_savings,
                "profitImprovement": profit_improvement,
                "roiImprovement": roi_improvement,
                "convRateLift": conv_rate_lift,
                "customerEfficiency": customer_efficiency,
                "costReduction": cost_reduction,
                "revenuePerCustomerPersonalized": revenue_per_customer_personalized,
                "revenuePerCustomerBroadcast": revenue_per_customer_broadcast,
                "revenueEfficiency": revenue_efficiency,
            },
        }

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(500, f"Comparison failed: {str(e)}")


# ── Campaign History ───────────────────────────────────────

class CampaignHistoryItem(BaseModel):
    id: int
    product_id: str
    product_name: str
    product_category: str
    product_price: float
    discount_percent: float
    total_targeted: int
    avg_purchase_probability: float
    expected_conversions: int
    expected_revenue: float
    expected_cost: float
    expected_profit: float
    cost_savings_vs_broadcast: float
    created_at: str


@router.get("/campaigns")
async def list_campaigns(limit: int = 50):
    """Return recent campaign history (no ML required)."""
    try:
        rows = get_campaigns(limit=limit)
        items = []
        for r in rows:
            items.append({
                "id": r["id"],
                "productId": r["product_id"],
                "productName": r["product_name"],
                "productCategory": r["product_category"],
                "productPrice": float(r["product_price"]),
                "discountPercent": float(r["discount_percent"]),
                "totalTargeted": int(r["total_targeted"]),
                "avgPurchaseProbability": float(r["avg_purchase_probability"] or 0),
                "expectedConversions": int(r["expected_conversions"] or 0),
                "expectedRevenue": float(r["expected_revenue"] or 0),
                "expectedCost": float(r["expected_cost"] or 0),
                "expectedProfit": float(r["expected_profit"] or 0),
                "costSavingsVsBroadcast": float(r["cost_savings_vs_broadcast"] or 0),
                "createdAt": r["created_at"].isoformat() if hasattr(r["created_at"], 'isoformat') else str(r["created_at"]),
            })
        return {"success": True, "campaigns": items, "total": len(items)}
    except Exception as e:
        raise HTTPException(500, f"Failed to fetch campaigns: {str(e)}")


@router.get("/campaigns/{campaign_id}")
async def get_campaign(campaign_id: int):
    """Return a single campaign with full target list."""
    try:
        row = get_campaign_by_id(campaign_id)
        if row is None:
            raise HTTPException(404, f"Campaign {campaign_id} not found")
        return {
            "success": True,
            "id": row["id"],
            "productId": row["product_id"],
            "productName": row["product_name"],
            "productCategory": row["product_category"],
            "productPrice": float(row["product_price"]),
            "discountPercent": float(row["discount_percent"]),
            "totalTargeted": int(row["total_targeted"]),
            "avgPurchaseProbability": float(row["avg_purchase_probability"] or 0),
            "expectedConversions": int(row["expected_conversions"] or 0),
            "expectedRevenue": float(row["expected_revenue"] or 0),
            "expectedCost": float(row["expected_cost"] or 0),
            "expectedProfit": float(row["expected_profit"] or 0),
            "costSavingsVsBroadcast": float(row["cost_savings_vs_broadcast"] or 0),
            "targets": row["targets_json"] or [],
            "createdAt": row["created_at"].isoformat() if hasattr(row["created_at"], 'isoformat') else str(row["created_at"]),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Failed to fetch campaign: {str(e)}")
