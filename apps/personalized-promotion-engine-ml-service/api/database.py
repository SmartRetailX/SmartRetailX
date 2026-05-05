"""
PostgreSQL Database Adapter — reads from the Prisma-managed schema tables.

Tables used (all in 'core' schema unless noted):
  auth.user        -> customers
  core.products    -> products (joined with core.categories for category name)
  core.transactions-> transactions
  core.promotions  -> promotions

Returns DataFrames with the EXACT column names the ML pipeline expects
(CustomerID, ProductID, etc.) for compatibility with the preprocessor.
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
    """
    Load customers from auth.user table.
    Maps Prisma schema fields to ML pipeline column names.
    """
    query = """
        SELECT 
            u.id            AS "CustomerID",
            u.name          AS "Name",
            u.email         AS "Email",
            u.age           AS "Age",
            u.gender        AS "Gender",
            u."City"        AS "Location",
            u."customerSegment" AS "CustomerSegment",
            u."createdAt"   AS "RegistrationDate"
        FROM auth."user" u
        ORDER BY u."createdAt"
    """
    with get_connection() as conn:
        df = pd.read_sql(query, conn)
    if len(df) > 0:
        df['Age'] = pd.to_numeric(df['Age'], errors='coerce').fillna(30).astype(int)
        df['RegistrationDate'] = pd.to_datetime(df['RegistrationDate'])
    return df


def get_products() -> pd.DataFrame:
    """
    Load products from core.products joined with core.categories.
    Maps Prisma schema fields to ML pipeline column names.
    """
    query = """
        SELECT 
            p.id::text          AS "ProductID",
            p.name              AS "ProductName",
            c.name              AS "Category",
            p.brand             AS "Brand",
            p.price::float      AS "Price",
            p.purchase_frequency AS "PurchaseFrequency",
            p.stock_quantity    AS "StockQuantity"
        FROM core.products p
        JOIN core.categories c ON c.id = p.category_id
        WHERE p.is_active = true
        ORDER BY p.created_at
    """
    with get_connection() as conn:
        df = pd.read_sql(query, conn)
    return df


def get_transactions() -> pd.DataFrame:
    """
    Load transactions from core.transactions.
    Maps Prisma schema fields to ML pipeline column names.
    """
    query = """
        SELECT 
            t.transaction_id::text          AS "TransactionID",
            t.order_id::text                AS "OrderID",
            t.invoice_no                    AS "InvoiceNo",
            t.customer_id                   AS "CustomerID",
            t.product_id::text              AS "ProductID",
            t.quantity                       AS "Quantity",
            t.unit_price::float             AS "UnitPrice",
            t.total_amount::float           AS "TotalAmount",
            t.transaction_date              AS "TransactionDate",
            t.discount_amount::float        AS "DiscountedAmount",
            COALESCE(t.promotion_id::text, 'None') AS "PromotionID"
        FROM core.transactions t
        ORDER BY t.transaction_date
    """
    with get_connection() as conn:
        df = pd.read_sql(query, conn)
    if len(df) > 0:
        df['TransactionDate'] = pd.to_datetime(df['TransactionDate'])
        df['TotalAmount'] = pd.to_numeric(df['TotalAmount'], errors='coerce').fillna(0)
        df['DiscountedAmount'] = pd.to_numeric(df['DiscountedAmount'], errors='coerce').fillna(0)
        df['Quantity'] = pd.to_numeric(df['Quantity'], errors='coerce').fillna(1).astype(int)
    return df


def get_promotions() -> pd.DataFrame:
    """
    Load promotions from core.promotions.
    Maps Prisma schema fields to ML pipeline column names.
    """
    query = """
        SELECT 
            p.promotion_id::text        AS "PromotionID",
            p.product_id::text          AS "ProductID",
            p.discount_percentage::float AS "DiscountPercentage",
            p.start_date                AS "StartDate",
            p.end_date                  AS "EndDate",
            p.promotion_type            AS "PromotionType",
            p.is_targetted_promotion    AS "IsTargetted",
            p.product_scope             AS "ProductScope",
            p.status                    AS "Status"
        FROM core.promotions p
        ORDER BY p.start_date
    """
    with get_connection() as conn:
        df = pd.read_sql(query, conn)
    return df


# ── Campaign History ───────────────────────────────────────

def _ensure_campaign_table():
    """Create the campaign history table if it doesn't exist."""
    ddl = """
    CREATE TABLE IF NOT EXISTS core.pe_campaign_history (
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
    INSERT INTO core.pe_campaign_history (
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
    FROM core.pe_campaign_history
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
    FROM core.pe_campaign_history
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

# ── Customer Promotion Notifications ──────────────────────

def _ensure_customer_promotions_table():
    """Create pe_customer_promotions if it doesn't exist."""
    ddl = """
    CREATE TABLE IF NOT EXISTS core.pe_customer_promotions (
        id               SERIAL PRIMARY KEY,
        customer_id      TEXT NOT NULL,
        campaign_id      INTEGER,
        product_id       TEXT NOT NULL,
        product_name     TEXT NOT NULL,
        product_category TEXT NOT NULL,
        discount_percent DOUBLE PRECISION NOT NULL,
        message          TEXT NOT NULL,
        is_read          BOOLEAN DEFAULT FALSE,
        expires_at       TIMESTAMP,
        created_at       TIMESTAMP DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_pe_cp_customer ON core.pe_customer_promotions(customer_id);
    CREATE INDEX IF NOT EXISTS idx_pe_cp_unread ON core.pe_customer_promotions(customer_id, is_read);
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(ddl)
        conn.commit()


def save_customer_promotions(campaign_id: int, campaign_data: dict, targets_list: list):
    """Fan-out a campaign to per-customer notification rows."""
    _ensure_customer_promotions_table()
    import datetime
    expires = datetime.datetime.now() + datetime.timedelta(days=30)
    product_name = campaign_data['productName']
    discount = campaign_data['discountPercent']
    category = campaign_data['productCategory']
    product_id = campaign_data['productId']

    sql = """
    INSERT INTO core.pe_customer_promotions
        (customer_id, campaign_id, product_id, product_name, product_category,
         discount_percent, message, expires_at)
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
    """
    rows = [
        (
            str(t['customerId']),
            campaign_id,
            str(product_id),
            product_name,
            category,
            discount,
            f"You have a {discount:.0f}% discount on {product_name}! Limited time offer.",
            expires,
        )
        for t in targets_list
    ]
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.executemany(sql, rows)
        conn.commit()


def get_customer_promotions_by_email(email: str) -> list:
    """Look up customer_id by email via auth.user, then return their active promotions."""
    _ensure_customer_promotions_table()
    sql = """
    SELECT cp.id, cp.customer_id, cp.campaign_id, cp.product_id, cp.product_name,
           cp.product_category, cp.discount_percent, cp.message,
           cp.is_read, cp.expires_at, cp.created_at,
           p.image_url AS image_url
    FROM core.pe_customer_promotions cp
    JOIN auth."user" u ON u.id = cp.customer_id
    LEFT JOIN core.products p ON p.id::text = cp.product_id
    WHERE LOWER(u.email) = LOWER(%s)
      AND (cp.expires_at IS NULL OR cp.expires_at > NOW())
    ORDER BY cp.is_read ASC, cp.created_at DESC
    LIMIT 100;
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, (email,))
            columns = [d[0] for d in cur.description]
            rows = cur.fetchall()
    return [dict(zip(columns, r)) for r in rows]


