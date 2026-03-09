import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Observable } from 'rxjs';

@Injectable()
export class CoreService implements OnModuleInit {
  private readonly logger = new Logger(CoreService.name);

  constructor(@Inject('CORE_SERVICE') private readonly coreClient: ClientProxy) {}

  /**
   * Eagerly connect RabbitMQ client on module initialization
   * This prevents lazy connection during the first request
   */
  async onModuleInit() {
    try {
      await this.coreClient.connect();
      this.logger.log('✓ Core service client connected');
    } catch (error) {
      this.logger.error('Failed to connect core service client:', error);
    }
  }

  /**
   * Get microservice health status
   * Returns an Observable that emits the health status
   */
  getMicroserviceHealth(): Observable<unknown> {
    this.logger.debug('Checking health of CORE_SERVICE...');
    return this.coreClient.send({ cmd: 'health' }, {});
  }

  getCatalogProducts(params: {
    search?: string;
    category?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortDir?: string;
    activeOnly?: boolean;
  }): Observable<unknown> {
    return this.coreClient.send({ cmd: 'catalog_products' }, params);
  }

  getCatalogCategories(limit = 200): Observable<unknown> {
    return this.coreClient.send({ cmd: 'catalog_categories' }, { limit });
  }

  // Product methods (Admin)
  getProduct(productId: string): Observable<unknown> {
    return this.coreClient.send({ cmd: 'catalog_get_product' }, { productId });
  }

  createProduct(data: {
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
  }): Observable<unknown> {
    return this.coreClient.send({ cmd: 'catalog_create_product' }, data);
  }

  updateProduct(
    productId: string,
    data: {
      name?: string;
      nameSi?: string;
      baseProduct?: string;
      baseProductSi?: string;
      description?: string;
      descriptionSi?: string;
      category?: string;
      categorySi?: string;
      price?: number;
      stockQuantity?: number;
      imageUrl?: string;
      isActive?: boolean;
    },
  ): Observable<unknown> {
    return this.coreClient.send({ cmd: 'catalog_update_product' }, { productId, ...data });
  }

  deleteProduct(productId: string): Observable<unknown> {
    return this.coreClient.send({ cmd: 'catalog_delete_product' }, { productId });
  }

  // Cart methods
  getCart(userId: string): Observable<unknown> {
    return this.coreClient.send({ cmd: 'cart_get' }, { userId });
  }

  addToCart(userId: string, productId: string, quantity = 1): Observable<unknown> {
    return this.coreClient.send({ cmd: 'cart_add' }, { userId, productId, quantity });
  }

  updateCartItem(userId: string, productId: string, quantity: number): Observable<unknown> {
    return this.coreClient.send({ cmd: 'cart_update' }, { userId, productId, quantity });
  }

  removeFromCart(userId: string, productId: string): Observable<unknown> {
    return this.coreClient.send({ cmd: 'cart_remove' }, { userId, productId });
  }

  clearCart(userId: string): Observable<unknown> {
    return this.coreClient.send({ cmd: 'cart_clear' }, { userId });
  }

  // Order methods (Customer)
  createOrder(data: {
    userId: string;
    shippingAddress?: Record<string, string>;
    billingAddress?: Record<string, string>;
    notes?: string;
  }): Observable<unknown> {
    return this.coreClient.send({ cmd: 'order_create' }, data);
  }

  getOrder(userId: string, orderId: string): Observable<unknown> {
    return this.coreClient.send({ cmd: 'order_get' }, { userId, orderId });
  }

  getOrderByNumber(userId: string, orderNumber: string): Observable<unknown> {
    return this.coreClient.send({ cmd: 'order_get_by_number' }, { userId, orderNumber });
  }

  listOrders(
    userId: string,
    params: { page?: number; limit?: number; status?: string },
  ): Observable<unknown> {
    return this.coreClient.send({ cmd: 'order_list' }, { userId, ...params });
  }

  cancelOrder(userId: string, orderId: string): Observable<unknown> {
    return this.coreClient.send({ cmd: 'order_cancel' }, { userId, orderId });
  }

  // Order methods (Admin)
  listAllOrders(params: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }): Observable<unknown> {
    return this.coreClient.send({ cmd: 'admin_order_list' }, params);
  }

  getOrderAdmin(orderId: string): Observable<unknown> {
    return this.coreClient.send({ cmd: 'admin_order_get' }, { orderId });
  }

  updateOrderStatus(orderId: string, status: string): Observable<unknown> {
    return this.coreClient.send({ cmd: 'admin_order_update_status' }, { orderId, status });
  }
}
