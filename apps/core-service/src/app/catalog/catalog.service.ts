import { Injectable, Logger } from '@nestjs/common';
import { Prisma, PurchaseFrequency, StockEntryType } from '@prisma/client';
import { PrismaService } from '@smart-retail-x/database';
import { buildCatalogQueryTokens, normalizeCatalogQuery } from '@smart-retail-x/shared-types';

import { CatalogTranslationService } from './catalog-translation.service';
import { InventoryService } from './inventory.service';

type CatalogMatch = {
  productId: string;
  sku: string;
  name: string;
  nameSi: string | null;
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

    const rows = await this.prisma.$queryRaw<
      Array<{
        id: string;
        sku: string;
        name: string;
        name_si: string | null;
        category_id: string;
        category_name: string;
        category_name_si: string | null;
        price: string;
        stock_quantity: number;
        image_url: string | null;
        is_active: boolean;
      }>
    >(
      Prisma.sql`
        SELECT p.id,
               p.sku,
               p.name,
               p.name_si,
               p.category_id,
               c.name AS category_name,
               c.name_si AS category_name_si,
               p.price,
               p.stock_quantity,
               p.image_url,
               p.is_active
        FROM core.products p
        INNER JOIN core.categories c ON c.id = p.category_id
        WHERE p.is_active = true
          AND EXISTS (
            SELECT 1 FROM unnest(${searchTokens}::text[]) AS token
            WHERE lower(coalesce(p.name, '')) LIKE '%' || token || '%'
               OR lower(coalesce(p.name_si, '')) LIKE '%' || token || '%'
               OR lower(coalesce(p.description, '')) LIKE '%' || token || '%'
               OR lower(coalesce(p.description_si, '')) LIKE '%' || token || '%'
               OR lower(coalesce(c.name, '')) LIKE '%' || token || '%'
               OR lower(coalesce(c.name_si, '')) LIKE '%' || token || '%'
               OR lower(coalesce(p.sku, '')) LIKE '%' || token || '%'
          )
        ORDER BY
          (lower(coalesce(p.name, '')) = lower(${normalizedTerm})
            OR lower(coalesce(p.name_si, '')) = lower(${normalizedTerm})) DESC,
          (lower(coalesce(p.name, '')) LIKE lower(${normalizedTerm}) || '%'
            OR lower(coalesce(p.name_si, '')) LIKE lower(${normalizedTerm}) || '%') DESC,
          p.name ASC
        LIMIT ${safeLimit}
      `,
    );

    const matches = rows.map((row) => ({
      productId: row.id,
      sku: row.sku,
      name: row.name,
      nameSi: row.name_si,
      categoryId: row.category_id,
      category: row.category_name,
      categoryNameSi: row.category_name_si,
      price: Number(row.price),
      currentStock: row.stock_quantity,
      imageUrl: row.image_url,
      isActive: row.is_active,
    }));

    return { success: true, term: normalizedTerm, matches };
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
