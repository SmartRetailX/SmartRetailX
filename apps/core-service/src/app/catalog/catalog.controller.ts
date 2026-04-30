import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { PurchaseFrequency } from '@prisma/client';

import { CatalogService } from './catalog.service';

@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @MessagePattern({ cmd: 'catalog_search' })
  async searchCatalog(data: { term?: string; limit?: number }) {
    return this.catalogService.search(data?.term ?? '', data?.limit ?? 5);
  }

  @MessagePattern({ cmd: 'catalog_products' })
  async listProducts(data: {
    search?: string;
    category?: string;
    page?: number;
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortDir?: string;
    activeOnly?: boolean;
  }) {
    return this.catalogService.listProducts(data || {});
  }

  @MessagePattern({ cmd: 'catalog_categories' })
  async listCategories(data: { limit?: number }) {
    return this.catalogService.listCategories(data?.limit ?? 200);
  }

  @MessagePattern({ cmd: 'catalog_get_product' })
  async getProduct(data: { productId: string }) {
    return this.catalogService.getProduct(data.productId);
  }

  @MessagePattern({ cmd: 'catalog_translate_product_fields' })
  async translateProductFields(data: { name?: string; description?: string }) {
    return this.catalogService.previewProductTranslation(data || {});
  }

  @MessagePattern({ cmd: 'catalog_create_product' })
  async createProduct(data: {
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
  }) {
    return this.catalogService.createProduct(data);
  }

  @MessagePattern({ cmd: 'catalog_update_product' })
  async updateProduct(data: {
    productId: string;
    name?: string;
    nameSi?: string;
    description?: string;
    descriptionSi?: string;
    categoryId?: string;
    categoryName?: string;
    categoryNameSi?: string;
    price?: number;
    stockQuantity?: number;
    brand?: string;
    purchaseFrequency?: PurchaseFrequency;
    imageUrl?: string;
    isActive?: boolean;
    createdBy?: string;
  }) {
    const { productId, ...input } = data;
    return this.catalogService.updateProduct(productId, input);
  }

  @MessagePattern({ cmd: 'catalog_adjust_stock' })
  async adjustProductStock(data: {
    productId: string;
    quantityChange?: number;
    balanceTo?: number;
    note?: string;
    createdBy?: string;
  }) {
    const { productId, ...input } = data;
    return this.catalogService.adjustProductStock(productId, input);
  }

  @MessagePattern({ cmd: 'catalog_admin_categories' })
  async listAdminCategories() {
    return this.catalogService.listAdminCategories();
  }

  @MessagePattern({ cmd: 'catalog_create_category' })
  async createCategory(data: { name: string; nameSi?: string }) {
    return this.catalogService.createCategory(data);
  }

  @MessagePattern({ cmd: 'catalog_update_category' })
  async updateCategory(data: { categoryId: string; name?: string; nameSi?: string }) {
    const { categoryId, ...input } = data;
    return this.catalogService.updateCategory(categoryId, input);
  }

  @MessagePattern({ cmd: 'catalog_delete_category' })
  async deleteCategory(data: { categoryId: string }) {
    return this.catalogService.deleteCategory(data.categoryId);
  }

  @MessagePattern({ cmd: 'catalog_delete_product' })
  async deleteProduct(data?: { productId?: string }) {
    const productId = data?.productId;
    if (!productId) {
      return { success: false, message: 'Product id is required' };
    }

    return this.catalogService.deleteProduct(productId);
  }
}
