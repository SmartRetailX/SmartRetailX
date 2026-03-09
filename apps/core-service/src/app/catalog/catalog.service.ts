import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@smart-retail-x/config';
import { buildCatalogQueryTokens, normalizeCatalogQuery } from '@smart-retail-x/shared-types';
import { Pool } from 'pg';

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
    this.logger.log('Catalog service initialized');
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
    const queryTokens = buildCatalogQueryTokens(normalizedTerm);
    const searchTokens = queryTokens.length > 0 ? queryTokens : [normalizedTerm];

    const result = await this.pool.query<{
      id: string;
      sku: string;
      name: string;
      name_si: string | null;
      base_product: string | null;
      base_product_si: string | null;
      category: string | null;
      category_si: string | null;
      price: number;
      stock_quantity: number;
      image_url: string | null;
      is_active: boolean;
      token_hits: number;
      exact_hit: boolean;
      prefix_hit: boolean;
    }>(
      `
      SELECT
        id,
        sku,
        name,
        name_si,
        base_product,
        base_product_si,
        category,
        category_si,
        price,
        stock_quantity,
        image_url,
        is_active,
        (
          SELECT count(*)::int
          FROM unnest($1::text[]) AS token
          WHERE
            lower(coalesce(name, '')) LIKE '%' || token || '%'
            OR lower(coalesce(name_si, '')) LIKE '%' || token || '%'
            OR lower(coalesce(base_product, '')) LIKE '%' || token || '%'
            OR lower(coalesce(base_product_si, '')) LIKE '%' || token || '%'
            OR lower(coalesce(category, '')) LIKE '%' || token || '%'
            OR lower(coalesce(category_si, '')) LIKE '%' || token || '%'
            OR lower(coalesce(sku, '')) LIKE '%' || token || '%'
        ) AS token_hits,
        (
          lower(coalesce(name, '')) = $2
          OR lower(coalesce(name_si, '')) = $2
          OR lower(coalesce(base_product, '')) = $2
          OR lower(coalesce(base_product_si, '')) = $2
        ) AS exact_hit,
        (
          lower(coalesce(name, '')) LIKE $2 || '%'
          OR lower(coalesce(name_si, '')) LIKE $2 || '%'
          OR lower(coalesce(base_product, '')) LIKE $2 || '%'
          OR lower(coalesce(base_product_si, '')) LIKE $2 || '%'
        ) AS prefix_hit
      FROM products
      WHERE is_active = true
        AND EXISTS (
          SELECT 1
          FROM unnest($1::text[]) AS token
          WHERE
            lower(coalesce(name, '')) LIKE '%' || token || '%'
            OR lower(coalesce(name_si, '')) LIKE '%' || token || '%'
            OR lower(coalesce(base_product, '')) LIKE '%' || token || '%'
            OR lower(coalesce(base_product_si, '')) LIKE '%' || token || '%'
            OR lower(coalesce(category, '')) LIKE '%' || token || '%'
            OR lower(coalesce(category_si, '')) LIKE '%' || token || '%'
            OR lower(coalesce(sku, '')) LIKE '%' || token || '%'
        )
      ORDER BY
        exact_hit DESC,
        prefix_hit DESC,
        token_hits DESC,
        name ASC
      LIMIT $3
      `,
      [searchTokens, normalizedTerm, safeLimit],
    );

    const matches: CatalogMatch[] = result.rows.map((row) => ({
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

    return {
      success: true,
      term: normalizedTerm,
      matches,
    };
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
    const whereParts: string[] = [];
    const values: Array<string | number | boolean> = [];

    // Default to active only for customer-facing
    if (params.activeOnly !== false) {
      whereParts.push('is_active = true');
    }

    if (normalizedSearch) {
      values.push(`%${normalizedSearch}%`);
      const searchParam = `$${values.length}`;
      whereParts.push(`(
        lower(coalesce(name, '')) LIKE ${searchParam}
        OR lower(coalesce(name_si, '')) LIKE ${searchParam}
        OR lower(coalesce(base_product, '')) LIKE ${searchParam}
        OR lower(coalesce(base_product_si, '')) LIKE ${searchParam}
        OR lower(sku) LIKE ${searchParam}
      )`);
    }

    if (normalizedCategory) {
      values.push(normalizedCategory);
      const categoryParam = `$${values.length}`;
      whereParts.push(`(
        lower(coalesce(category, '')) = ${categoryParam}
        OR lower(coalesce(category_si, '')) = ${categoryParam}
      )`);
    }

    const whereClause = whereParts.length > 0 ? `WHERE ${whereParts.join(' AND ')}` : '';

    const countResult = await this.pool.query<{ total: number }>(
      `SELECT count(*)::int AS total FROM products ${whereClause}`,
      values,
    );

    const total = Number(countResult.rows[0]?.total || 0);
    const totalPages = total > 0 ? Math.ceil(total / safeLimit) : 0;
    const offset = (safePage - 1) * safeLimit;

    const normalizedSortBy = (params.sortBy || 'name').toLowerCase();
    const sortColumn = normalizedSortBy === 'price' ? 'price' : 'lower(coalesce(name, \'\'))';
    const sortDirection = (params.sortDir || 'asc').toLowerCase() === 'desc' ? 'DESC' : 'ASC';

    const limitParam = `$${values.length + 1}`;
    const offsetParam = `$${values.length + 2}`;
    const pageValues = [...values, safeLimit, offset];

    const productRows = await this.pool.query<{
      id: string;
      sku: string;
      name: string;
      name_si: string | null;
      base_product: string | null;
      base_product_si: string | null;
      description: string | null;
      description_si: string | null;
      category: string | null;
      category_si: string | null;
      price: number;
      stock_quantity: number;
      image_url: string | null;
      is_active: boolean;
      created_at: Date;
    }>(
      `
            SELECT id, sku, name, name_si, base_product, base_product_si, description, description_si, category, category_si,
             price, stock_quantity, image_url, is_active, created_at
      FROM products
      ${whereClause}
      ORDER BY ${sortColumn} ${sortDirection}, id ASC
      LIMIT ${limitParam} OFFSET ${offsetParam}
      `,
      pageValues,
    );

    const products: CatalogListProduct[] = productRows.rows.map((row) => {
      const currentStock = Number(row.stock_quantity || 0);
      const status: CatalogListProduct['status'] =
        currentStock <= 0 ? 'OUT_OF_STOCK' : currentStock <= 5 ? 'LOW_STOCK' : 'IN_STOCK';

      return {
        id: row.id,
        sku: row.sku,
        name: row.name,
        nameSi: row.name_si,
        baseProduct: row.base_product,
        baseProductSi: row.base_product_si,
        description: row.description,
        descriptionSi: row.description_si,
        category: row.category,
        categorySi: row.category_si,
        price: Number(row.price || 0),
        currentStock,
        imageUrl: row.image_url,
        isActive: row.is_active,
        status,
        createdAt: row.created_at.toISOString(),
      };
    });

    return {
      success: true,
      data: {
        products,
        pagination: {
          page: safePage,
          limit: safeLimit,
          total,
          totalPages,
        },
      },
    };
  }

  async getProduct(productId: string): Promise<{ success: boolean; data?: CatalogListProduct; message?: string }> {
    try {
      const result = await this.pool.query<{
        id: string;
        sku: string;
        name: string;
        name_si: string | null;
        base_product: string | null;
        base_product_si: string | null;
        description: string | null;
        description_si: string | null;
        category: string | null;
        category_si: string | null;
        price: number;
        stock_quantity: number;
        image_url: string | null;
        is_active: boolean;
        created_at: Date;
      }>(
        `SELECT id, sku, name, name_si, base_product, base_product_si, description, description_si, category, category_si,
                price, stock_quantity, image_url, is_active, created_at
         FROM products WHERE id = $1`,
        [productId],
      );

      if (result.rows.length === 0) {
        return { success: false, message: 'Product not found' };
      }

      const row = result.rows[0];
      const currentStock = Number(row.stock_quantity || 0);
      const status: CatalogListProduct['status'] =
        currentStock <= 0 ? 'OUT_OF_STOCK' : currentStock <= 5 ? 'LOW_STOCK' : 'IN_STOCK';

      return {
        success: true,
        data: {
          id: row.id,
          sku: row.sku,
          name: row.name,
          nameSi: row.name_si,
          baseProduct: row.base_product,
          baseProductSi: row.base_product_si,
          description: row.description,
          descriptionSi: row.description_si,
          category: row.category,
          categorySi: row.category_si,
          price: Number(row.price || 0),
          currentStock,
          imageUrl: row.image_url,
          isActive: row.is_active,
          status,
          createdAt: row.created_at.toISOString(),
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get product: ${error.message}`);
      return { success: false, message: error.message || 'Failed to get product' };
    }
  }

  async createProduct(input: ProductInput): Promise<{ success: boolean; data?: CatalogListProduct; message?: string }> {
    try {
      const result = await this.pool.query<{ id: string }>(
        `INSERT INTO products (sku, name, name_si, base_product, base_product_si, description, description_si, category, category_si,
                               price, stock_quantity, image_url, is_active, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         RETURNING id`,
        [
          input.sku,
          input.name,
          input.nameSi || null,
          input.baseProduct || null,
          input.baseProductSi || null,
          input.description || null,
          input.descriptionSi || null,
          input.category || null,
          input.categorySi || null,
          input.price,
          input.stockQuantity,
          input.imageUrl || null,
          input.isActive !== false,
          input.createdBy || null,
        ],
      );

      return this.getProduct(result.rows[0].id);
    } catch (error) {
      this.logger.error(`Failed to create product: ${error.message}`);
      if (error.code === '23505') {
        return { success: false, message: 'Product with this SKU already exists' };
      }
      return { success: false, message: error.message || 'Failed to create product' };
    }
  }

  async updateProduct(
    productId: string,
    input: Partial<ProductInput>,
  ): Promise<{ success: boolean; data?: CatalogListProduct; message?: string }> {
    try {
      const updates: string[] = [];
      const values: Array<string | number | boolean | null> = [];
      let paramIndex = 1;

      if (input.name !== undefined) {
        updates.push(`name = $${paramIndex++}`);
        values.push(input.name);
      }
      if (input.nameSi !== undefined) {
        updates.push(`name_si = $${paramIndex++}`);
        values.push(input.nameSi || null);
      }
      if (input.baseProduct !== undefined) {
        updates.push(`base_product = $${paramIndex++}`);
        values.push(input.baseProduct || null);
      }
      if (input.baseProductSi !== undefined) {
        updates.push(`base_product_si = $${paramIndex++}`);
        values.push(input.baseProductSi || null);
      }
      if (input.description !== undefined) {
        updates.push(`description = $${paramIndex++}`);
        values.push(input.description || null);
      }
      if (input.descriptionSi !== undefined) {
        updates.push(`description_si = $${paramIndex++}`);
        values.push(input.descriptionSi || null);
      }
      if (input.category !== undefined) {
        updates.push(`category = $${paramIndex++}`);
        values.push(input.category || null);
      }
      if (input.categorySi !== undefined) {
        updates.push(`category_si = $${paramIndex++}`);
        values.push(input.categorySi || null);
      }
      if (input.price !== undefined) {
        updates.push(`price = $${paramIndex++}`);
        values.push(input.price);
      }
      if (input.stockQuantity !== undefined) {
        updates.push(`stock_quantity = $${paramIndex++}`);
        values.push(input.stockQuantity);
      }
      if (input.imageUrl !== undefined) {
        updates.push(`image_url = $${paramIndex++}`);
        values.push(input.imageUrl || null);
      }
      if (input.isActive !== undefined) {
        updates.push(`is_active = $${paramIndex++}`);
        values.push(input.isActive);
      }

      if (updates.length === 0) {
        return this.getProduct(productId);
      }

      values.push(productId);
      const result = await this.pool.query(
        `UPDATE products SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex} RETURNING id`,
        values,
      );

      if (result.rowCount === 0) {
        return { success: false, message: 'Product not found' };
      }

      return this.getProduct(productId);
    } catch (error) {
      this.logger.error(`Failed to update product: ${error.message}`);
      return { success: false, message: error.message || 'Failed to update product' };
    }
  }

  async deleteProduct(productId: string): Promise<{ success: boolean; message?: string }> {
    try {
      const result = await this.pool.query('DELETE FROM products WHERE id = $1', [productId]);

      if (result.rowCount === 0) {
        return { success: false, message: 'Product not found' };
      }

      return { success: true, message: 'Product deleted successfully' };
    } catch (error) {
      const dbError = error as { code?: string; message?: string };

      // Foreign key references (for example from historical order items) should
      // not break admin delete flows; archive the product instead.
      if (dbError.code === '23503') {
        try {
          const archived = await this.pool.query(
            'UPDATE products SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING id',
            [productId],
          );

          if (archived.rowCount === 0) {
            return { success: false, message: 'Product not found' };
          }

          return {
            success: true,
            message: 'Product has related records and was archived instead of hard-deleted',
          };
        } catch (archiveError) {
          const archiveDbError = archiveError as { message?: string };
          this.logger.error(`Failed to archive product after delete conflict: ${archiveDbError.message}`);
          return {
            success: false,
            message: archiveDbError.message || 'Failed to archive product after delete conflict',
          };
        }
      }

      this.logger.error(`Failed to delete product: ${dbError.message}`);
      return { success: false, message: dbError.message || 'Failed to delete product' };
    }
  }

  async listCategories(limit = 200): Promise<CatalogCategoriesResponse> {
    const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(Math.floor(limit), 500)) : 200;

    const result = await this.pool.query<{ category: string }>(
      `
      SELECT DISTINCT trim(coalesce(category_si, category, '')) AS category
      FROM products
      WHERE is_active = true AND trim(coalesce(category_si, category, '')) <> ''
      ORDER BY category ASC
      LIMIT $1
      `,
      [safeLimit],
    );

    return {
      success: true,
      data: {
        categories: result.rows.map((row) => row.category),
      },
    };
  }
}
