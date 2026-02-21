import { processApiResponse } from '../lib/mapper';
import { mapPaginatedProductsResponse, mapProductResponse } from '../mappers/product.mapper';
import {
  productApiSchema,
  productListApiSchema,
  type CreateProductFormValues,
} from '../schemas/product.schema';
import type { PaginatedProducts, Product } from '../types/product.type';
import { apiClient } from './api-client';

export const ProductService = {
  /**
   * Fetch paginated list of products
   */
  async getProducts(params?: {
    page?: number;
    limit?: number;
    category?: string;
    search?: string;
    is_active?: boolean;
  }): Promise<PaginatedProducts> {
    return processApiResponse(
      apiClient.get('/products', { params }),
      productListApiSchema,
      mapPaginatedProductsResponse,
    );
  },

  /**
   * Fetch a single product by ID
   */
  async getProduct(id: string): Promise<Product> {
    return processApiResponse(
      apiClient.get(`/products/${id}`),
      productApiSchema,
      mapProductResponse,
    );
  },

  /**
   * Create a new product (Admin only)
   */
  async createProduct(data: CreateProductFormValues): Promise<Product> {
    return processApiResponse(
      apiClient.post('/products', data),
      productApiSchema,
      mapProductResponse,
    );
  },

  /**
   * Update an existing product (Admin only)
   */
  async updateProduct(id: string, data: Partial<CreateProductFormValues>): Promise<Product> {
    return processApiResponse(
      apiClient.patch(`/products/${id}`, data),
      productApiSchema,
      mapProductResponse,
    );
  },

  /**
   * Delete a product (Admin only)
   */
  async deleteProduct(id: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.delete(`/products/${id}`);
    return response.data;
  },
};
