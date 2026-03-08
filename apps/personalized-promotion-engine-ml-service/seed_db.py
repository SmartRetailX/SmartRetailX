"""
Standalone script to:
1. Create pe_* tables in PostgreSQL
2. Read CSV files from data/raw/
3. Insert all data into the database

No module imports needed — run directly:
    python seed_db.py
"""

import os
import time
import psycopg2
import psycopg2.extras
import pandas as pd
from dotenv import load_dotenv

# ── Load .env ──────────────────────────────────────────────

script_dir = os.path.dirname(os.path.abspath(__file__))

# Try ML service root .env, then project root .env
for candidate in [
    os.path.join(script_dir, '.env'),
    os.path.join(script_dir, '..', '..', '.env'),
]:
    if os.path.exists(candidate):
        load_dotenv(candidate)
        print(f"Loaded .env from: {os.path.abspath(candidate)}")
        break

DATABASE_URL = os.getenv('DATABASE_URL')
if not DATABASE_URL:
    print("ERROR: DATABASE_URL not found. Check your .env file.")
    exit(1)

# ── CSV folder ─────────────────────────────────────────────

CSV_DIR = os.path.join(script_dir, 'data', 'raw')

# ── SQL: Create tables ─────────────────────────────────────

CREATE_TABLES_SQL = """
-- Stores
CREATE TABLE IF NOT EXISTS pe_stores (
    store_id VARCHAR(20) PRIMARY KEY,
    city VARCHAR(100) NOT NULL,
    store_type VARCHAR(50) NOT NULL,
    opening_date DATE
);

-- Customers
CREATE TABLE IF NOT EXISTS pe_customers (
    customer_id VARCHAR(20) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    age INTEGER,
    gender VARCHAR(20),
    location VARCHAR(100),
    registration_date DATE,
    customer_segment VARCHAR(50),
    email VARCHAR(200),
    phone_number VARCHAR(20)
);

-- Products
CREATE TABLE IF NOT EXISTS pe_products (
    product_id VARCHAR(20) PRIMARY KEY,
    product_name VARCHAR(200) NOT NULL,
    category VARCHAR(100) NOT NULL,
    brand VARCHAR(100),
    price DECIMAL(10, 2) NOT NULL,
    base_product VARCHAR(200),
    purchase_frequency VARCHAR(20)
);

-- Promotions
CREATE TABLE IF NOT EXISTS pe_promotions (
    promotion_id VARCHAR(20) PRIMARY KEY,
    product_id VARCHAR(20) REFERENCES pe_products(product_id),
    discount_percentage DECIMAL(5, 2) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    promotion_type VARCHAR(50),
    targeted_promotion BOOLEAN DEFAULT FALSE
);

-- Transactions
CREATE TABLE IF NOT EXISTS pe_transactions (
    transaction_id VARCHAR(20) NOT NULL,
    customer_id VARCHAR(20) REFERENCES pe_customers(customer_id),
    product_id VARCHAR(20) REFERENCES pe_products(product_id),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    transaction_date TIMESTAMP NOT NULL,
    discounted_amount DECIMAL(10, 2) DEFAULT 0,
    promotion_id VARCHAR(20),
    store_id VARCHAR(20) REFERENCES pe_stores(store_id),
    total_amount DECIMAL(10, 2) NOT NULL,
    PRIMARY KEY (transaction_id, product_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pe_txn_customer ON pe_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_pe_txn_product ON pe_transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_pe_txn_date ON pe_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_pe_products_cat ON pe_products(category);
CREATE INDEX IF NOT EXISTS idx_pe_customers_seg ON pe_customers(customer_segment);
"""


def fresh_connection():
    """Create a fresh database connection."""
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = False
    return conn


