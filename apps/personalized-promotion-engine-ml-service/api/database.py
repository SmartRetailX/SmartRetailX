"""
PostgreSQL Database Adapter — reads from pe_* tables.
Returns DataFrames with the EXACT column names that DataPreprocessor expects.
"""

import os
import psycopg2
import pandas as pd
from dotenv import load_dotenv

# Load .env
_script_dir = os.path.dirname(os.path.abspath(__file__))
for _candidate in [
    os.path.join(_script_dir, '..', '.env'),
    os.path.join(_script_dir, '..', '..', '..', '.env'),
]:
    if os.path.exists(_candidate):
        load_dotenv(_candidate)
        break

DATABASE_URL = os.getenv('DATABASE_URL')


def get_connection():
    """Get a PostgreSQL connection."""
    if not DATABASE_URL:
        raise ValueError("DATABASE_URL not found in environment.")
    return psycopg2.connect(DATABASE_URL)


def get_customers() -> pd.DataFrame:
    """Load customers — columns match CSV format."""
    query = """
        SELECT 
            customer_id AS "CustomerID",
            name AS "Name",
            age AS "Age",
            gender AS "Gender",
            location AS "Location",
            registration_date AS "RegistrationDate",
            customer_segment AS "CustomerSegment",
            email AS "Email",
            phone_number AS "PhoneNumber"
        FROM pe_customers
        ORDER BY customer_id
    """
    with get_connection() as conn:
        df = pd.read_sql(query, conn)
    if len(df) > 0:
        df['RegistrationDate'] = pd.to_datetime(df['RegistrationDate'])
    return df


def get_products() -> pd.DataFrame:
    """Load products — columns match CSV format."""
    query = """
        SELECT 
            product_id AS "ProductID",
            product_name AS "ProductName",
            category AS "Category",
            brand AS "Brand",
            price AS "Price",
            purchase_frequency AS "PurchaseFrequency"
        FROM pe_products
        ORDER BY product_id
    """
    with get_connection() as conn:
        df = pd.read_sql(query, conn)
    return df


def get_transactions() -> pd.DataFrame:
    """Load transactions — columns match CSV format."""
    query = """
        SELECT 
            transaction_id AS "TransactionID",
            customer_id AS "CustomerID",
            product_id AS "ProductID",
            quantity AS "Quantity",
            unit_price AS "UnitPrice",
            transaction_date AS "TransactionDate",
            discounted_amount AS "DiscountedAmount",
            COALESCE(promotion_id, 'None') AS "PromotionID",
            store_id AS "StoreID",
            total_amount AS "TotalAmount"
        FROM pe_transactions
        ORDER BY transaction_date
    """
    with get_connection() as conn:
        df = pd.read_sql(query, conn)
    if len(df) > 0:
        df['TransactionDate'] = pd.to_datetime(df['TransactionDate'])
    return df


def get_promotions() -> pd.DataFrame:
    """Load promotions — columns match CSV format."""
    query = """
        SELECT 
            promotion_id AS "PromotionID",
            product_id AS "ProductID",
            discount_percentage AS "DiscountPercentage",
            start_date AS "StartDate",
            end_date AS "EndDate",
            promotion_type AS "PromotionType",
            targeted_promotion AS "TargetedPromotion"
        FROM pe_promotions
        ORDER BY start_date
    """
    with get_connection() as conn:
        df = pd.read_sql(query, conn)
    return df


if __name__ == "__main__":
    print("Testing database connection...")
    try:
        c = get_customers()
        p = get_products()
        t = get_transactions()
        pr = get_promotions()
        print(f"  Customers: {len(c)}")
        print(f"  Products: {len(p)}")
        print(f"  Transactions: {len(t)}")
        print(f"  Promotions: {len(pr)}")
        print("\n✓ Database connection OK")
    except Exception as e:
        print(f"  ERROR: {e}")
