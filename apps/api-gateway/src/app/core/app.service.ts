import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { BroadcastPayload, SendToUserPayload, WEBSOCKET_PATTERNS } from '@smart-retail-x/messaging';
import { Observable } from 'rxjs';

@Injectable()
export class CoreService implements OnModuleInit {
  private readonly logger = new Logger(CoreService.name);

  constructor(
    @Inject('CORE_SERVICE') private readonly coreClient: ClientProxy,
    @Inject('WEBSOCKET_SERVICE') private readonly websocketClient: ClientProxy,
  ) {}

  /**
   * Eagerly connect RabbitMQ client on module initialization
   * This prevents lazy connection during the first request
   */
  async onModuleInit() {
    try {
      await this.coreClient.connect();
      this.logger.log('✓ Core service client connected');
      await this.websocketClient.connect();
      this.logger.log('✓ Websocket service client connected');
    } catch (error) {
      this.logger.error('Failed to connect messaging clients:', error);
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
    offset?: number;
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

  translateProductFields(data: { name?: string; description?: string }): Observable<unknown> {
    return this.coreClient.send({ cmd: 'catalog_translate_product_fields' }, data);
  }

  createProduct(data: {
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
    purchaseFrequency?: 'high' | 'medium' | 'low';
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
      description?: string;
      descriptionSi?: string;
      categoryId?: string;
      categoryName?: string;
      categoryNameSi?: string;
      price?: number;
      stockQuantity?: number;
      brand?: string;
      purchaseFrequency?: 'high' | 'medium' | 'low';
      imageUrl?: string;
      isActive?: boolean;
      createdBy?: string;
    },
  ): Observable<unknown> {
    return this.coreClient.send({ cmd: 'catalog_update_product' }, { productId, ...data });
  }

  adjustProductStock(
    productId: string,
    data: { quantityChange?: number; balanceTo?: number; note?: string; createdBy?: string },
  ): Observable<unknown> {
    return this.coreClient.send({ cmd: 'catalog_adjust_stock' }, { productId, ...data });
  }

  listAdminCategories(): Observable<unknown> {
    return this.coreClient.send({ cmd: 'catalog_admin_categories' }, {});
  }

  createCategory(data: { name: string; nameSi?: string }): Observable<unknown> {
    return this.coreClient.send({ cmd: 'catalog_create_category' }, data);
  }

  updateCategory(
    categoryId: string,
    data: { name?: string; nameSi?: string },
  ): Observable<unknown> {
    return this.coreClient.send({ cmd: 'catalog_update_category' }, { categoryId, ...data });
  }

  deleteCategory(categoryId: string): Observable<unknown> {
    return this.coreClient.send({ cmd: 'catalog_delete_category' }, { categoryId });
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
    params: { page?: number; limit?: number; offset?: number; status?: string },
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
    offset?: number;
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

  sendRealtimeEventToUser(payload: SendToUserPayload): void {
    this.websocketClient.emit(WEBSOCKET_PATTERNS.SEND_TO_USER, payload).subscribe({
      error: (error) =>
        this.logger.warn(`Failed to publish user websocket event: ${error?.message ?? error}`),
    });
  }

  broadcastRealtimeEvent(payload: BroadcastPayload): void {
    this.websocketClient.emit(WEBSOCKET_PATTERNS.BROADCAST, payload).subscribe({
      error: (error) =>
        this.logger.warn(`Failed to publish broadcast websocket event: ${error?.message ?? error}`),
    });
  }

  // ── Bulk Promotions ────────────────────────────────────────────────────────

  createPromotion(data: {
    productId: string;
    discountPercentage: number;
    startDate: string;
    endDate: string;
    promotionType: string;
    productScope?: string;
  }): Observable<unknown> {
    return this.coreClient.send({ cmd: 'promotion_create' }, data);
  }

  listPromotions(params: { status?: string; page?: number; limit?: number }): Observable<unknown> {
    return this.coreClient.send({ cmd: 'promotion_list' }, params);
  }

  updatePromotion(
    promotionId: string,
    data: {
      discountPercentage?: number;
      startDate?: string;
      endDate?: string;
      promotionType?: string;
      status?: string;
    },
  ): Observable<unknown> {
    return this.coreClient.send({ cmd: 'promotion_update' }, { promotionId, ...data });
  }

  deletePromotion(promotionId: string): Observable<unknown> {
    return this.coreClient.send({ cmd: 'promotion_delete' }, { promotionId });
  }

  getActivePromotions(): Observable<unknown> {
    return this.coreClient.send({ cmd: 'promotion_active' }, {});
  }
}
