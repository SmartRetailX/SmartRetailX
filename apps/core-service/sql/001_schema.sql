-- ============================================================================
-- SMART RETAIL X - Core Service Database Schema
-- ============================================================================
-- Simple e-commerce schema: products, carts, orders
-- Better Auth tables and agent_chat tables are in api-gateway migrations
-- ============================================================================
-- ============================================================================
-- PRODUCTS TABLE
-- ============================================================================
-- Product catalog with inline Sinhala translations
CREATE TABLE IF NOT EXISTS products (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sku varchar(50) NOT NULL UNIQUE,
    name varchar(255) NOT NULL,
    name_si varchar(255),
    -- Sinhala name
    base_product varchar(255),
    base_product_si varchar(255),
    -- Canonical/base product name (EN/SI)
    description text,
    description_si text,
    -- Sinhala description
    category varchar(100),
    category_si varchar(100),
    -- Sinhala category
    price numeric(12, 2) NOT NULL CHECK (price >= 0),
    stock_quantity integer NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    image_url text,
    is_active boolean NOT NULL DEFAULT true,
    created_by text,
    created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW()
);
ALTER TABLE products
ADD COLUMN IF NOT EXISTS base_product varchar(255),
    ADD COLUMN IF NOT EXISTS base_product_si varchar(255);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active)
WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
COMMENT ON TABLE products IS 'Product catalog with Sinhala translations';
-- ============================================================================
-- CARTS TABLE
-- ============================================================================
-- Shopping carts per user
CREATE TABLE IF NOT EXISTS carts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id text NOT NULL,
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'abandoned', 'converted')),
    created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_carts_user_id ON carts(user_id);
CREATE INDEX IF NOT EXISTS idx_carts_user_active ON carts(user_id, status)
WHERE status = 'active';
COMMENT ON TABLE carts IS 'Shopping carts for users';
-- ============================================================================
-- CART ITEMS TABLE
-- ============================================================================
-- Items in a shopping cart
CREATE TABLE IF NOT EXISTS cart_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    cart_id uuid NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
    product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price numeric(12, 2) NOT NULL,
    created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW(),
    UNIQUE (cart_id, product_id)
);
CREATE INDEX IF NOT EXISTS idx_cart_items_cart_id ON cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_product_id ON cart_items(product_id);
COMMENT ON TABLE cart_items IS 'Line items within a shopping cart';
-- ============================================================================
-- ORDERS TABLE
-- ============================================================================
-- Customer orders
CREATE TABLE IF NOT EXISTS orders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number varchar(30) NOT NULL UNIQUE,
    user_id text NOT NULL,
    status text NOT NULL DEFAULT 'pending' CHECK (
        status IN (
            'pending',
            'confirmed',
            'processing',
            'shipped',
            'delivered',
            'cancelled'
        )
    ),
    subtotal numeric(12, 2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
    discount numeric(12, 2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
    tax numeric(12, 2) NOT NULL DEFAULT 0 CHECK (tax >= 0),
    total numeric(12, 2) NOT NULL DEFAULT 0 CHECK (total >= 0),
    shipping_address text,
    billing_address text,
    notes text,
    created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
COMMENT ON TABLE orders IS 'Customer orders';
-- ============================================================================
-- ORDER ITEMS TABLE
-- ============================================================================
-- Line items in an order (snapshot of product at purchase time)
CREATE TABLE IF NOT EXISTS order_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    product_name varchar(255) NOT NULL,
    product_name_si varchar(255),
    product_sku varchar(50) NOT NULL,
    quantity integer NOT NULL CHECK (quantity > 0),
    unit_price numeric(12, 2) NOT NULL CHECK (unit_price >= 0),
    total_price numeric(12, 2) NOT NULL CHECK (total_price >= 0),
    created_at timestamptz NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
COMMENT ON TABLE order_items IS 'Order line items with product snapshot';
-- ============================================================================
-- TRIGGERS FOR updated_at
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_products_updated_at ON products;
CREATE TRIGGER trg_products_updated_at BEFORE
UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS trg_carts_updated_at ON carts;
CREATE TRIGGER trg_carts_updated_at BEFORE
UPDATE ON carts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS trg_cart_items_updated_at ON cart_items;
CREATE TRIGGER trg_cart_items_updated_at BEFORE
UPDATE ON cart_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS trg_orders_updated_at ON orders;
CREATE TRIGGER trg_orders_updated_at BEFORE
UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();