from sqlalchemy import Column, BigInteger, String, Numeric, DateTime, Text, ForeignKey, func
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

class CustomerCategoryPreference(Base):
    __tablename__ = "customer_category_preferences"

    customer_id = Column(BigInteger, primary_key=True, index=True)
    preferred_category = Column(String(50), nullable=False)
    ratio = Column(Numeric(5, 4), nullable=False)
    top_categories = Column(Text)
    computed_at = Column(DateTime(timezone=True), server_default=func.now())

    contributions = relationship(
        "CustomerCategoryContribution",
        back_populates="customer",
        cascade="all, delete-orphan"
    )


class CustomerCategoryContribution(Base):
    __tablename__ = "customer_category_contributions"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    customer_id = Column(BigInteger, ForeignKey("customer_category_preferences.customer_id", ondelete="CASCADE"), nullable=False)
    category = Column(String(50), nullable=False)
    contribution = Column(Numeric(5, 4), nullable=False)

    customer = relationship("CustomerCategoryPreference", back_populates="contributions")

    __table_args__ = (
        {"sqlite_autoincrement": True},
    )
