import type { ProductApiResponse, ProductListApiResponse } from '../schemas/product.schema';
import type { PaginatedProducts, Product } from '../types/product.type';

export function mapProductResponse(apiData: ProductApiResponse): Product {
  return {
    id: apiData.id,
    name: apiData.name,
    description: apiData.description ?? '',
    price: apiData.price,
    stockQuantity: apiData.stock_quantity,
    category: apiData.category ?? '',
    imageUrl: apiData.image_url ?? '',
    sku: apiData.sku,
    isActive: apiData.is_active,
    createdAt: new Date(apiData.created_at),
    updatedAt: new Date(apiData.updated_at),
  };
}

export function mapPaginatedProductsResponse(apiData: ProductListApiResponse): PaginatedProducts {
  return {
    items: apiData.products.map(mapProductResponse),
    total: apiData.total,
    page: apiData.page,
    limit: apiData.limit,
    totalPages: Math.ceil(apiData.total / apiData.limit),
  };
}
