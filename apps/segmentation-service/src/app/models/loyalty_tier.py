from sqlalchemy import Column, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSON
from app.db.session import Base

class LoyaltyTier(Base):
    __tablename__ = "loyalty_tiers"

    id = Column(Integer, primary_key=True, index=True)
    tier_name = Column(String, nullable=False)
    tier_color = Column(String, nullable=False)
    benefits = Column(Text, nullable=False)

    customer_segments = Column(JSON)
    sub_clusters = Column(JSON)
    preferred_categories = Column(JSON)