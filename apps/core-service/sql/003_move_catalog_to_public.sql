-- One-time migration: consolidate catalog tables/views into public schema.
-- Safe to rerun. It merges data from catalog.* into public.* when source objects exist.
BEGIN;
-- Ensure destination tables exist in public.
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
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS external_product_id text;
CREATE UNIQUE INDEX IF NOT EXISTS ux_products_external_product_id ON public.products (external_product_id)
WHERE external_product_id IS NOT NULL;
-- Merge localization rows from catalog -> public when old table exists.
DO $$ BEGIN IF to_regclass('catalog.product_localization') IS NOT NULL THEN
INSERT INTO public.product_localization (
        product_id,
        locale,
        product_name,
        category,
        brand,
        base_product,
        created_at,
        updated_at
    )
SELECT src.product_id,
    src.locale,
    src.product_name,
    src.category,
    src.brand,
    src.base_product,
    src.created_at,
    src.updated_at
FROM catalog.product_localization src ON CONFLICT (product_id, locale) DO
UPDATE
SET product_name = COALESCE(
        EXCLUDED.product_name,
        public.product_localization.product_name
    ),
    category = COALESCE(
        EXCLUDED.category,
        public.product_localization.category
    ),
    brand = COALESCE(
        EXCLUDED.brand,
        public.product_localization.brand
    ),
    base_product = COALESCE(
        EXCLUDED.base_product,
        public.product_localization.base_product
    ),
    updated_at = GREATEST(
        public.product_localization.updated_at,
        EXCLUDED.updated_at
    );
END IF;
END $$;
-- Merge alias rows from catalog -> public when old table exists.
DO $$ BEGIN IF to_regclass('catalog.product_alias') IS NOT NULL THEN
INSERT INTO public.product_alias (product_id, locale, alias, created_at)
SELECT src.product_id,
    src.locale,
    src.alias,
    src.created_at
FROM catalog.product_alias src ON CONFLICT (product_id, locale, alias) DO NOTHING;
END IF;
END $$;
-- Move staging rows from catalog -> public when old table exists.
DO $$ BEGIN IF to_regclass('catalog.product_import_staging') IS NOT NULL THEN
INSERT INTO public.product_import_staging (
        product_id,
        product_name,
        category,
        brand,
        price,
        base_product,
        purchase_frequency,
        product_name_si,
        category_si,
        brand_si,
        base_product_si,
        imported_at
    )
SELECT src.product_id,
    src.product_name,
    src.category,
    src.brand,
    src.price,
    src.base_product,
    src.purchase_frequency,
    src.product_name_si,
    src.category_si,
    src.brand_si,
    src.base_product_si,
    src.imported_at
FROM catalog.product_import_staging src;
END IF;
END $$;
-- Rebuild resolved view in public.
DROP VIEW IF EXISTS catalog.v_products_resolved;
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
-- Remove old catalog objects once data is merged.
DROP TABLE IF EXISTS catalog.product_alias;
DROP TABLE IF EXISTS catalog.product_localization;
DROP TABLE IF EXISTS catalog.product_import_staging;
-- Drop catalog schema only if no remaining relations.
DO $$ BEGIN IF EXISTS (
    SELECT 1
    FROM pg_namespace
    WHERE nspname = 'catalog'
)
AND NOT EXISTS (
    SELECT 1
    FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'catalog'
) THEN EXECUTE 'DROP SCHEMA catalog';
END IF;
END $$;
COMMIT;