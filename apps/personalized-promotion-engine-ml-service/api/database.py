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


# ── Campaign History ───────────────────────────────────────

def _ensure_campaign_table():
    """Create the campaign history table if it doesn't exist."""
    ddl = """
    CREATE TABLE IF NOT EXISTS pe_campaign_history (
        id              SERIAL PRIMARY KEY,
        product_id      TEXT NOT NULL,
        product_name    TEXT NOT NULL,
        product_category TEXT NOT NULL,
        product_price   DOUBLE PRECISION NOT NULL,
        discount_percent DOUBLE PRECISION NOT NULL,
        total_targeted  INTEGER NOT NULL,
        avg_purchase_probability DOUBLE PRECISION,
        expected_conversions INTEGER,
        expected_revenue DOUBLE PRECISION,
        expected_cost    DOUBLE PRECISION,
        expected_profit  DOUBLE PRECISION,
        cost_savings_vs_broadcast DOUBLE PRECISION,
        targets_json     JSONB,
        created_at       TIMESTAMP DEFAULT NOW()
    );
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(ddl)
        conn.commit()


def save_campaign(campaign_data: dict, targets_list: list) -> int:
    """Save a generated campaign and return its ID."""
    _ensure_campaign_table()
    sql = """
    INSERT INTO pe_campaign_history (
        product_id, product_name, product_category, product_price,
        discount_percent, total_targeted, avg_purchase_probability,
        expected_conversions, expected_revenue, expected_cost,
        expected_profit, cost_savings_vs_broadcast, targets_json
    ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s::jsonb)
    RETURNING id;
    """
    import json
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, (
                campaign_data['productId'],
                campaign_data['productName'],
                campaign_data['productCategory'],
                campaign_data['productPrice'],
                campaign_data['discountPercent'],
                campaign_data['totalTargeted'],
                campaign_data.get('avgPurchaseProbability', 0),
                campaign_data.get('expectedConversions', 0),
                campaign_data.get('expectedRevenue', 0),
                campaign_data.get('expectedCost', 0),
                campaign_data.get('expectedProfit', 0),
                campaign_data.get('costSavingsVsBroadcast', 0),
                json.dumps(targets_list),
            ))
            campaign_id = cur.fetchone()[0]
        conn.commit()
    return campaign_id


def get_campaigns(limit: int = 50) -> list:
    """Get recent campaign history."""
    _ensure_campaign_table()
    sql = """
    SELECT id, product_id, product_name, product_category, product_price,
           discount_percent, total_targeted, avg_purchase_probability,
           expected_conversions, expected_revenue, expected_cost,
           expected_profit, cost_savings_vs_broadcast, created_at
    FROM pe_campaign_history
    ORDER BY created_at DESC
    LIMIT %s;
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, (limit,))
            columns = [desc[0] for desc in cur.description]
            rows = cur.fetchall()
    return [dict(zip(columns, row)) for row in rows]


def get_campaign_by_id(campaign_id: int) -> dict | None:
    """Get a single campaign with full targets."""
    _ensure_campaign_table()
    sql = """
    SELECT id, product_id, product_name, product_category, product_price,
           discount_percent, total_targeted, avg_purchase_probability,
           expected_conversions, expected_revenue, expected_cost,
           expected_profit, cost_savings_vs_broadcast, targets_json, created_at
    FROM pe_campaign_history
    WHERE id = %s;
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, (campaign_id,))
            columns = [desc[0] for desc in cur.description]
            row = cur.fetchone()
    if row is None:
        return None
    return dict(zip(columns, row))


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
        print("\\n[OK] Database connection OK")
    except Exception as e:
        print(f"  ERROR: {e}")

