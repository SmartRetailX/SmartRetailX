-- Add base product columns to existing core products table.
-- Safe to run multiple times.
ALTER TABLE products
ADD COLUMN IF NOT EXISTS base_product varchar(255),
    ADD COLUMN IF NOT EXISTS base_product_si varchar(255);