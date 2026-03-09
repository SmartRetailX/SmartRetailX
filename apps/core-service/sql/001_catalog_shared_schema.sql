-- Shared catalog localization schema (single-schema mode)
-- Canonical product facts stay in public.products (core source of truth).
-- Sinhala text/aliases are stored in public tables and joined via product_id.
CREATE TABLE IF NOT EXISTS public.product_localization (
  product_id text NOT NULL,
  locale text NOT NULL DEFAULT 'si',
  product_name text,
  category text,
  brand text,
  base_product text,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  PRIMARY KEY (product_id, locale)
);
CREATE TABLE IF NOT EXISTS public.product_alias (
  product_id text NOT NULL,
  locale text NOT NULL DEFAULT 'si',
  alias text NOT NULL,
  normalized_alias text GENERATED ALWAYS AS (
    regexp_replace(lower(trim(alias)), '\\s+', ' ', 'g')
  ) STORED,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  PRIMARY KEY (product_id, locale, alias)
);
CREATE INDEX IF NOT EXISTS idx_product_alias_norm ON public.product_alias (locale, normalized_alias);
CREATE TABLE IF NOT EXISTS public.product_import_staging (
  product_id text,
  product_name text,
  category text,
  brand text,
  price text,
  base_product text,
  purchase_frequency text,
  product_name_si text,
  category_si text,
  brand_si text,
  base_product_si text,
  imported_at timestamptz NOT NULL DEFAULT NOW()
);
-- Add a stable external reference key on canonical products.
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS external_product_id text;
CREATE UNIQUE INDEX IF NOT EXISTS ux_products_external_product_id ON public.products (external_product_id)
WHERE external_product_id IS NOT NULL;
-- Resolve canonical + localization for all readers.
CREATE OR REPLACE VIEW public.v_products_resolved AS
SELECT p.id::text AS product_uuid,
  COALESCE(
    NULLIF(p.external_product_id, ''),
    p.sku,
    p.id::text
  ) AS product_id,
  p.sku,
  p.name AS product_name_en,
  l.product_name AS product_name_si,
  p.category AS category_en,
  l.category AS category_si,
  l.brand AS brand_si,
  l.base_product AS base_product_si,
  p.price,
  COALESCE(p.stock_quantity, 0) AS current_stock,
  'active'::text AS status,
  NULL::text AS store_id,
  NOW() AS updated_at
FROM public.products p
  LEFT JOIN public.product_localization l ON l.product_id = COALESCE(
    NULLIF(p.external_product_id, ''),
    p.sku,
    p.id::text
  )
  AND l.locale = 'si';