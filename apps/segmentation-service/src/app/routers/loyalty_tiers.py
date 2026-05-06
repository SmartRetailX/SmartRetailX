from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.loyalty_tier import LoyaltyTier
from pydantic import BaseModel
from typing import List, Optional
from app.models.customer_segment import CustomerSegment
from app.models.customer_loyalty import CustomerLoyalty

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

    customers = db.query(CustomerSegment).all()
    for customer in customers:
        # eligibility check
        if (
            customer.parent_behavior in new_tier.customer_segments and
            customer.sub_segment in new_tier.sub_clusters
        ):
            # get or create
            customer_loyalty = db.query(CustomerLoyalty).filter_by(customer_id=customer.customer_id).first()
            if not customer_loyalty:
                customer_loyalty = CustomerLoyalty(customer_id=customer.customer_id)
                db.add(customer_loyalty)

            # update all fields
            customer_loyalty.loyalty_tier_id = new_tier.id
            customer_loyalty.loyalty_tier_name = new_tier.tier_name
            customer_loyalty.tier_color = new_tier.tier_color
            customer_loyalty.benefits = new_tier.benefits
            customer_loyalty.preferred_categories = new_tier.preferred_categories

    db.commit()
    return new_tier


@router.put("/{tier_id}", response_model=LoyaltyTierResponse)
def update_loyalty_tier(
    tier_id: int,
    tier: LoyaltyTierCreate,
    db: Session = Depends(get_db),
):
    existing = db.query(LoyaltyTier).filter(LoyaltyTier.id == tier_id).first()
    if not existing:
        raise HTTPException(status_code=404, detail="Tier not found")

    # 1️⃣ Update tier info
    for key, value in tier.dict().items():
        setattr(existing, key, value)

    db.commit()
    db.refresh(existing)

    # 2️⃣ Update all CustomerLoyalty rows that belong to this tier
    customer_loyalties = db.query(CustomerLoyalty).filter(CustomerLoyalty.loyalty_tier_id == tier_id).all()
    for cl in customer_loyalties:
        cl.loyalty_tier_name = existing.tier_name
        cl.tier_color = existing.tier_color
        cl.benefits = existing.benefits
        cl.preferred_categories = existing.preferred_categories

    db.commit()

    return existing


@router.delete("/{tier_id}")
def delete_loyalty_tier(tier_id: int, db: Session = Depends(get_db)):
    tier = db.query(LoyaltyTier).filter(LoyaltyTier.id == tier_id).first()
    if not tier:
        raise HTTPException(status_code=404, detail="Tier not found")

    # 1️⃣ Delete all CustomerLoyalty rows associated with this tier
    db.query(CustomerLoyalty).filter(CustomerLoyalty.loyalty_tier_id == tier_id).delete(synchronize_session=False)

    # 2️⃣ Delete the tier itself
    db.delete(tier)
    db.commit()

    return {"message": "Tier deleted successfully"}

class CustomerLoyaltyResponse(BaseModel):
    customer_id: int
    loyalty_tier_id: int
    loyalty_tier_name: str
    tier_color: str
    benefits: str
    preferred_categories: Optional[List[str]]

    class Config:
        orm_mode = True

@router.get("/customer/{customer_id}", response_model=CustomerLoyaltyResponse)
def get_loyalty_by_customer(customer_id: int, db: Session = Depends(get_db)):
    loyalty = db.query(CustomerLoyalty).filter(CustomerLoyalty.customer_id == customer_id).first()

    if not loyalty:
        raise HTTPException(status_code=404, detail="Loyalty tier not found for this customer")

    return loyalty