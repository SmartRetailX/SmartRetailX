from typing import List
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.transaction import Transaction

def get_all_transactions(limit: int = 100):
    """
    Fetch all transactions from the database (up to 'limit').
    Returns a list of Transaction objects.
    """
    db: Session = SessionLocal()
    try:
        transactions = (
            db.query(Transaction)
            .order_by(Transaction.transaction_date.desc())
            .all()
        )

        return transactions
    finally:
        db.close()


def get_customer_transactions(customer_id: int, limit: int = 100) -> List[Transaction]:
    """
    Fetch transactions for a specific customer from the database.
    
    Args:
        customer_id (int): The ID of the customer.
        limit (int): Maximum number of transactions to return (default 100).
        
    Returns:
        List[Transaction]: List of Transaction objects for the customer.
    """
    db: Session = SessionLocal()
    try:
        transactions = (
            db.query(Transaction)
            .filter(Transaction.customer_id == customer_id)
            .order_by(Transaction.transaction_date.desc())
            .all()
        )
        return transactions
    finally:
        db.close()
