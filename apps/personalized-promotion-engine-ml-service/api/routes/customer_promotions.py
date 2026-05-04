"""
Customer-facing promotion notifications API.

Customers fetch their targeted promotions (and mark them as read) via these routes.
The authenticated user's email is passed from the NestJS auth-aware proxy as a
query parameter — the Python service then joins auth.user.email to resolve
customer_id via the Prisma-managed schema.
"""

from fastapi import APIRouter, HTTPException, Query

from api.database import (
    get_customer_promotions_by_email,
    mark_promotion_read,
    mark_all_promotions_read,
)

router = APIRouter()


def _serialize(row: dict) -> dict:
    """Convert PostgreSQL datetimes to ISO strings for JSON serialisation."""
    out = dict(row)
    for key in ('created_at', 'expires_at'):
        if key in out and out[key] is not None and hasattr(out[key], 'isoformat'):
            out[key] = out[key].isoformat()
    return out


@router.get("/customer-promotions")
async def get_my_promotions(
    email: str = Query(..., description="Authenticated user's email"),
):
    """
    Return all active promotion notifications for the given email address.
    Rows are ordered: unread first, then newest first.
    """
    if not email or '@' not in email:
        raise HTTPException(status_code=400, detail="A valid email address is required.")
    try:
        rows = get_customer_promotions_by_email(email)
        promotions = [_serialize(r) for r in rows]
        unread = sum(1 for p in promotions if not p['is_read'])
        return {
            "success": True,
            "promotions": promotions,
            "total": len(promotions),
            "unread": unread,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch promotions: {e}")


# NOTE: read-all must be declared BEFORE the parameterised /{id}/read route so
# FastAPI's router does not treat the literal 'read-all' as an integer id.
@router.patch("/customer-promotions/read-all")
async def mark_all_read(
    email: str = Query(..., description="Authenticated user's email"),
):
    """Mark every unread promotion notification as read for the given user."""
    if not email or '@' not in email:
        raise HTTPException(status_code=400, detail="A valid email address is required.")
    try:
        count = mark_all_promotions_read(email)
        return {"success": True, "marked": count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update promotions: {e}")


@router.patch("/customer-promotions/{notification_id}/read")
async def mark_one_read(
    notification_id: int,
    email: str = Query(..., description="Authenticated user's email"),
):
    """Mark a single promotion notification as read (ownership verified by email)."""
    if not email or '@' not in email:
        raise HTTPException(status_code=400, detail="A valid email address is required.")
    ok = mark_promotion_read(notification_id, email)
    if not ok:
        raise HTTPException(status_code=404, detail="Notification not found or access denied.")
    return {"success": True}
