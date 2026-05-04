"""
Cart Recommendations API — frequently-bought-together products.

Accepts a list of storefront product UUIDs (core.products.id) that are
currently in the user's cart, and returns co-purchase recommendations
from core.transactions data, mapped back to storefront product IDs so
the frontend can offer a direct "Add to Cart" action.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List

from api.database import get_cart_recommendations

router = APIRouter()


class CartRecommendationRequest(BaseModel):
    product_ids: List[str]
    limit: int = 10


@router.post("/cart-recommendations")
async def get_cart_recs(body: CartRecommendationRequest):
    """
    Return frequently-bought-together products for the given cart contents.

    Pass the storefront product UUIDs (core.products.id) of the items currently
    in the cart. The service runs a co-purchase market basket query on
    core.transactions to find what other customers also bought.

    Returns storefront product IDs in the response so the client can
    call the normal "Add to Cart" endpoint directly.
    """
    if not body.product_ids:
        return {"success": True, "recommendations": [], "cart_matched_count": 0, "total": 0}

    try:
        result = get_cart_recommendations(body.product_ids, limit=max(1, min(body.limit, 20)))
        return {"success": True, **result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate cart recommendations: {e}")
