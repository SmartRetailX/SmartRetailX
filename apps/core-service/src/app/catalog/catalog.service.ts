import { Injectable, Logger } from '@nestjs/common';
import { Prisma, PurchaseFrequency, StockEntryType } from '@prisma/client';
import { PrismaService } from '@smart-retail-x/database';
import { buildCatalogQueryTokens, normalizeCatalogQuery } from '@smart-retail-x/shared-types';

import { CatalogTranslationService } from './catalog-translation.service';
import { InventoryService } from './inventory.service';
import { findFuzzyProductCandidates } from './product-fuzzy-model';

type CatalogMatch = {
  productId: string;
  sku: string;
  name: string;
  nameSi: string | null;
  brand: string;
  categoryId: string;
  category: string;
  categoryNameSi: string | null;
  price: number;
  currentStock: number;
  imageUrl: string | null;
  isActive: boolean;
};

type CatalogSearchResponse = {
  success: boolean;
  term: string;
  matches: CatalogMatch[];
};

type CatalogSearchRow = Prisma.ProductGetPayload<{
  include: {
    category: true;
  };
}>;

type CatalogScoredRow = {
  row: CatalogSearchRow;
  exact: boolean;
  starts: boolean;
  phrase: boolean;
  tokenHits: number;
  leadingTokenHit: boolean;
  fuzzyScore: number;
  dbScore: number;
};

type CatalogCandidateScoreRow = {
  productId: string;
  score: number;
};

type ProductStockEntry = {
  id: string;
  quantityChange: number;
  balanceAfter: number;
  type: StockEntryType;
  note: string | null;
  referenceId: string | null;
  createdBy: string | null;
  createdAt: string;
};

type CatalogListProduct = {
  id: string;
  sku: string;
  name: string;
  nameSi: string | null;
  description: string | null;
  descriptionSi: string | null;
  categoryId: string;
  category: string;
  categoryNameSi: string | null;
  price: number;
  currentStock: number;
  brand: string;
  purchaseFrequency: PurchaseFrequency;
  imageUrl: string | null;
  isActive: boolean;
  status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  createdBy: string | null;
  createdAt: string;
  updatedAt?: string;
  stockEntries?: ProductStockEntry[];
};

type CatalogListResponse = {
  success: boolean;
  data: {
    products: CatalogListProduct[];
    pagination: {
      page: number;
      limit: number;
      offset: number;
      total: number;
      totalPages: number;
    };
  };
};

type CatalogCategoriesResponse = {
  success: boolean;
  data: {
    categories: string[];
  };
};

type AdminCategory = {
  id: string;
  name: string;
  nameSi: string | null;
  productCount: number;
  createdAt: string;
  updatedAt: string;
};

type AdminCategoryListResponse = {
  success: boolean;
  data: {
    categories: AdminCategory[];
  };
};

type ProductInput = {
  sku: string;
  name: string;
  nameSi?: string;
  description?: string;
  descriptionSi?: string;
  categoryId?: string;
  categoryName?: string;
  categoryNameSi?: string;
  price: number;
  stockQuantity: number;
  brand?: string;
  purchaseFrequency?: PurchaseFrequency;
  imageUrl?: string;
  isActive?: boolean;
  createdBy?: string;
};

type ProductUpdateInput = Partial<Omit<ProductInput, 'sku' | 'createdBy' | 'stockQuantity'>> & {
  stockQuantity?: number;
  createdBy?: string;
};

type ProductRow = Prisma.ProductGetPayload<{
  include: {
    category: true;
    stockEntries: {
      orderBy: { createdAt: 'desc' };
      take: 10;
    };
  };
}>;

