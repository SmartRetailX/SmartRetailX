"""
Campaign generation & product listing API routes.
"""

import os
import sys
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

router = APIRouter()


# ── Request / Response Models ──────────────────────────────

class GenerateCampaignRequest(BaseModel):
    productId: str
    discountPercent: float = 10.0
    maxCustomers: int = 50


class CustomerTarget(BaseModel):
    customerId: str
    customerName: str
    location: str
    segment: str
    purchaseProbability: float
    cfScore: float
    hybridScore: float
    targetingMethod: str


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

        return GenerateCampaignResponse(
            success=True, campaign=summary, targets=target_list
        )

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(500, f"Campaign generation failed: {str(e)}")
