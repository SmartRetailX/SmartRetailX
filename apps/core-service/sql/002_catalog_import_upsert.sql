-- Import flow for Excel -> CSV -> staging -> localization + aliases.
-- 1) Load CSV into staging from psql:
-- \copy public.product_import_staging(
--   product_id, product_name, category, brand, price, base_product, purchase_frequency,
--   product_name_si, category_si, brand_si, base_product_si
-- ) FROM '/absolute/path/product_i18n.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8');
-- 2) Upsert canonical products from staging so catalog keys always map.
WITH normalized_staging AS (
  SELECT DISTINCT NULLIF(trim(product_id), '') AS product_id,
    NULLIF(trim(product_name), '') AS product_name_en,
    NULLIF(trim(category), '') AS category_en,
    NULLIF(
      regexp_replace(trim(coalesce(price, '')), '[^0-9\.-]', '', 'g'),
      ''
    ) AS price_text,
    NULLIF(trim(product_name_si), '') AS product_name_si
  FROM public.product_import_staging
  WHERE NULLIF(trim(product_id), '') IS NOT NULL
)
INSERT INTO public.products (
    name,
    description,
    price,
    stock_quantity,
    category,
    image_url,
    sku,
    is_active,
    created_by,
    external_product_id,
    created_at,
    updated_at
  )
SELECT COALESCE(
    product_name_en,
    product_name_si,
    'Imported Product ' || product_id
  ) AS name,
  NULL AS description,
  COALESCE(price_text::numeric, 0::numeric) AS price,
  0 AS stock_quantity,
  category_en AS category,
  NULL AS image_url,
  product_id AS sku,
  TRUE AS is_active,
  'catalog-import' AS created_by,
  product_id AS external_product_id,
  NOW() AS created_at,
  NOW() AS updated_at
FROM normalized_staging ON CONFLICT (sku) DO
UPDATE
SET name = COALESCE(NULLIF(EXCLUDED.name, ''), public.products.name),
  category = COALESCE(EXCLUDED.category, public.products.category),
  price = CASE
    WHEN EXCLUDED.price > 0 THEN EXCLUDED.price
    ELSE public.products.price
  END,
  external_product_id = COALESCE(
    public.products.external_product_id,
    EXCLUDED.external_product_id
  ),
  updated_at = NOW();
-- 3) Best-effort backfill of external ids for pre-existing products.
UPDATE public.products p
SET external_product_id = s.product_id
FROM public.product_import_staging s
WHERE p.external_product_id IS NULL
  AND NULLIF(trim(s.product_id), '') IS NOT NULL
  AND (
    p.sku = trim(s.product_id)
    OR lower(p.name) = lower(trim(s.product_name))
  );
-- 4) Resolve each staging row to a canonical product id used by localization tables.
WITH resolved_import AS (
  SELECT DISTINCT COALESCE(
      NULLIF(trim(p.external_product_id), ''),
      NULLIF(trim(p.sku), ''),
      p.id::text,
      NULLIF(trim(s.product_id), '')
    ) AS resolved_product_id,
    NULLIF(trim(s.product_name_si), '') AS product_name_si,
    NULLIF(trim(s.category_si), '') AS category_si,
    NULLIF(trim(s.brand_si), '') AS brand_si,
    NULLIF(trim(s.base_product_si), '') AS base_product_si
  FROM public.product_import_staging s
    LEFT JOIN public.products p ON (
      NULLIF(trim(s.product_id), '') IS NOT NULL
      AND (
        p.external_product_id = trim(s.product_id)
        OR p.sku = trim(s.product_id)
      )
    )
    OR (
      NULLIF(trim(s.product_name), '') IS NOT NULL
      AND lower(p.name) = lower(trim(s.product_name))
    )
) -- 5) Upsert Sinhala localization.
INSERT INTO public.product_localization (
    product_id,
    locale,
    product_name,
    category,
    brand,
    base_product,
    updated_at
  )
SELECT resolved_product_id AS product_id,
  'si' AS locale,
  product_name_si AS product_name,
  category_si AS category,
  brand_si AS brand,
  base_product_si AS base_product,
  NOW() AS updated_at
FROM resolved_import
WHERE resolved_product_id IS NOT NULL ON CONFLICT (product_id, locale) DO
UPDATE
SET product_name = EXCLUDED.product_name,
  category = EXCLUDED.category,
  brand = EXCLUDED.brand,
  base_product = EXCLUDED.base_product,
  updated_at = NOW();
-- 6) Upsert aliases for matching Sinhala user queries.
WITH resolved_import AS (
  SELECT DISTINCT COALESCE(
      NULLIF(trim(p.external_product_id), ''),
      NULLIF(trim(p.sku), ''),
      p.id::text,
      NULLIF(trim(s.product_id), '')
    ) AS resolved_product_id,
    NULLIF(trim(s.product_name_si), '') AS product_name_si,
    NULLIF(trim(s.base_product_si), '') AS base_product_si
  FROM public.product_import_staging s
    LEFT JOIN public.products p ON (
      NULLIF(trim(s.product_id), '') IS NOT NULL
      AND (
        p.external_product_id = trim(s.product_id)
        OR p.sku = trim(s.product_id)
      )
    )
    OR (
      NULLIF(trim(s.product_name), '') IS NOT NULL
      AND lower(p.name) = lower(trim(s.product_name))
    )
)
INSERT INTO public.product_alias (product_id, locale, alias)
SELECT product_id,
  'si',
  alias
FROM (
    SELECT resolved_product_id AS product_id,
      product_name_si AS alias
    FROM resolved_import
    UNION ALL
    SELECT resolved_product_id AS product_id,
      base_product_si AS alias
    FROM resolved_import
  ) t
WHERE t.product_id IS NOT NULL
  AND t.alias IS NOT NULL ON CONFLICT (product_id, locale, alias) DO NOTHING;
-- 7) Optional cleanup after successful run.
-- TRUNCATE TABLE public.product_import_staging;