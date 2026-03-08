from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.loyalty_tier import LoyaltyTier
from pydantic import BaseModel
from typing import List

router = APIRouter(
    prefix="/loyalty-tiers",
    tags=["Loyalty Tiers"]
)

# ----------------------------
# Pydantic Schemas
# ----------------------------

class LoyaltyTierBase(BaseModel):
    tier_name: str
    tier_color: str
    benefits: str
    customer_segments: List[str]
    sub_clusters: List[str]
    preferred_categories: List[str]


class LoyaltyTierCreate(LoyaltyTierBase):
    pass


class LoyaltyTierResponse(LoyaltyTierBase):
    id: int

    class Config:
        orm_mode = True   # VERY IMPORTANT


# ----------------------------
# Get All Tiers
# ----------------------------

@router.get("/", response_model=List[LoyaltyTierResponse])
def get_loyalty_tiers(db: Session = Depends(get_db)):
    return db.query(LoyaltyTier).all()


# ----------------------------
# Get Single Tier
# ----------------------------

@router.get("/{tier_id}", response_model=LoyaltyTierResponse)
def get_loyalty_tier(tier_id: int, db: Session = Depends(get_db)):
    tier = db.query(LoyaltyTier).filter(LoyaltyTier.id == tier_id).first()

    if not tier:
        raise HTTPException(status_code=404, detail="Tier not found")

    return tier


# ----------------------------
# Create Tier
# ----------------------------

@router.post("/", response_model=LoyaltyTierResponse)
def create_loyalty_tier(
    tier: LoyaltyTierCreate,
    db: Session = Depends(get_db)
):
    new_tier = LoyaltyTier(**tier.dict())

    db.add(new_tier)
    db.commit()
    db.refresh(new_tier)

    return new_tier


# ----------------------------
# Update Tier
# ----------------------------

@router.put("/{tier_id}", response_model=LoyaltyTierResponse)
def update_loyalty_tier(
    tier_id: int,
    tier: LoyaltyTierCreate,
    db: Session = Depends(get_db),
):
    existing = db.query(LoyaltyTier).filter(LoyaltyTier.id == tier_id).first()

    if not existing:
        raise HTTPException(status_code=404, detail="Tier not found")

    for key, value in tier.dict().items():
        setattr(existing, key, value)

    db.commit()
    db.refresh(existing)

    return existing


# ----------------------------
# Delete Tier
# ----------------------------

@router.delete("/{tier_id}")
def delete_loyalty_tier(tier_id: int, db: Session = Depends(get_db)):
    tier = db.query(LoyaltyTier).filter(LoyaltyTier.id == tier_id).first()

    if not tier:
        raise HTTPException(status_code=404, detail="Tier not found")

    db.delete(tier)
    db.commit()

    return {"message": "Tier deleted successfully"}