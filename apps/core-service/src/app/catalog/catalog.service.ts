import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@smart-retail-x/database';
import { buildCatalogQueryTokens, normalizeCatalogQuery } from '@smart-retail-x/shared-types';

type CatalogMatch = {
  productId: string;
  sku: string;
  name: string;
  nameSi: string | null;
  baseProduct: string | null;
  baseProductSi: string | null;
  category: string | null;
  categorySi: string | null;
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

type CatalogListProduct = {
  id: string;
  sku: string;
  name: string;
  nameSi: string | null;
  baseProduct: string | null;
  baseProductSi: string | null;
  description: string | null;
  descriptionSi: string | null;
  category: string | null;
  categorySi: string | null;
  price: number;
  currentStock: number;
  imageUrl: string | null;
  isActive: boolean;
  status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  createdAt: string;
};

type CatalogListResponse = {
  success: boolean;
  data: {
    products: CatalogListProduct[];
    pagination: {
      page: number;
      limit: number;
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

type ProductInput = {
  sku: string;
  name: string;
  nameSi?: string;
  baseProduct?: string;
  baseProductSi?: string;
  description?: string;
  descriptionSi?: string;
  category?: string;
  categorySi?: string;
  price: number;
  stockQuantity: number;
  imageUrl?: string;
  isActive?: boolean;
  createdBy?: string;
};

// ── Helpers ────────────────────────────────────────────────────────────────

function stockStatus(qty: number): CatalogListProduct['status'] {
  if (qty <= 0) return 'OUT_OF_STOCK';
  if (qty <= 5) return 'LOW_STOCK';
  return 'IN_STOCK';
}

function toListProduct(row: {
  id: string;
  sku: string;
  name: string;
  nameSi: string | null;
  baseProduct: string | null;
  baseProductSi: string | null;
  description: string | null;
  descriptionSi: string | null;
  category: string | null;
  categorySi: string | null;
  price: Prisma.Decimal;
  stockQuantity: number;
  imageUrl: string | null;
  isActive: boolean;
  createdAt: Date;
}): CatalogListProduct {
  const currentStock = row.stockQuantity;
  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    nameSi: row.nameSi,
    baseProduct: row.baseProduct,
    baseProductSi: row.baseProductSi,
    description: row.description,
    descriptionSi: row.descriptionSi,
    category: row.category,
    categorySi: row.categorySi,
    price: Number(row.price),
    currentStock,
    imageUrl: row.imageUrl,
    isActive: row.isActive,
    status: stockStatus(currentStock),
    createdAt: row.createdAt.toISOString(),
  };
}

// ── Service ────────────────────────────────────────────────────────────────

@Injectable()
export class CatalogService {
  private readonly logger = new Logger(CatalogService.name);

  constructor(private readonly prisma: PrismaService) {}

  async search(term: string, limit = 5): Promise<CatalogSearchResponse> {
    const normalizedTerm = normalizeCatalogQuery(term);
    if (!normalizedTerm) {
      return { success: true, term: '', matches: [] };
    }

    const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(limit, 20)) : 5;
    const queryTokens = buildCatalogQueryTokens(normalizedTerm);
    const searchTokens = queryTokens.length > 0 ? queryTokens : [normalizedTerm];

    // Raw SQL retained: token-scoring query with unnest cannot be expressed via
    // Prisma's query builder without multiple round-trips.
    const rows = await this.prisma.$queryRaw<
      Array<{
        id: string;
        sku: string;
        name: string;
        name_si: string | null;
        base_product: string | null;
        base_product_si: string | null;
        category: string | null;
        category_si: string | null;
        price: string;
        stock_quantity: number;
        image_url: string | null;
        is_active: boolean;
      }>
    >(
      Prisma.sql`
        SELECT id, sku, name, name_si, base_product, base_product_si,
               category, category_si, price, stock_quantity, image_url, is_active
        FROM core.products
        WHERE is_active = true
          AND EXISTS (
            SELECT 1 FROM unnest(${searchTokens}::text[]) AS token
            WHERE lower(coalesce(name,''))            LIKE '%' || token || '%'
               OR lower(coalesce(name_si,''))         LIKE '%' || token || '%'
               OR lower(coalesce(base_product,''))    LIKE '%' || token || '%'
               OR lower(coalesce(base_product_si,'')) LIKE '%' || token || '%'
               OR lower(coalesce(category,''))        LIKE '%' || token || '%'
               OR lower(coalesce(category_si,''))     LIKE '%' || token || '%'
               OR lower(coalesce(sku,''))             LIKE '%' || token || '%'
          )
        ORDER BY
          (lower(coalesce(name,''))=lower(${normalizedTerm})
            OR lower(coalesce(name_si,''))=lower(${normalizedTerm})
            OR lower(coalesce(base_product,''))=lower(${normalizedTerm})
            OR lower(coalesce(base_product_si,''))=lower(${normalizedTerm})) DESC,
          (lower(coalesce(name,'')) LIKE lower(${normalizedTerm}) || '%'
            OR lower(coalesce(name_si,'')) LIKE lower(${normalizedTerm}) || '%'
            OR lower(coalesce(base_product,'')) LIKE lower(${normalizedTerm}) || '%'
            OR lower(coalesce(base_product_si,'')) LIKE lower(${normalizedTerm}) || '%') DESC,
          name ASC
        LIMIT ${safeLimit}
      `,
    );

    const matches: CatalogMatch[] = rows.map((row) => ({
      productId: row.id,
      sku: row.sku,
      name: row.name,
      nameSi: row.name_si,
      baseProduct: row.base_product,
      baseProductSi: row.base_product_si,
      category: row.category,
      categorySi: row.category_si,
      price: Number(row.price),
      currentStock: Number(row.stock_quantity),
      imageUrl: row.image_url,
      isActive: row.is_active,
    }));

    if (matches.length > 0) {
      this.logger.log(`Catalog match found: term="${normalizedTerm}" results=${matches.length}`);
    }

    return { success: true, term: normalizedTerm, matches };
  }

  async listProducts(params: {
    search?: string;
    category?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortDir?: string;
    activeOnly?: boolean;
  }): Promise<CatalogListResponse> {
    const safePage = Number.isFinite(params.page) ? Math.max(1, Math.floor(params.page as number)) : 1;
    const safeLimit = Number.isFinite(params.limit)
      ? Math.max(1, Math.min(Math.floor(params.limit as number), 1000))
      : 20;

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
          { baseProduct: { contains: normalizedSearch, mode: 'insensitive' } },
          { baseProductSi: { contains: normalizedSearch, mode: 'insensitive' } },
          { sku: { contains: normalizedSearch, mode: 'insensitive' } },
        ],
      });
    }

    if (normalizedCategory) {
      andFilters.push({
        OR: [
          { category: { equals: normalizedCategory, mode: 'insensitive' } },
          { categorySi: { equals: normalizedCategory, mode: 'insensitive' } },
        ],
      });
    }

    if (andFilters.length > 0) {
      where.AND = andFilters;
    }

    const normalizedSortBy = (params.sortBy || 'name').toLowerCase();
    const dir = params.sortDir?.toLowerCase() === 'desc' ? 'desc' : 'asc';
    const orderBy: Prisma.ProductOrderByWithRelationInput =
      normalizedSortBy === 'price' ? { price: dir } : { name: dir };

    const [total, rows] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        orderBy,
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
        select: {
          id: true,
          sku: true,
          name: true,
          nameSi: true,
          baseProduct: true,
          baseProductSi: true,
          description: true,
          descriptionSi: true,
          category: true,
          categorySi: true,
          price: true,
          stockQuantity: true,
          imageUrl: true,
          isActive: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      success: true,
      data: {
        products: rows.map(toListProduct),
        pagination: {
          page: safePage,
          limit: safeLimit,
          total,
          totalPages: total > 0 ? Math.ceil(total / safeLimit) : 0,
        },
      },
    };
  }

  async getProduct(productId: string): Promise<{ success: boolean; data?: CatalogListProduct; message?: string }> {
    try {
      const row = await this.prisma.product.findUnique({
        where: { id: productId },
        select: {
          id: true,
          sku: true,
          name: true,
          nameSi: true,
          baseProduct: true,
          baseProductSi: true,
          description: true,
          descriptionSi: true,
          category: true,
          categorySi: true,
          price: true,
          stockQuantity: true,
          imageUrl: true,
          isActive: true,
          createdAt: true,
        },
      });

      if (!row) {
        return { success: false, message: 'Product not found' };
      }

      return { success: true, data: toListProduct(row) };
    } catch (error) {
      this.logger.error(`Failed to get product: ${(error as Error).message}`);
      return { success: false, message: (error as Error).message || 'Failed to get product' };
    }
  }

  async createProduct(input: ProductInput): Promise<{ success: boolean; data?: CatalogListProduct; message?: string }> {
    try {
      const row = await this.prisma.product.create({
        data: {
          sku: input.sku,
          name: input.name,
          nameSi: input.nameSi ?? null,
          baseProduct: input.baseProduct ?? null,
          baseProductSi: input.baseProductSi ?? null,
          description: input.description ?? null,
          descriptionSi: input.descriptionSi ?? null,
          category: input.category ?? null,
          categorySi: input.categorySi ?? null,
          price: input.price,
          stockQuantity: input.stockQuantity,
          imageUrl: input.imageUrl ?? null,
          isActive: input.isActive !== false,
          createdBy: input.createdBy ?? null,
        },
        select: {
          id: true,
          sku: true,
          name: true,
          nameSi: true,
          baseProduct: true,
          baseProductSi: true,
          description: true,
          descriptionSi: true,
          category: true,
          categorySi: true,
          price: true,
          stockQuantity: true,
          imageUrl: true,
          isActive: true,
          createdAt: true,
        },
      });

      return { success: true, data: toListProduct(row) };
    } catch (error) {
      const err = error as { code?: string; message?: string };
      this.logger.error(`Failed to create product: ${err.message}`);
      if (err.code === 'P2002') {
        return { success: false, message: 'Product with this SKU already exists' };
      }
      return { success: false, message: err.message || 'Failed to create product' };
    }
  }

  async updateProduct(
    productId: string,
    input: Partial<ProductInput>,
  ): Promise<{ success: boolean; data?: CatalogListProduct; message?: string }> {
    try {
      const data: Prisma.ProductUpdateInput = {};
      if (input.name !== undefined) data.name = input.name;
      if (input.nameSi !== undefined) data.nameSi = input.nameSi ?? null;
      if (input.baseProduct !== undefined) data.baseProduct = input.baseProduct ?? null;
      if (input.baseProductSi !== undefined) data.baseProductSi = input.baseProductSi ?? null;
      if (input.description !== undefined) data.description = input.description ?? null;
      if (input.descriptionSi !== undefined) data.descriptionSi = input.descriptionSi ?? null;
      if (input.category !== undefined) data.category = input.category ?? null;
      if (input.categorySi !== undefined) data.categorySi = input.categorySi ?? null;
      if (input.price !== undefined) data.price = input.price;
      if (input.stockQuantity !== undefined) data.stockQuantity = input.stockQuantity;
      if (input.imageUrl !== undefined) data.imageUrl = input.imageUrl ?? null;
      if (input.isActive !== undefined) data.isActive = input.isActive;

      if (Object.keys(data).length === 0) {
        return this.getProduct(productId);
      }

      const row = await this.prisma.product.update({
        where: { id: productId },
        data,
        select: {
          id: true,
          sku: true,
          name: true,
          nameSi: true,
          baseProduct: true,
          baseProductSi: true,
          description: true,
          descriptionSi: true,
          category: true,
          categorySi: true,
          price: true,
          stockQuantity: true,
          imageUrl: true,
          isActive: true,
          createdAt: true,
        },
      });

      return { success: true, data: toListProduct(row) };
    } catch (error) {
      const err = error as { code?: string; message?: string };
      this.logger.error(`Failed to update product: ${err.message}`);
      if (err.code === 'P2025') {
        return { success: false, message: 'Product not found' };
      }
      return { success: false, message: err.message || 'Failed to update product' };
    }
  }

  async deleteProduct(productId: string): Promise<{ success: boolean; message?: string }> {
    try {
      await this.prisma.product.delete({ where: { id: productId } });
      return { success: true, message: 'Product deleted successfully' };
    } catch (error) {
      const err = error as { code?: string; message?: string };

      if (err.code === 'P2025') {
        return { success: false, message: 'Product not found' };
      }

      // P2003 = FK constraint; archive instead of hard-delete
      if (err.code === 'P2003') {
        try {
          await this.prisma.product.update({ where: { id: productId }, data: { isActive: false } });
          return {
            success: true,
            message: 'Product has related records and was archived instead of hard-deleted',
          };
        } catch (archiveError) {
          const ae = archiveError as { message?: string };
          this.logger.error(`Failed to archive product after delete conflict: ${ae.message}`);
          return { success: false, message: ae.message || 'Failed to archive product' };
        }
      }

      this.logger.error(`Failed to delete product: ${err.message}`);
      return { success: false, message: err.message || 'Failed to delete product' };
    }
  }

  async listCategories(limit = 200): Promise<CatalogCategoriesResponse> {
    const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(Math.floor(limit), 500)) : 200;

    const rows = await this.prisma.$queryRaw<Array<{ category: string }>>(
      Prisma.sql`
        SELECT DISTINCT trim(coalesce(category_si, category, '')) AS category
        FROM core.products
        WHERE is_active = true
          AND trim(coalesce(category_si, category, '')) <> ''
        ORDER BY category ASC
        LIMIT ${safeLimit}
      `,
    );

    return {
      success: true,
      data: { categories: rows.map((r) => r.category) },
    };
  }
}
