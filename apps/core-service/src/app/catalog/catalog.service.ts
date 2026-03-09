import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@smart-retail-x/config';
import { buildCatalogQueryTokens, normalizeCatalogQuery } from '@smart-retail-x/shared-types';
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
  tokenHits: number;
  exactHit: boolean;
  prefixHit: boolean;
  matchScore: number;
};

type CatalogSearchResponse = {
  success: boolean;
  term: string;
  matches: CatalogMatch[];
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

  async search(term: string, limit = 5): Promise<CatalogSearchResponse> {
    const normalizedTerm = normalizeCatalogQuery(term);
    if (!normalizedTerm) {
      return { success: true, term: '', matches: [] };
    }

    const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(limit, 20)) : 5;
    const tokens = buildCatalogQueryTokens(normalizedTerm);

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
      exact_hit: boolean;
      prefix_hit: boolean;
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
          lower(coalesce(v.product_name_si, '')) = $1
          OR lower(coalesce(v.product_name_en, '')) = $1
          OR EXISTS (
            SELECT 1
            FROM public.product_alias pa
            WHERE pa.product_id = v.product_id
              AND pa.locale = 'si'
              AND lower(pa.alias) = $1
          )
        ) AS exact_hit,
        (
          lower(coalesce(v.product_name_si, '')) LIKE $1 || '%'
          OR lower(coalesce(v.product_name_en, '')) LIKE $1 || '%'
        ) AS prefix_hit,
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
              FROM public.product_alias pa
              WHERE pa.product_id = v.product_id
                AND pa.locale = 'si'
                AND lower(pa.alias) LIKE '%' || t.token || '%'
            )
        ) AS token_hits
      FROM public.v_products_resolved v
      WHERE
        lower(coalesce(v.product_name_si, '')) LIKE '%' || $1 || '%'
        OR lower(coalesce(v.product_name_en, '')) LIKE '%' || $1 || '%'
        OR lower(coalesce(v.category_si, '')) LIKE '%' || $1 || '%'
        OR lower(coalesce(v.category_en, '')) LIKE '%' || $1 || '%'
        OR EXISTS (
          SELECT 1
          FROM public.product_alias pa
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
              FROM public.product_alias pa
              WHERE pa.product_id = v.product_id
                AND pa.locale = 'si'
                AND lower(pa.alias) LIKE '%' || t.token || '%'
            )
        )
      ORDER BY
        exact_hit DESC,
        prefix_hit DESC,
        token_hits DESC,
        v.product_name_en ASC
      LIMIT $3
      `,
      [normalizedTerm, tokens, safeLimit],
    );

    const mappedMatches = result.rows.map((row) => this.toCatalogMatch(row));
    const filteredMatches = mappedMatches.filter((match) => this.isRelevantMatch(match, tokens));

    if (filteredMatches.length > 0) {
      this.logger.log(
        `Catalog match found: term="${normalizedTerm}" tokens=${tokens.length} results=${filteredMatches.length}`,
      );
    } else {
      this.logger.debug(`Catalog no match: term="${normalizedTerm}" tokens=${tokens.length}`);
    }

    return {
      success: true,
      term: normalizedTerm,
      matches: filteredMatches,
    };
  }

  private toCatalogMatch(row: {
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
    exact_hit: boolean;
    prefix_hit: boolean;
  }): CatalogMatch {
    const tokenHits = Number(row.token_hits) || 0;
    const exactHit = !!row.exact_hit;
    const prefixHit = !!row.prefix_hit;

    return {
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
      tokenHits,
      exactHit,
      prefixHit,
      matchScore: this.calculateMatchScore({ tokenHits, exactHit, prefixHit }),
    };
  }

  private calculateMatchScore(params: {
    tokenHits: number;
    exactHit: boolean;
    prefixHit: boolean;
  }): number {
    let score = Math.min(params.tokenHits, 6) * 12;
    if (params.prefixHit) {
      score += 30;
    }
    if (params.exactHit) {
      score += 70;
    }
    return score;
  }

  private isRelevantMatch(match: CatalogMatch, tokens: string[]): boolean {
    if (match.exactHit || match.prefixHit) {
      return true;
    }

    if (tokens.length >= 2) {
      return match.tokenHits >= 2;
    }

    const singleToken = tokens[0] ?? '';
    if (singleToken.length <= 3) {
      return false;
    }

    return match.tokenHits >= 1;
  }

  private async ensureCatalogSchema(): Promise<void> {
    await this.pool.query(`
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
      )
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS public.product_alias (
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
        ON public.product_alias (locale, normalized_alias)
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
      CREATE OR REPLACE VIEW public.v_products_resolved AS
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
      LEFT JOIN public.product_localization l
        ON l.product_id = COALESCE(NULLIF(p.external_product_id, ''), p.sku, p.id::text)
       AND l.locale = 'si'
    `);
  }
}