def mark_promotion_read(notification_id: int, email: str) -> bool:
    """Mark a single notification as read, scoped to the authenticated user's email."""
    sql = """
    UPDATE core.pe_customer_promotions cp
    SET is_read = TRUE
    FROM auth."user" u
    WHERE cp.id = %s
      AND u.id = cp.customer_id
      AND LOWER(u.email) = LOWER(%s);
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, (notification_id, email))
            updated = cur.rowcount
        conn.commit()
    return updated > 0


def mark_all_promotions_read(email: str) -> int:
    """Mark all unread notifications for the given user as read."""
    sql = """
    UPDATE core.pe_customer_promotions cp
    SET is_read = TRUE
    FROM auth."user" u
    WHERE u.id = cp.customer_id
      AND LOWER(u.email) = LOWER(%s)
      AND cp.is_read = FALSE;
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, (email,))
            updated = cur.rowcount
        conn.commit()
    return updated

# ── Product Suggestions (co-purchase / market basket) ─────

def get_product_suggestions_by_email(email: str, limit: int = 20) -> dict:
    """
    Collaborative-filtering product recommendations via market basket analysis.

    Algorithm
    ---------
    1. Resolve the customer via email → user.id.
    2. Collect all products the customer has already bought (my_products).
    3. Find co-buyers: other customers who bought any of those same products.
    4. Gather every product those co-buyers bought that the customer hasn't
       bought yet (candidates).
    5. Rank candidates by how many co-buyers purchased them.
    6. Enrich with product details + "because you bought …" context (max 3).
    """
    sql = """
    WITH
    -- Step 1: target customer
    target AS (
        SELECT id AS customer_id
        FROM   auth."user"
        WHERE  LOWER(email) = LOWER(%s)
        LIMIT  1
    ),
    -- Step 2: products already bought by this customer
    my_products AS (
        SELECT DISTINCT t.product_id::text AS product_id, p.name AS product_name
        FROM   core.transactions t
        JOIN   core.products p  ON p.id = t.product_id
        WHERE  t.customer_id = (SELECT customer_id FROM target)
    ),
    -- Step 3: other customers who share at least one purchase (co-buyers)
    co_buyers AS (
        SELECT DISTINCT t.customer_id,
               mp.product_id   AS trigger_id,
               mp.product_name AS trigger_name
        FROM   core.transactions t
        JOIN   my_products mp ON t.product_id::text = mp.product_id
        WHERE  t.customer_id != (SELECT customer_id FROM target)
    ),
    total_co_buyers AS (
        SELECT COUNT(DISTINCT customer_id) AS n FROM co_buyers
    ),
    -- Step 4: products bought by co-buyers that the customer hasn't bought
    candidates AS (
        SELECT  t.product_id::text AS product_id,
                COUNT(DISTINCT t.customer_id)    AS co_buyer_count,
                ARRAY_AGG(DISTINCT cb.trigger_name) AS because_of
        FROM    core.transactions t
        JOIN    co_buyers cb ON t.customer_id = cb.customer_id
        WHERE   t.product_id::text NOT IN (SELECT product_id FROM my_products)
        GROUP BY t.product_id
    )
    SELECT
        p.id::text                   AS product_id,
        p.name                       AS product_name,
        cat.name                     AS category,
        COALESCE(p.brand, '')        AS brand,
        CAST(p.price AS FLOAT)       AS price,
        p.image_url                  AS image_url,
        c.co_buyer_count,
        ROUND(
            CAST(c.co_buyer_count AS NUMERIC)
            / NULLIF((SELECT n FROM total_co_buyers), 0),
            4
        )                            AS confidence_score,
        c.because_of,
        (SELECT COUNT(*) FROM my_products) AS customer_products_count
    FROM candidates c
    JOIN core.products p   ON p.id::text = c.product_id
    JOIN core.categories cat ON cat.id = p.category_id
    ORDER BY c.co_buyer_count DESC
    LIMIT %s;
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, (email, limit))
            columns = [d[0] for d in cur.description]
            rows = cur.fetchall()

    if not rows:
        check_sql = 'SELECT 1 FROM auth."user" WHERE LOWER(email) = LOWER(%s) LIMIT 1'
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(check_sql, (email,))
                found = cur.fetchone() is not None
        return {
            "customer_found": found,
            "customer_products_count": 0,
            "suggestions": [],
            "total": 0,
        }

    suggestions = []
    customer_products_count = 0
    for row in rows:
        item = dict(zip(columns, row))
        customer_products_count = int(item.pop("customer_products_count", 0) or 0)
        because_of = item.pop("because_of", None) or []
        item["because_you_bought"] = list(because_of)[:3]
        item["price"]            = float(item["price"])            if item.get("price")            is not None else None
        item["confidence_score"] = float(item["confidence_score"]) if item.get("confidence_score") is not None else 0.0
        item["co_buyer_count"]   = int(item["co_buyer_count"])     if item.get("co_buyer_count")   is not None else 0
        suggestions.append(item)

    return {
        "customer_found": True,
        "customer_products_count": customer_products_count,
        "suggestions": suggestions,
        "total": len(suggestions),
    }


# ── Cart Co-purchase Recommendations ──────────────────────

def get_cart_recommendations(product_ids: list, limit: int = 10) -> dict:
    """
    Frequently-bought-together recommendations based on current cart contents.

    Uses the core.products and core.transactions tables directly.
    Product IDs passed in are storefront UUIDs (products.id).
    """
    if not product_ids:
        return {"recommendations": [], "cart_matched_count": 0, "total": 0}

    sql = """
    WITH
    -- Step 1: identify cart products
    cart_items AS (
        SELECT p.id::text AS product_id,
               p.name     AS product_name
        FROM   core.products p
        WHERE  p.id::text = ANY(%s)
    ),
    -- Step 2: customers who bought any cart item
    buyers AS (
        SELECT DISTINCT t.customer_id,
               ci.product_name AS trigger_name
        FROM   core.transactions t
        JOIN   cart_items ci ON t.product_id::text = ci.product_id
    ),
    total_buyers AS (
        SELECT COUNT(DISTINCT customer_id) AS n FROM buyers
    ),
    -- Step 3: products co-buyers bought, excluding cart items
    candidates AS (
        SELECT  t.product_id::text                                    AS product_id,
                COUNT(DISTINCT t.customer_id)                        AS co_buyer_count,
                ARRAY_AGG(DISTINCT b.trigger_name ORDER BY b.trigger_name) AS because_of
        FROM    core.transactions t
        JOIN    buyers b ON t.customer_id = b.customer_id
        WHERE   t.product_id::text NOT IN (SELECT product_id FROM cart_items)
        GROUP BY t.product_id
    )
    SELECT
        p.id::text             AS storefront_product_id,
        p.name                 AS product_name,
        cat.name               AS category,
        COALESCE(p.brand, '')  AS brand,
        CAST(p.price AS FLOAT) AS price,
        p.image_url            AS image_url,
        c.co_buyer_count,
        ROUND(
            CAST(c.co_buyer_count AS NUMERIC)
            / NULLIF((SELECT n FROM total_buyers), 0),
            4
        )                      AS confidence_score,
        c.because_of,
        (SELECT COUNT(*) FROM cart_items) AS cart_matched_count
    FROM   candidates c
    JOIN   core.products    p   ON p.id::text = c.product_id
    JOIN   core.categories  cat ON cat.id = p.category_id
    ORDER BY c.co_buyer_count DESC
    LIMIT  %s;
    """

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, (product_ids, limit))
            columns = [d[0] for d in cur.description]
            rows = cur.fetchall()

    if not rows:
        return {"recommendations": [], "cart_matched_count": 0, "total": 0}

    recommendations = []
    cart_matched_count = 0
    for row in rows:
        item = dict(zip(columns, row))
        cart_matched_count = int(item.pop("cart_matched_count", 0) or 0)
        because_of = item.pop("because_of", None) or []
        item["because_cart_items"] = list(because_of)[:3]
        item["price"]            = float(item["price"])            if item.get("price")            is not None else None
        item["confidence_score"] = float(item["confidence_score"]) if item.get("confidence_score") is not None else 0.0
        item["co_buyer_count"]   = int(item["co_buyer_count"])     if item.get("co_buyer_count")   is not None else 0
        recommendations.append(item)

    return {
        "recommendations": recommendations,
        "cart_matched_count": cart_matched_count,
        "total": len(recommendations),
    }


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