function stockStatus(qty: number): CatalogListProduct['status'] {
  if (qty <= 0) return 'OUT_OF_STOCK';
  if (qty <= 5) return 'LOW_STOCK';
  return 'IN_STOCK';
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function toStockEntry(entry: ProductRow['stockEntries'][number]): ProductStockEntry {
  return {
    id: entry.id,
    quantityChange: entry.quantityChange,
    balanceAfter: entry.balanceAfter,
    type: entry.type,
    note: entry.note,
    referenceId: entry.referenceId,
    createdBy: entry.createdBy,
    createdAt: entry.createdAt.toISOString(),
  };
}

function toProduct(row: ProductRow, includeStockEntries = false): CatalogListProduct {
  const result: CatalogListProduct = {
    id: row.productId,
    sku: row.sku,
    name: row.name,
    nameSi: row.nameSi,
    description: row.description,
    descriptionSi: row.descriptionSi,
    categoryId: row.categoryId,
    category: row.category.name,
    categoryNameSi: row.category.nameSi,
  price: Number(row.price),
  currentStock: row.stockQuantity,
  brand: row.brand,
  purchaseFrequency: row.purchaseFrequency,
  imageUrl: row.imageUrl,
    isActive: row.isActive,
    status: stockStatus(row.stockQuantity),
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };

  if (includeStockEntries) {
    result.stockEntries = row.stockEntries.map(toStockEntry);
  }

  return result;
}

@Injectable()
export class CatalogService {
  private readonly logger = new Logger(CatalogService.name);
  private pgTrgmReady = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService,
    private readonly catalogTranslationService: CatalogTranslationService,
  ) {}

  async search(term: string, limit = 5): Promise<CatalogSearchResponse> {
    const normalizedTerm = normalizeCatalogQuery(term);
    if (!normalizedTerm) {
      return { success: true, term: '', matches: [] };
    }

    const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(limit, 20)) : 5;
    const queryTokens = buildCatalogQueryTokens(normalizedTerm);
    const searchTokens = queryTokens.length > 0 ? queryTokens : [normalizedTerm];
    const rows = await this.fetchCatalogSearchCandidates(normalizedTerm, searchTokens, safeLimit);
    const fuzzyScoreBySku = new Map(
      findFuzzyProductCandidates(normalizedTerm, rows, Math.max(safeLimit * 5, 25)).map((entry) => [
        entry.sku.toLowerCase(),
        entry.score,
      ]),
    );

    const scoredRows = rows
      .map((row) => this.scoreCatalogRow(row, normalizedTerm, searchTokens, fuzzyScoreBySku))
      .filter(
        (entry) =>
          entry.tokenHits > 0 ||
          entry.exact ||
          entry.starts ||
          entry.phrase ||
          (entry.fuzzyScore >= 0.56 && entry.dbScore >= 72),
      )
      .sort(
        (a, b) =>
          Number(b.exact) - Number(a.exact) ||
          Number(b.starts) - Number(a.starts) ||
          Number(b.phrase) - Number(a.phrase) ||
          b.dbScore - a.dbScore ||
          b.tokenHits - a.tokenHits ||
          Number(b.leadingTokenHit) - Number(a.leadingTokenHit) ||
          b.fuzzyScore - a.fuzzyScore ||
          b.row.stockQuantity - a.row.stockQuantity ||
          a.row.name.localeCompare(b.row.name),
      )
      .slice(0, safeLimit);

    const matches = scoredRows.map(({ row }) => ({
      productId: row.productId,
      sku: row.sku,
      name: row.name,
      nameSi: row.nameSi,
      brand: row.brand,
      categoryId: row.categoryId,
      category: row.category.name,
      categoryNameSi: row.category.nameSi,
      price: Number(row.price),
      currentStock: row.stockQuantity,
      imageUrl: row.imageUrl,
      isActive: row.isActive,
    }));

    return { success: true, term: normalizedTerm, matches };
  }

  private scoreCatalogRow(
    row: CatalogSearchRow,
    normalizedTerm: string,
    searchTokens: string[],
    fuzzyScoreBySku: Map<string, number>,
  ): CatalogScoredRow {
    const searchableFields = [
      row.name,
      row.nameSi,
      row.description,
      row.descriptionSi,
      row.sku,
      row.brand,
      row.category.name,
      row.category.nameSi,
    ]
      .map((value) => normalizeCatalogQuery(value || ''))
      .filter(Boolean);

    const name = normalizeCatalogQuery(row.name || '');
    const nameSi = normalizeCatalogQuery(row.nameSi || '');
    const exact = name === normalizedTerm || nameSi === normalizedTerm || row.sku.toLowerCase() === normalizedTerm;
    const starts = name.startsWith(normalizedTerm) || nameSi.startsWith(normalizedTerm);
    const phrase = searchableFields.some((field) => field.includes(normalizedTerm));
    const tokenHits = searchTokens.filter((token) => searchableFields.some((field) => field.includes(token))).length;
    const leadingToken = searchTokens[0] || '';
    const leadingTokenHit = Boolean(leadingToken && searchableFields.some((field) => field.includes(leadingToken)));
    const fuzzyScore = fuzzyScoreBySku.get(row.sku.toLowerCase()) || 0;
    const dbScore = this.computeDbSearchScore(row, normalizedTerm, searchTokens);

    return { row, exact, starts, phrase, tokenHits, leadingTokenHit, fuzzyScore, dbScore };
  }

  private async fetchCatalogSearchCandidates(
    normalizedTerm: string,
    searchTokens: string[],
    safeLimit: number,
  ): Promise<CatalogSearchRow[]> {
    await this.ensurePgTrgmReady();

    const trgmCandidates = await this.fetchTrgmCandidateIds(normalizedTerm, searchTokens, Math.max(safeLimit * 25, 120));
    if (trgmCandidates.length > 0) {
      const scoreById = new Map(trgmCandidates.map((row) => [row.productId, row.score]));
      const rows = await this.prisma.product.findMany({
        where: {
          isActive: true,
          productId: { in: trgmCandidates.map((row) => row.productId) },
        },
        include: {
          category: true,
        },
      });

      return rows.sort(
        (a, b) =>
          (scoreById.get(b.productId) || 0) - (scoreById.get(a.productId) || 0) ||
          b.stockQuantity - a.stockQuantity ||
          a.name.localeCompare(b.name),
      );
    }

    const tokenSet = Array.from(new Set([normalizedTerm, ...searchTokens].filter(Boolean))).slice(0, 8);
    const orFilters: Prisma.ProductWhereInput[] = tokenSet.flatMap((token) => [
      { name: { contains: token, mode: 'insensitive' } },
      { nameSi: { contains: token, mode: 'insensitive' } },
      { description: { contains: token, mode: 'insensitive' } },
      { descriptionSi: { contains: token, mode: 'insensitive' } },
      { sku: { contains: token, mode: 'insensitive' } },
      { brand: { contains: token, mode: 'insensitive' } },
      { category: { name: { contains: token, mode: 'insensitive' } } },
      { category: { nameSi: { contains: token, mode: 'insensitive' } } },
    ]);

    const strictCandidates = await this.prisma.product.findMany({
      where: {
        isActive: true,
        OR: orFilters.length > 0 ? orFilters : undefined,
      },
      include: {
        category: true,
      },
      take: Math.max(safeLimit * 40, 400),
      orderBy: [{ name: 'asc' }],
    });

    if (strictCandidates.length >= Math.max(safeLimit * 3, 15)) {
      return strictCandidates;
    }

    // Fallback candidate expansion so fuzzy-only user input can still resolve.
    const relaxedCandidates = await this.prisma.product.findMany({
      where: {
        isActive: true,
      },
      include: {
        category: true,
      },
      take: Math.max(safeLimit * 80, 800),
      orderBy: [{ name: 'asc' }],
    });

    const bySku = new Map<string, CatalogSearchRow>();
    for (const row of [...strictCandidates, ...relaxedCandidates]) {
      bySku.set(row.sku.toLowerCase(), row);
    }

    return Array.from(bySku.values());
  }

  private async ensurePgTrgmReady(): Promise<void> {
    if (this.pgTrgmReady) {
      return;
    }

    try {
      await this.prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS pg_trgm');
      this.pgTrgmReady = true;
    } catch (error) {
      this.logger.warn(`pg_trgm extension init failed, falling back to lexical search: ${(error as Error).message}`);
    }
  }

  private async fetchTrgmCandidateIds(
    normalizedTerm: string,
    searchTokens: string[],
    maxCandidates: number,
  ): Promise<CatalogCandidateScoreRow[]> {
    const tokenSet = Array.from(new Set([normalizedTerm, ...searchTokens].filter(Boolean))).slice(0, 8);

    if (tokenSet.length === 0) {
      return [];
    }

    try {
      const rows = await this.prisma.$queryRaw<Array<{ product_id: string; score: number }>>(Prisma.sql`
        WITH q AS (
          SELECT ${normalizedTerm}::text AS term
        ),
        tokens AS (
          SELECT unnest(${tokenSet}::text[]) AS token
        ),
        alias_scores AS (
          SELECT
            pa.product_id,
            MAX(similarity(pa.alias_normalized, q.term)) AS alias_sim,
            MAX(CASE WHEN pa.alias_normalized = q.term THEN 1 ELSE 0 END) AS alias_exact,
            MAX(CASE WHEN pa.alias_normalized LIKE q.term || '%' THEN 1 ELSE 0 END) AS alias_prefix,
            COUNT(*) FILTER (
              WHERE EXISTS (
                SELECT 1
                FROM tokens t
                WHERE pa.alias_normalized LIKE '%' || t.token || '%'
              )
            ) AS alias_token_hits
          FROM core.product_aliases pa
          CROSS JOIN q
          WHERE pa.alias_normalized % q.term
            OR EXISTS (
              SELECT 1
              FROM tokens t
              WHERE pa.alias_normalized LIKE '%' || t.token || '%'
            )
          GROUP BY pa.product_id
        ),
        product_scores AS (
          SELECT
            p.id AS product_id,
            GREATEST(
              similarity(lower(p.name), q.term),
              similarity(lower(COALESCE(p.name_si, '')), q.term),
              similarity(lower(COALESCE(p.brand, '')), q.term),
              similarity(lower(p.sku), q.term)
            ) AS base_sim,
            MAX(CASE WHEN lower(p.name) = q.term OR lower(p.sku) = q.term THEN 1 ELSE 0 END) AS exact_hit,
            MAX(CASE WHEN lower(p.name) LIKE q.term || '%' THEN 1 ELSE 0 END) AS prefix_hit,
            (
              SELECT COUNT(*)
              FROM tokens t
              WHERE lower(p.name) LIKE '%' || t.token || '%'
                OR lower(COALESCE(p.name_si, '')) LIKE '%' || t.token || '%'
                OR lower(COALESCE(p.brand, '')) LIKE '%' || t.token || '%'
                OR lower(p.sku) LIKE '%' || t.token || '%'
            ) AS token_hits
          FROM core.products p
          CROSS JOIN q
          WHERE p.is_active = true
            AND (
              lower(p.name) % q.term
              OR lower(COALESCE(p.name_si, '')) % q.term
              OR lower(COALESCE(p.brand, '')) % q.term
              OR lower(p.sku) % q.term
              OR EXISTS (
                SELECT 1
                FROM tokens t
                WHERE lower(p.name) LIKE '%' || t.token || '%'
                  OR lower(COALESCE(p.name_si, '')) LIKE '%' || t.token || '%'
                  OR lower(COALESCE(p.brand, '')) LIKE '%' || t.token || '%'
                  OR lower(p.sku) LIKE '%' || t.token || '%'
              )
            )
          GROUP BY p.id
        )
        SELECT
          ps.product_id,
          (
            (CASE WHEN ps.exact_hit > 0 THEN 120 ELSE 0 END) +
            (CASE WHEN ps.prefix_hit > 0 THEN 30 ELSE 0 END) +
            LEAST(ps.token_hits, 8) * 8 +
            ps.base_sim * 100 +
            COALESCE(as2.alias_sim, 0) * 80 +
            COALESCE(as2.alias_exact, 0) * 45 +
            COALESCE(as2.alias_prefix, 0) * 18 +
            LEAST(COALESCE(as2.alias_token_hits, 0), 8) * 4
          )::float AS score
        FROM product_scores ps
        LEFT JOIN alias_scores as2 ON as2.product_id = ps.product_id
        WHERE ps.base_sim >= 0.08
          OR ps.token_hits > 0
          OR COALESCE(as2.alias_sim, 0) >= 0.12
          OR COALESCE(as2.alias_token_hits, 0) > 0
        ORDER BY score DESC
        LIMIT ${maxCandidates}
      `);

      return rows.map((row) => ({ productId: row.product_id, score: Number(row.score) }));
    } catch (error) {
      this.logger.warn(`pg_trgm candidate query failed, fallback enabled: ${(error as Error).message}`);
      return [];
    }
  }

  private computeDbSearchScore(row: CatalogSearchRow, normalizedTerm: string, searchTokens: string[]): number {
    const fields = [
      row.name,
      row.nameSi,
      row.description,
      row.descriptionSi,
      row.sku,
      row.brand,
      row.category.name,
      row.category.nameSi,
    ]
      .map((value) => normalizeCatalogQuery(value || ''))
      .filter(Boolean);

    if (fields.length === 0) {
      return 0;
    }

    let score = 0;
    for (const field of fields) {
      if (field === normalizedTerm) {
        score = Math.max(score, 120);
      } else if (field.startsWith(normalizedTerm)) {
        score = Math.max(score, 95);
      } else if (field.includes(normalizedTerm)) {
        score = Math.max(score, 72);
      }
    }

    const tokenCoverage =
      searchTokens.length > 0
        ? searchTokens.filter((token) => fields.some((field) => field.includes(token))).length / searchTokens.length
        : 0;
    score += Math.round(tokenCoverage * 20);

    return score;
  }

  async listProducts(params: {
    search?: string;
    category?: string;
    page?: number;
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortDir?: string;
    activeOnly?: boolean;
  }): Promise<CatalogListResponse> {
    const safeLimit = Number.isFinite(params.limit)
      ? Math.max(1, Math.min(Math.floor(params.limit as number), 1000))
      : 20;
    const requestedOffset =
      Number.isFinite(params.offset) && (params.offset as number) >= 0
        ? Math.floor(params.offset as number)
        : undefined;
    const requestedPage = Number.isFinite(params.page)
      ? Math.max(1, Math.floor(params.page as number))
      : 1;
    const safeOffset = requestedOffset ?? (requestedPage - 1) * safeLimit;
    const safePage = Math.floor(safeOffset / safeLimit) + 1;
    const normalizedSearch = normalizeCatalogQuery(params.search || '');
    const normalizedCategory = normalizeCatalogQuery(params.category || '');

    const where: Prisma.ProductWhereInput = {};
    if (params.activeOnly !== false) {
      where.isActive = true;
    }

    const andFilters: Prisma.ProductWhereInput[] = [];
    if (normalizedSearch) {
      andFilters.push({
        OR: [
          { name: { contains: normalizedSearch, mode: 'insensitive' } },
          { nameSi: { contains: normalizedSearch, mode: 'insensitive' } },
          { description: { contains: normalizedSearch, mode: 'insensitive' } },
          { descriptionSi: { contains: normalizedSearch, mode: 'insensitive' } },
          { sku: { contains: normalizedSearch, mode: 'insensitive' } },
          { brand: { contains: normalizedSearch, mode: 'insensitive' } },
          { category: { name: { contains: normalizedSearch, mode: 'insensitive' } } },
          { category: { nameSi: { contains: normalizedSearch, mode: 'insensitive' } } },
        ],
      });
    }

    if (normalizedCategory) {
      const categoryFilters: Prisma.ProductWhereInput[] = [
        { category: { name: { equals: normalizedCategory, mode: 'insensitive' } } },
        { category: { nameSi: { equals: normalizedCategory, mode: 'insensitive' } } },
      ];

      if (isUuid(normalizedCategory)) {
        categoryFilters.push({ categoryId: normalizedCategory });
      }

      andFilters.push({
        OR: categoryFilters,
      });
    }

    if (andFilters.length > 0) {
      where.AND = andFilters;
    }

    const normalizedSortBy = (params.sortBy || 'name').toLowerCase();
    const dir = params.sortDir?.toLowerCase() === 'desc' ? 'desc' : 'asc';
    const orderBy: Prisma.ProductOrderByWithRelationInput =
      normalizedSortBy === 'price'
        ? { price: dir }
        : normalizedSortBy === 'stock'
          ? { stockQuantity: dir }
          : { name: dir };

    const [total, rows] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        orderBy,
        skip: safeOffset,
        take: safeLimit,
        include: {
          category: true,
          stockEntries: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      }),
    ]);

    return {
      success: true,
      data: {
        products: rows.map((row) => toProduct(row)),
        pagination: {
          page: safePage,
          limit: safeLimit,
          offset: safeOffset,
          total,
          totalPages: total > 0 ? Math.ceil(total / safeLimit) : 0,
        },
      },
    };
  }

  async getProduct(
    productId: string,
  ): Promise<{ success: boolean; data?: CatalogListProduct; message?: string }> {
    try {
      const row = await this.prisma.product.findUnique({
        where: { productId },
        include: {
          category: true,
          stockEntries: {
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
        },
      });

      if (!row) {
        return { success: false, message: 'Product not found' };
      }

      return { success: true, data: toProduct(row, true) };
    } catch (error) {
      this.logger.error(`Failed to get product: ${(error as Error).message}`);
      return { success: false, message: (error as Error).message || 'Failed to get product' };
    }
  }

  async listCategories(limit = 200): Promise<CatalogCategoriesResponse> {
    const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(Math.floor(limit), 500)) : 200;
    const rows = await this.prisma.category.findMany({
      orderBy: { name: 'asc' },
      take: safeLimit,
      select: { name: true, nameSi: true },
    });

    return {
      success: true,
      data: {
        categories: rows.map((row) => row.nameSi || row.name),
      },
    };
  }

  async listAdminCategories(): Promise<AdminCategoryListResponse> {
    const rows = await this.prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    return {
      success: true,
      data: {
        categories: rows.map((row) => ({
          id: row.id,
          name: row.name,
          nameSi: row.nameSi,
          productCount: row._count.products,
          createdAt: row.createdAt.toISOString(),
          updatedAt: row.updatedAt.toISOString(),
        })),
      },
    };
  }

  async createCategory(input: {
    name: string;
    nameSi?: string;
  }): Promise<{ success: boolean; data?: AdminCategory; message?: string }> {
    try {
      const category = await this.prisma.category.create({
        data: {
          name: input.name.trim(),
          nameSi: input.nameSi?.trim() || null,
        },
        include: {
          _count: {
            select: { products: true },
          },
        },
      });

      return {
        success: true,
        data: {
          id: category.id,
          name: category.name,
          nameSi: category.nameSi,
          productCount: category._count.products,
          createdAt: category.createdAt.toISOString(),
          updatedAt: category.updatedAt.toISOString(),
        },
      };
    } catch (error) {
      const err = error as { code?: string; message?: string };
      if (err.code === 'P2002') {
        return { success: false, message: 'Category already exists' };
      }

      return { success: false, message: err.message || 'Failed to create category' };
    }
  }

  async previewProductTranslation(input: {
    name?: string;
    description?: string;
  }): Promise<{ success: boolean; data: { nameSi: string | null; descriptionSi: string | null } }> {
    const data = await this.catalogTranslationService.translateProductFields(input);
    return { success: true, data };
  }

  async updateCategory(
    categoryId: string,
    input: { name?: string; nameSi?: string },
  ): Promise<{ success: boolean; data?: AdminCategory; message?: string }> {
    try {
      const category = await this.prisma.category.update({
        where: { id: categoryId },
        data: {
          ...(input.name !== undefined ? { name: input.name.trim() } : {}),
          ...(input.nameSi !== undefined ? { nameSi: input.nameSi?.trim() || null } : {}),
        },
        include: {
          _count: {
            select: { products: true },
          },
        },
      });

      return {
        success: true,
        data: {
          id: category.id,
          name: category.name,
          nameSi: category.nameSi,
          productCount: category._count.products,
          createdAt: category.createdAt.toISOString(),
          updatedAt: category.updatedAt.toISOString(),
        },
      };
    } catch (error) {
      const err = error as { code?: string; message?: string };
      if (err.code === 'P2025') {
        return { success: false, message: 'Category not found' };
      }

      if (err.code === 'P2002') {
        return { success: false, message: 'Category already exists' };
      }

      return { success: false, message: err.message || 'Failed to update category' };
    }
  }

  async deleteCategory(categoryId: string): Promise<{ success: boolean; message?: string }> {
    try {
      await this.prisma.category.delete({ where: { id: categoryId } });
      return { success: true, message: 'Category deleted successfully' };
    } catch (error) {
      const err = error as { code?: string; message?: string };
      if (err.code === 'P2025') {
        return { success: false, message: 'Category not found' };
      }

      if (err.code === 'P2003') {
        return { success: false, message: 'Category is still referenced by products' };
      }

      return { success: false, message: err.message || 'Failed to delete category' };
    }
  }

  async createProduct(
    input: ProductInput,
  ): Promise<{ success: boolean; data?: CatalogListProduct; message?: string }> {
    try {
      const englishName = input.name.trim();
      const englishDescription = input.description?.trim() || null;
      const translated = await this.catalogTranslationService.translateProductFields({
        name: englishName,
        description: englishDescription,
      });

      const data = await this.prisma.$transaction(async (tx) => {
        const categoryId = await this.resolveCategoryId(
          {
            categoryId: input.categoryId,
            categoryName: input.categoryName,
            categoryNameSi: input.categoryNameSi,
          },
          tx,
        );

        const product = await tx.product.create({
          data: {
            sku: input.sku.trim(),
            name: englishName,
            nameSi: input.nameSi?.trim() || translated.nameSi || null,
            description: englishDescription,
            descriptionSi: input.descriptionSi?.trim() || translated.descriptionSi || null,
            categoryId,
            price: new Prisma.Decimal(input.price),
            stockQuantity: 0,
            brand: input.brand?.trim() || 'unbranded',
            purchaseFrequency: input.purchaseFrequency ?? PurchaseFrequency.medium,
            imageUrl: input.imageUrl?.trim() || null,
            isActive: input.isActive !== false,
            createdBy: input.createdBy ?? null,
          },
          include: {
            category: true,
            stockEntries: {
              orderBy: { createdAt: 'desc' },
              take: 10,
            },
          },
        });

        await this.inventoryService.adjustStock(
          {
            productId: product.productId,
            balanceTo: input.stockQuantity,
            type: StockEntryType.initial,
            note: 'Initial stock created with product',
            createdBy: input.createdBy ?? null,
          },
          tx,
        );

        return tx.product.findUniqueOrThrow({
          where: { productId: product.productId },
          include: {
            category: true,
            stockEntries: {
              orderBy: { createdAt: 'desc' },
              take: 10,
            },
          },
        });
      });

      return { success: true, data: toProduct(data, true) };
    } catch (error) {
      const err = error as { code?: string; message?: string };
      if (err.code === 'P2002') {
        return { success: false, message: 'Product with this SKU already exists' };
      }

      return { success: false, message: err.message || 'Failed to create product' };
    }
  }

  async updateProduct(
    productId: string,
    input: ProductUpdateInput,
  ): Promise<{ success: boolean; data?: CatalogListProduct; message?: string }> {
    try {
      const row = await this.prisma.$transaction(async (tx) => {
        const existing = await tx.product.findUniqueOrThrow({
          where: { productId },
          select: {
            productId: true,
            name: true,
            description: true,
            nameSi: true,
            descriptionSi: true,
          },
        });

        const nextName = input.name !== undefined ? input.name.trim() : existing.name;
        const nextDescription =
          input.description !== undefined
            ? input.description?.trim() || null
            : existing.description;
        const shouldTranslateName = input.name !== undefined && input.nameSi === undefined;
        const shouldTranslateDescription =
          input.description !== undefined && input.descriptionSi === undefined;
        const translated =
          shouldTranslateName || shouldTranslateDescription
            ? await this.catalogTranslationService.translateProductFields({
                name: shouldTranslateName ? nextName : undefined,
                description: shouldTranslateDescription ? nextDescription : undefined,
              })
            : { nameSi: null, descriptionSi: null };

        const data: Prisma.ProductUpdateInput = {};
        if (input.name !== undefined) data.name = nextName;
        if (input.nameSi !== undefined) data.nameSi = input.nameSi?.trim() || null;
        else if (shouldTranslateName && translated.nameSi) data.nameSi = translated.nameSi;
        if (input.description !== undefined) data.description = nextDescription;
        if (input.descriptionSi !== undefined)
          data.descriptionSi = input.descriptionSi?.trim() || null;
        else if (shouldTranslateDescription && translated.descriptionSi)
          data.descriptionSi = translated.descriptionSi;
        if (input.price !== undefined) data.price = new Prisma.Decimal(input.price);
        if (input.brand !== undefined) data.brand = input.brand.trim() || 'unbranded';
        if (input.purchaseFrequency !== undefined) data.purchaseFrequency = input.purchaseFrequency;
        if (input.imageUrl !== undefined) data.imageUrl = input.imageUrl?.trim() || null;
        if (input.isActive !== undefined) data.isActive = input.isActive;

        if (input.categoryId !== undefined || input.categoryName !== undefined) {
          data.category = {
            connect: {
              id: await this.resolveCategoryId(
                {
                  categoryId: input.categoryId,
                  categoryName: input.categoryName,
                  categoryNameSi: input.categoryNameSi,
                },
                tx,
              ),
            },
          };
        }

        await tx.product.update({
          where: { productId },
          data,
        });

        if (input.stockQuantity !== undefined) {
          await this.inventoryService.adjustStock(
            {
              productId,
              balanceTo: input.stockQuantity,
              type: StockEntryType.rebalance,
              note: 'Stock balance updated by admin',
              createdBy: input.createdBy ?? null,
            },
            tx,
          );
        }

        return tx.product.findUniqueOrThrow({
          where: { productId },
          include: {
            category: true,
            stockEntries: {
              orderBy: { createdAt: 'desc' },
              take: 10,
            },
          },
        });
      });

      return { success: true, data: toProduct(row, true) };
    } catch (error) {
      const err = error as { code?: string; message?: string };
      if (err.code === 'P2025') {
        return { success: false, message: 'Product not found' };
      }

      return { success: false, message: err.message || 'Failed to update product' };
    }
  }

  async adjustProductStock(
    productId: string,
    input: {
      quantityChange?: number;
      balanceTo?: number;
      note?: string;
      createdBy?: string;
    },
  ): Promise<{ success: boolean; data?: CatalogListProduct; message?: string }> {
    try {
      const row = await this.prisma.$transaction(async (tx) => {
        await this.inventoryService.adjustStock(
          {
            productId,
            quantityChange: input.quantityChange,
            balanceTo: input.balanceTo,
            type:
              input.balanceTo !== undefined ? StockEntryType.rebalance : StockEntryType.adjustment,
            note: input.note?.trim() || null,
            createdBy: input.createdBy ?? null,
          },
          tx,
        );

        return tx.product.findUniqueOrThrow({
          where: { productId },
          include: {
            category: true,
            stockEntries: {
              orderBy: { createdAt: 'desc' },
              take: 10,
            },
          },
        });
      });

      return { success: true, data: toProduct(row, true) };
    } catch (error) {
      const err = error as { code?: string; message?: string };
      if (err.code === 'P2025' || err.message === 'Product not found') {
        return { success: false, message: 'Product not found' };
      }

      return { success: false, message: err.message || 'Failed to adjust stock' };
    }
  }

  async deleteProduct(productId: string): Promise<{ success: boolean; message?: string }> {
    try {
      await this.prisma.product.delete({ where: { productId } });
      return { success: true, message: 'Product deleted successfully' };
    } catch (error) {
      const err = error as { code?: string; message?: string };
      if (err.code === 'P2025') {
        return { success: false, message: 'Product not found' };
      }

      if (err.code === 'P2003') {
        try {
          await this.prisma.product.update({ where: { productId }, data: { isActive: false } });
          return {
            success: true,
            message: 'Product has related records and was archived instead of hard-deleted',
          };
        } catch (archiveError) {
          const ae = archiveError as { message?: string };
          return { success: false, message: ae.message || 'Failed to archive product' };
        }
      }

      return { success: false, message: err.message || 'Failed to delete product' };
    }
  }

  private async resolveCategoryId(
    input: {
      categoryId?: string;
      categoryName?: string;
      categoryNameSi?: string;
    },
    tx: Prisma.TransactionClient,
  ) {
    if (input.categoryId) {
      const category = await tx.category.findUnique({
        where: { id: input.categoryId },
        select: { id: true },
      });

      if (!category) {
        throw new Error('Category not found');
      }

      return category.id;
    }

    const categoryName = input.categoryName?.trim();
    if (!categoryName) {
      throw new Error('Category is required');
    }

    const category = await tx.category.upsert({
      where: { name: categoryName },
      update: {
        ...(input.categoryNameSi !== undefined
          ? { nameSi: input.categoryNameSi?.trim() || null }
          : {}),
      },
      create: {
        name: categoryName,
        nameSi: input.categoryNameSi?.trim() || null,
      },
      select: { id: true },
    });

    return category.id;
  }
}
