from sqlalchemy import Column, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSON
from app.db.session import Base

class CustomerLoyalty(Base):
    __tablename__ = "customer_loyalty"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, nullable=False, index=True)
    
    loyalty_tier_id = Column(Integer, nullable=False)
    loyalty_tier_name = Column(String, nullable=False)
    tier_color = Column(String, nullable=False)
    benefits = Column(Text, nullable=False)
    preferred_categories = Column(JSON)