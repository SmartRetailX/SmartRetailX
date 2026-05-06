"""
Product Suggestions API — co-purchase / market basket recommendations.

For a given authenticated customer (resolved via email), this endpoint
computes "customers who bought what you bought also bought …" suggestions
by joining core.transactions, auth.user, and core.products entirely in SQL.
No ML model inference is needed — the logic lives in the DB query.
"""

from fastapi import APIRouter, HTTPException, Query

from api.database import get_product_suggestions_by_email

router = APIRouter()


@router.get("/product-suggestions")
async def get_suggestions(
    email: str = Query(..., description="Authenticated user's email"),
    limit: int = Query(20, ge=1, le=50, description="Max number of suggestions to return"),
):
    """
    Return personalised product suggestions for the given customer.

    Uses a co-purchase market basket algorithm:
    - finds other customers who bought the same products
    - recommends products those co-buyers purchased that this customer hasn't

    The response includes a `because_you_bought` list (up to 3 trigger products)
    so the UI can explain *why* a product was suggested.
    """
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="A valid email address is required.")

    try:
        result = get_product_suggestions_by_email(email, limit=limit)
        return {"success": True, **result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate suggestions: {e}")
