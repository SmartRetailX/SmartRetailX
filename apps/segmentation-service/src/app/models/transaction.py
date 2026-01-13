from sqlalchemy import Column, BigInteger, Integer, String, Numeric, Date
from app.db.session import Base

class Transaction(Base):
    __tablename__ = "transactions"

    transaction_id = Column(BigInteger, primary_key=True, index=True)
    invoice_no = Column(String(20), nullable=False)
    transaction_date = Column(Date, nullable=False)
    customer_id = Column(BigInteger, nullable=False)
    product_id = Column(BigInteger, nullable=False)
    product_category = Column(String(100))
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Numeric(10, 2), nullable=False)
    total_amount = Column(Numeric(12, 2))
