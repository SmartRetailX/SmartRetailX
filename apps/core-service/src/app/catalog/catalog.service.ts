import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@smart-retail-x/config';
import { Pool } from 'pg';

type CatalogMatch = {
  productId: string;
  productUuid: string;
  sku: string | null;
  nameEn: string;
  nameSi: string | null;
  categoryEn: string;
  categorySi: string | null;
  brandSi: string | null;
  price: number;
  currentStock: number;
  status: string;
  storeId: string | null;
};

@Injectable()
export class CatalogService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CatalogService.name);
  private readonly pool: Pool;

  constructor(private readonly configService: ConfigService) {
    this.pool = new Pool({
      connectionString: this.configService.databaseUrl,
      min: this.configService.databasePoolMin,
      max: this.configService.databasePoolMax,
      connectionTimeoutMillis: 10_000,
      idleTimeoutMillis: 30_000,
      keepAlive: true,
    });

    this.pool.on('error', (error) => {
      this.logger.error(`Catalog pool error: ${error.message}`);
    });
  }

  async onModuleInit(): Promise<void> {
    await this.ensureCatalogSchema();
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }

  async search(term: string, limit = 5): Promise<{ success: boolean; term: string; matches: CatalogMatch[] }> {
    const normalizedTerm = this.normalizeTerm(term);
    if (!normalizedTerm) {
      return { success: true, term: '', matches: [] };
    }

    const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(limit, 20)) : 5;
    const tokens = this.buildSearchTokens(normalizedTerm);

    const result = await this.pool.query<{
      product_id: string;
      product_uuid: string;
      sku: string | null;
      product_name_en: string;
      product_name_si: string | null;
      category_en: string;
      category_si: string | null;
      brand_si: string | null;
      price: number;
      current_stock: number;
      status: string;
      store_id: string | null;
      token_hits: number;
    }>(
      `
      SELECT
        v.product_id,
        v.product_uuid,
        v.sku,
        v.product_name_en,
        v.product_name_si,
        v.category_en,
        v.category_si,
        v.brand_si,
        v.price,
        v.current_stock,
        v.status,
        v.store_id,
        (
          SELECT count(*)::int
          FROM unnest($2::text[]) AS t(token)
          WHERE
            lower(coalesce(v.product_name_si, '')) LIKE '%' || t.token || '%'
            OR lower(coalesce(v.product_name_en, '')) LIKE '%' || t.token || '%'
            OR lower(coalesce(v.category_si, '')) LIKE '%' || t.token || '%'
            OR lower(coalesce(v.category_en, '')) LIKE '%' || t.token || '%'
            OR EXISTS (
              SELECT 1
              FROM catalog.product_alias pa
              WHERE pa.product_id = v.product_id
                AND pa.locale = 'si'
                AND lower(pa.alias) LIKE '%' || t.token || '%'
            )
        ) AS token_hits
      FROM catalog.v_products_resolved v
      WHERE
        lower(coalesce(v.product_name_si, '')) LIKE '%' || $1 || '%'
        OR lower(coalesce(v.product_name_en, '')) LIKE '%' || $1 || '%'
        OR lower(coalesce(v.category_si, '')) LIKE '%' || $1 || '%'
        OR lower(coalesce(v.category_en, '')) LIKE '%' || $1 || '%'
        OR EXISTS (
          SELECT 1
          FROM catalog.product_alias pa
          WHERE pa.product_id = v.product_id
            AND pa.locale = 'si'
            AND lower(pa.alias) LIKE '%' || $1 || '%'
        )
        OR EXISTS (
          SELECT 1
          FROM unnest($2::text[]) AS t(token)
          WHERE
            lower(coalesce(v.product_name_si, '')) LIKE '%' || t.token || '%'
            OR lower(coalesce(v.product_name_en, '')) LIKE '%' || t.token || '%'
            OR lower(coalesce(v.category_si, '')) LIKE '%' || t.token || '%'
            OR lower(coalesce(v.category_en, '')) LIKE '%' || t.token || '%'
            OR EXISTS (
              SELECT 1
              FROM catalog.product_alias pa
              WHERE pa.product_id = v.product_id
                AND pa.locale = 'si'
                AND lower(pa.alias) LIKE '%' || t.token || '%'
            )
        )
      ORDER BY
        CASE
          WHEN lower(coalesce(v.product_name_si, '')) = $1 THEN 0
          WHEN lower(coalesce(v.product_name_en, '')) = $1 THEN 1
          WHEN EXISTS (
            SELECT 1
            FROM catalog.product_alias pa
            WHERE pa.product_id = v.product_id
              AND pa.locale = 'si'
              AND lower(pa.alias) = $1
          ) THEN 2
          WHEN lower(coalesce(v.product_name_si, '')) LIKE $1 || '%' THEN 3
          WHEN lower(coalesce(v.product_name_en, '')) LIKE $1 || '%' THEN 4
          ELSE 5
        END,
        token_hits DESC,
        v.product_name_en ASC
      LIMIT $3
      `,
      [normalizedTerm, tokens, safeLimit],
    );

    if (result.rows.length > 0) {
      this.logger.log(
        `Catalog match found: term="${normalizedTerm}" tokens=${tokens.length} results=${result.rows.length}`,
      );
    } else {
      this.logger.debug(`Catalog no match: term="${normalizedTerm}" tokens=${tokens.length}`);
    }

    const matches: CatalogMatch[] = result.rows.map((row) => ({
      productId: row.product_id,
      productUuid: row.product_uuid,
      sku: row.sku,
      nameEn: row.product_name_en,
      nameSi: row.product_name_si,
      categoryEn: row.category_en,
      categorySi: row.category_si,
      brandSi: row.brand_si,
      price: Number(row.price),
      currentStock: Number(row.current_stock),
      status: row.status,
      storeId: row.store_id,
    }));

    return {
      success: true,
      term: normalizedTerm,
      matches,
    };
  }

  private normalizeTerm(input: string): string {
    return input.toLowerCase().replace(/\s+/g, ' ').trim();
  }

  private buildSearchTokens(normalizedTerm: string): string[] {
    const stopWords = new Set([
      'what',
      'is',
      'the',
      'of',
      'for',
      'show',
      'me',
      'please',
      'can',
      'you',
      'tell',
      'about',
      'do',
      'have',
      'any',
      'with',
      'and',
      'to',
      'in',
      'on',
      'price',
      'details',
      'product',
      'products',
      'මට',
      'වල',
      'සඳහා',
      'දෙන්න',
      'ලබාදෙන්න',
      'බලන්න',
      'මිල',
      'එක',
      'ගේ',
      'ගැන',
    ]);

    const tokens = normalizedTerm
      .split(/\s+/)
      .map((token) => token.replace(/^[^\p{L}\p{N}\p{M}]+|[^\p{L}\p{N}\p{M}]+$/gu, ''))
      .filter((token) => (token.length >= 2 || /^\d+$/.test(token)) && !stopWords.has(token));

    const uniqueTokens = Array.from(new Set(tokens)).slice(0, 8);
    if (!uniqueTokens.length && normalizedTerm.length >= 2) {
      return [normalizedTerm];
    }

    return uniqueTokens;
  }

  private async ensureCatalogSchema(): Promise<void> {
    await this.pool.query('CREATE SCHEMA IF NOT EXISTS catalog');

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS catalog.product_localization (
        product_id text NOT NULL,
        locale text NOT NULL DEFAULT 'si',
        product_name text,
        category text,
        brand text,
        base_product text,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        PRIMARY KEY (product_id, locale)
      )
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS catalog.product_alias (
        product_id text NOT NULL,
        locale text NOT NULL DEFAULT 'si',
        alias text NOT NULL,
        normalized_alias text GENERATED ALWAYS AS (regexp_replace(lower(trim(alias)), '\\s+', ' ', 'g')) STORED,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        PRIMARY KEY (product_id, locale, alias)
      )
    `);

    await this.pool.query(`
      CREATE INDEX IF NOT EXISTS idx_product_alias_norm
        ON catalog.product_alias (locale, normalized_alias)
    `);

    await this.pool.query(`
      ALTER TABLE public.products
        ADD COLUMN IF NOT EXISTS external_product_id text
    `);

    await this.pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_products_external_product_id
        ON public.products (external_product_id)
        WHERE external_product_id IS NOT NULL
    `);

    await this.pool.query(`
      CREATE OR REPLACE VIEW catalog.v_products_resolved AS
      SELECT
        p.id::text AS product_uuid,
        COALESCE(NULLIF(p.external_product_id, ''), p.sku, p.id::text) AS product_id,
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
      LEFT JOIN catalog.product_localization l
        ON l.product_id = COALESCE(NULLIF(p.external_product_id, ''), p.sku, p.id::text)
       AND l.locale = 'si'
    `);
  }
}
