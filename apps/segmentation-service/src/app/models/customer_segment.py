from sqlalchemy import Column, BigInteger, String, Integer, Numeric, DateTime
from sqlalchemy.sql import func
from app.db.session import Base

class CustomerSegment(Base):
    __tablename__ = "customer_segments"

    customer_id = Column(BigInteger, primary_key=True, index=True)

    parent_behavior = Column(String(50))
    sub_segment = Column(String(50))

    recency = Column(Integer)
    frequency = Column(Integer)
    monetary = Column(Numeric(12, 2))

    computed_at = Column(DateTime(timezone=True), server_default=func.now())