def main():
    print("=" * 60)
    print("  SEED PROMOTION ENGINE DATABASE")
    print("=" * 60)

    # ── Check CSVs exist ───────────────────────────────────
    required = ['Stores.csv', 'Customers.csv', 'Products.csv', 'Promotions.csv', 'Transactions.csv']
    for f in required:
        path = os.path.join(CSV_DIR, f)
        if not os.path.exists(path):
            print(f"\nERROR: {f} not found in {CSV_DIR}")
            exit(1)
    print(f"\n✓ All CSV files found in {CSV_DIR}")

    # ── Connect ────────────────────────────────────────────
    print("\nConnecting to PostgreSQL...")
    conn = fresh_connection()
    cur = conn.cursor()
    print("✓ Connected")

    # ── Create tables ──────────────────────────────────────
    print("\nCreating pe_* tables...")
    cur.execute(CREATE_TABLES_SQL)
    conn.commit()
    print("✓ Tables created")

    # ── 1. Stores ──────────────────────────────────────────
    df = pd.read_csv(os.path.join(CSV_DIR, 'Stores.csv'))
    print(f"\nInserting {len(df)} stores...")
    for _, r in df.iterrows():
        cur.execute(
            "INSERT INTO pe_stores (store_id, city, store_type, opening_date) "
            "VALUES (%s, %s, %s, %s) ON CONFLICT DO NOTHING",
            (r['StoreID'], r['City'], r['StoreType'], r.get('OpeningDate'))
        )
    conn.commit()
    print(f"  ✓ Done")

    # ── 2. Customers ───────────────────────────────────────
    df = pd.read_csv(os.path.join(CSV_DIR, 'Customers.csv'))
    print(f"\nInserting {len(df)} customers...")
    for _, r in df.iterrows():
        cur.execute(
            "INSERT INTO pe_customers (customer_id, name, age, gender, location, "
            "registration_date, customer_segment, email, phone_number) "
            "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s) ON CONFLICT DO NOTHING",
            (r['CustomerID'], r['Name'], int(r['Age']), r['Gender'],
             r['Location'], r['RegistrationDate'], r['CustomerSegment'],
             r.get('Email', ''), r.get('PhoneNumber', ''))
        )
    conn.commit()
    print(f"  ✓ Done")

    # ── 3. Products ────────────────────────────────────────
    df = pd.read_csv(os.path.join(CSV_DIR, 'Products.csv'))
    print(f"\nInserting {len(df)} products...")
    for _, r in df.iterrows():
        cur.execute(
            "INSERT INTO pe_products (product_id, product_name, category, brand, "
            "price, base_product, purchase_frequency) "
            "VALUES (%s,%s,%s,%s,%s,%s,%s) ON CONFLICT DO NOTHING",
            (r['ProductID'], r['ProductName'], r['Category'], r['Brand'],
             float(r['Price']), r.get('BaseProduct', ''),
             r.get('PurchaseFrequency', 'medium'))
        )
    conn.commit()
    print(f"  ✓ Done")

    # ── 4. Promotions ──────────────────────────────────────
    df = pd.read_csv(os.path.join(CSV_DIR, 'Promotions.csv'))
    print(f"\nInserting {len(df)} promotions...")
    for _, r in df.iterrows():
        cur.execute(
            "INSERT INTO pe_promotions (promotion_id, product_id, discount_percentage, "
            "start_date, end_date, promotion_type, targeted_promotion) "
            "VALUES (%s,%s,%s,%s,%s,%s,%s) ON CONFLICT DO NOTHING",
            (r['PromotionID'], r['ProductID'], float(r['DiscountPercentage']),
             r['StartDate'], r['EndDate'],
             r.get('PromotionType', 'Flash Sale'),
             bool(r.get('TargetedPromotion', False)))
        )
    conn.commit()
    print(f"  ✓ Done")

    cur.close()
    conn.close()

    # ── 5. Transactions — use batch inserts with fresh connections ──
    df = pd.read_csv(os.path.join(CSV_DIR, 'Transactions.csv'))
    print(f"\nInserting {len(df)} transactions (in batches of 500)...")

    # Prepare data as list of tuples
    rows = []
    for _, r in df.iterrows():
        promo = r['PromotionID'] if str(r['PromotionID']) != 'None' else None
        rows.append((
            r['TransactionID'], r['CustomerID'], r['ProductID'],
            int(r['Quantity']), float(r['UnitPrice']),
            r['TransactionDate'], float(r.get('DiscountedAmount', 0)),
            promo, r['StoreID'], float(r['TotalAmount'])
        ))

    BATCH_SIZE = 500
    total_inserted = 0

    for i in range(0, len(rows), BATCH_SIZE):
        batch = rows[i:i + BATCH_SIZE]
        
        # Fresh connection for each batch (Neon pooler friendly)
        conn = fresh_connection()
        cur = conn.cursor()
        
        try:
            psycopg2.extras.execute_batch(
                cur,
                "INSERT INTO pe_transactions (transaction_id, customer_id, product_id, "
                "quantity, unit_price, transaction_date, discounted_amount, "
                "promotion_id, store_id, total_amount) "
                "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) ON CONFLICT DO NOTHING",
                batch,
                page_size=100
            )
            conn.commit()
            total_inserted += len(batch)
            print(f"    ... {total_inserted}/{len(rows)} rows")
        except Exception as e:
            conn.rollback()
            print(f"    Batch error at {i}: {e}")
            print(f"    Retrying after 2 seconds...")
            time.sleep(2)
            # Retry this batch with a new connection
            try:
                conn.close()
            except:
                pass
            conn = fresh_connection()
            cur = conn.cursor()
            try:
                psycopg2.extras.execute_batch(
                    cur,
                    "INSERT INTO pe_transactions (transaction_id, customer_id, product_id, "
                    "quantity, unit_price, transaction_date, discounted_amount, "
                    "promotion_id, store_id, total_amount) "
                    "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) ON CONFLICT DO NOTHING",
                    batch,
                    page_size=50
                )
                conn.commit()
                total_inserted += len(batch)
                print(f"    ... {total_inserted}/{len(rows)} rows (retry OK)")
            except Exception as e2:
                print(f"    Retry also failed: {e2}")
        finally:
            try:
                cur.close()
                conn.close()
            except:
                pass
        
        # Small delay between batches to be friendly to Neon pooler
        time.sleep(0.3)

    print(f"  ✓ Done ({total_inserted} inserted)")

    # ── Verify ─────────────────────────────────────────────
    print("\n" + "=" * 60)
    print("  VERIFICATION")
    print("=" * 60)
    conn = fresh_connection()
    cur = conn.cursor()
    for table in ['pe_stores', 'pe_customers', 'pe_products', 'pe_promotions', 'pe_transactions']:
        cur.execute(f"SELECT COUNT(*) FROM {table}")
        count = cur.fetchone()[0]
        print(f"  {table}: {count} rows")
    cur.close()
    conn.close()

    print("\n✓ ALL DONE! Refresh SQLTools to see your pe_* tables.")


if __name__ == "__main__":
    main()
