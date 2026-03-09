import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@smart-retail-x/config';
import { Pool } from 'pg';

import { CartService } from '../cart/cart.service';

// Types
export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export type OrderItem = {
  id: string;
  productId: string;
  productName: string;
  productNameSi: string | null;
  productSku: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
};

export type Order = {
  id: string;
  orderNumber: string;
  userId: string;
  status: OrderStatus;
  items: OrderItem[];
  itemCount: number;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  shippingAddress: Record<string, string> | null;
  billingAddress: Record<string, string> | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type OrderListItem = Omit<Order, 'items' | 'shippingAddress' | 'billingAddress' | 'notes'>;

export type OrderResponse = {
  success: boolean;
  data?: Order;
  message?: string;
};

export type OrderListResponse = {
  success: boolean;
  data: {
    orders: OrderListItem[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
};

export type CreateOrderInput = {
  userId: string;
  shippingAddress?: Record<string, string>;
  billingAddress?: Record<string, string>;
  notes?: string;
};

@Injectable()
export class OrderService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OrderService.name);
  private readonly pool: Pool;

  constructor(
    private readonly configService: ConfigService,
    private readonly cartService: CartService,
  ) {
    this.pool = new Pool({
      connectionString: this.configService.databaseUrl,
      min: this.configService.databasePoolMin,
      max: this.configService.databasePoolMax,
      connectionTimeoutMillis: 10_000,
      idleTimeoutMillis: 30_000,
      keepAlive: true,
    });

    this.pool.on('error', (error) => {
      this.logger.error(`Order pool error: ${error.message}`);
    });
  }

  async onModuleInit(): Promise<void> {
    this.logger.log('Order service initialized');
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }

  async createOrder(input: CreateOrderInput): Promise<OrderResponse> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Get user's cart
      const cartResponse = await this.cartService.getOrCreateCart(input.userId);
      if (!cartResponse.success || !cartResponse.data) {
        throw new Error('Failed to get cart');
      }

      const cart = cartResponse.data;
      if (cart.items.length === 0) {
        throw new Error('Cart is empty');
      }

      // Validate stock and calculate totals
      let subtotal = 0;
      for (const item of cart.items) {
        if (item.currentStock < item.quantity) {
          throw new Error(`Insufficient stock for ${item.productName}`);
        }
        subtotal += item.totalPrice;
      }

      const discount = 0; // Can be extended for promo codes
      const tax = 0; // Can be extended for tax calculation
      const total = subtotal - discount + tax;

      // Generate order number
      const orderNumber = `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      // Create order
      const orderResult = await client.query<{ id: string }>(
        `INSERT INTO public.orders (
          order_number, user_id, status, subtotal, discount, tax, total,
          shipping_address, billing_address, notes
        ) VALUES ($1, $2, 'pending', $3, $4, $5, $6, $7, $8, $9)
        RETURNING id`,
        [
          orderNumber,
          input.userId,
          subtotal,
          discount,
          tax,
          total,
          input.shippingAddress ? JSON.stringify(input.shippingAddress) : null,
          input.billingAddress ? JSON.stringify(input.billingAddress) : null,
          input.notes || null,
        ],
      );

      const orderId = orderResult.rows[0].id;

      // Create order items and update stock
      for (const item of cart.items) {
        await client.query(
          `INSERT INTO public.order_items (
            order_id, product_id, product_name, product_name_si, product_sku,
            quantity, unit_price, total_price
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            orderId,
            item.productId,
            item.productName,
            item.productNameSi || null,
            item.sku,
            item.quantity,
            item.unitPrice,
            item.totalPrice,
          ],
        );

        // Decrease stock
        await client.query(
          `UPDATE public.products SET stock_quantity = COALESCE(stock_quantity, 0) - $2
           WHERE id = $1`,
          [item.productId, item.quantity],
        );
      }

      // Mark cart as converted and clear items
      await client.query(
        `UPDATE public.carts SET status = 'converted', updated_at = NOW()
         WHERE id = $1`,
        [cart.id],
      );

      await client.query('COMMIT');

      // Return the created order
      return this.getOrder(input.userId, orderId);
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error(`Failed to create order: ${error.message}`);
      return { success: false, message: error.message || 'Failed to create order' };
    } finally {
      client.release();
    }
  }

  async getOrder(userId: string, orderId: string): Promise<OrderResponse> {
    try {
      const orderResult = await this.pool.query<{
        id: string;
        order_number: string;
        user_id: string;
        status: OrderStatus;
        subtotal: number;
        discount: number;
        tax: number;
        total: number;
        shipping_address: Record<string, string> | null;
        billing_address: Record<string, string> | null;
        notes: string | null;
        created_at: Date;
        updated_at: Date;
      }>(
        `SELECT * FROM public.orders WHERE id = $1 AND user_id = $2`,
        [orderId, userId],
      );

      if (orderResult.rows.length === 0) {
        return { success: false, message: 'Order not found' };
      }

      const order = await this.buildOrderResponse(orderResult.rows[0]);
      return { success: true, data: order };
    } catch (error) {
      this.logger.error(`Failed to get order: ${error.message}`);
      return { success: false, message: error.message || 'Failed to get order' };
    }
  }

  async getOrderByNumber(userId: string, orderNumber: string): Promise<OrderResponse> {
    try {
      const orderResult = await this.pool.query<{
        id: string;
        order_number: string;
        user_id: string;
        status: OrderStatus;
        subtotal: number;
        discount: number;
        tax: number;
        total: number;
        shipping_address: Record<string, string> | null;
        billing_address: Record<string, string> | null;
        notes: string | null;
        created_at: Date;
        updated_at: Date;
      }>(
        `SELECT * FROM public.orders WHERE order_number = $1 AND user_id = $2`,
        [orderNumber, userId],
      );

      if (orderResult.rows.length === 0) {
        return { success: false, message: 'Order not found' };
      }

      const order = await this.buildOrderResponse(orderResult.rows[0]);
      return { success: true, data: order };
    } catch (error) {
      this.logger.error(`Failed to get order: ${error.message}`);
      return { success: false, message: error.message || 'Failed to get order' };
    }
  }

  async listOrders(
    userId: string,
    params: { page?: number; limit?: number; status?: OrderStatus },
  ): Promise<OrderListResponse> {
    try {
      const safePage = Number.isFinite(params.page) ? Math.max(1, Math.floor(params.page!)) : 1;
      const safeLimit = Number.isFinite(params.limit)
        ? Math.max(1, Math.min(Math.floor(params.limit!), 50))
        : 10;

      const whereParts: string[] = ['user_id = $1'];
      const values: (string | number)[] = [userId];

      if (params.status) {
        values.push(params.status);
        whereParts.push(`status = $${values.length}`);
      }

      const whereClause = whereParts.join(' AND ');

      const countResult = await this.pool.query<{ total: number }>(
        `SELECT count(*)::int AS total FROM public.orders WHERE ${whereClause}`,
        values,
      );

      const total = Number(countResult.rows[0]?.total || 0);
      const totalPages = total > 0 ? Math.ceil(total / safeLimit) : 0;
      const offset = (safePage - 1) * safeLimit;

      const ordersResult = await this.pool.query<{
        id: string;
        order_number: string;
        user_id: string;
        status: OrderStatus;
        subtotal: number;
        discount: number;
        tax: number;
        total: number;
        created_at: Date;
        updated_at: Date;
        item_count: number;
      }>(
        `SELECT o.*, 
          (SELECT COALESCE(SUM(quantity), 0)::int FROM public.order_items WHERE order_id = o.id) as item_count
         FROM public.orders o
         WHERE ${whereClause}
         ORDER BY o.created_at DESC
         LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
        [...values, safeLimit, offset],
      );

      const orders: OrderListItem[] = ordersResult.rows.map((row) => ({
        id: row.id,
        orderNumber: row.order_number,
        userId: row.user_id,
        status: row.status,
        itemCount: row.item_count,
        subtotal: Number(row.subtotal),
        discount: Number(row.discount),
        tax: Number(row.tax),
        total: Number(row.total),
        createdAt: row.created_at.toISOString(),
        updatedAt: row.updated_at.toISOString(),
      }));

      return {
        success: true,
        data: {
          orders,
          pagination: {
            page: safePage,
            limit: safeLimit,
            total,
            totalPages,
          },
        },
      };
    } catch (error) {
      this.logger.error(`Failed to list orders: ${error.message}`);
      return {
        success: true,
        data: {
          orders: [],
          pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
        },
      };
    }
  }

  async cancelOrder(userId: string, orderId: string): Promise<OrderResponse> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Get order
      const orderResult = await client.query<{
        id: string;
        status: OrderStatus;
      }>(
        `SELECT id, status FROM public.orders WHERE id = $1 AND user_id = $2`,
        [orderId, userId],
      );

      if (orderResult.rows.length === 0) {
        throw new Error('Order not found');
      }

      const order = orderResult.rows[0];
      if (order.status !== 'pending' && order.status !== 'confirmed') {
        throw new Error('Cannot cancel order in current status');
      }

      // Get order items to restore stock
      const itemsResult = await client.query<{
        product_id: string;
        quantity: number;
      }>(
        `SELECT product_id, quantity FROM public.order_items WHERE order_id = $1`,
        [orderId],
      );

      // Restore stock
      for (const item of itemsResult.rows) {
        await client.query(
          `UPDATE public.products SET stock_quantity = COALESCE(stock_quantity, 0) + $2
           WHERE id = $1`,
          [item.product_id, item.quantity],
        );
      }

      // Update order status
      await client.query(
        `UPDATE public.orders SET status = 'cancelled', updated_at = NOW()
         WHERE id = $1`,
        [orderId],
      );

      await client.query('COMMIT');

      return this.getOrder(userId, orderId);
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error(`Failed to cancel order: ${error.message}`);
      return { success: false, message: error.message || 'Failed to cancel order' };
    } finally {
      client.release();
    }
  }

  // Admin methods
  async listAllOrders(params: {
    page?: number;
    limit?: number;
    status?: OrderStatus;
    search?: string;
  }): Promise<OrderListResponse> {
    try {
      const safePage = Number.isFinite(params.page) ? Math.max(1, Math.floor(params.page!)) : 1;
      const safeLimit = Number.isFinite(params.limit)
        ? Math.max(1, Math.min(Math.floor(params.limit!), 50))
        : 10;

      const whereParts: string[] = [];
      const values: (string | number)[] = [];

      if (params.status) {
        values.push(params.status);
        whereParts.push(`status = $${values.length}`);
      }

      if (params.search) {
        values.push(`%${params.search}%`);
        const searchIdx = values.length;
        whereParts.push(`(order_number ILIKE $${searchIdx} OR user_id ILIKE $${searchIdx})`);
      }

      const whereClause = whereParts.length > 0 ? `WHERE ${whereParts.join(' AND ')}` : '';

      const countResult = await this.pool.query<{ total: number }>(
        `SELECT count(*)::int AS total FROM public.orders ${whereClause}`,
        values,
      );

      const total = Number(countResult.rows[0]?.total || 0);
      const totalPages = total > 0 ? Math.ceil(total / safeLimit) : 0;
      const offset = (safePage - 1) * safeLimit;

      const ordersResult = await this.pool.query<{
        id: string;
        order_number: string;
        user_id: string;
        status: OrderStatus;
        subtotal: number;
        discount: number;
        tax: number;
        total: number;
        created_at: Date;
        updated_at: Date;
        item_count: number;
      }>(
        `SELECT o.*, 
          (SELECT COALESCE(SUM(quantity), 0)::int FROM public.order_items WHERE order_id = o.id) as item_count
         FROM public.orders o
         ${whereClause}
         ORDER BY o.created_at DESC
         LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
        [...values, safeLimit, offset],
      );

      const orders: OrderListItem[] = ordersResult.rows.map((row) => ({
        id: row.id,
        orderNumber: row.order_number,
        userId: row.user_id,
        status: row.status,
        itemCount: row.item_count,
        subtotal: Number(row.subtotal),
        discount: Number(row.discount),
        tax: Number(row.tax),
        total: Number(row.total),
        createdAt: row.created_at.toISOString(),
        updatedAt: row.updated_at.toISOString(),
      }));

      return {
        success: true,
        data: {
          orders,
          pagination: {
            page: safePage,
            limit: safeLimit,
            total,
            totalPages,
          },
        },
      };
    } catch (error) {
      this.logger.error(`Failed to list all orders: ${error.message}`);
      return {
        success: true,
        data: {
          orders: [],
          pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
        },
      };
    }
  }

  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<OrderResponse> {
    try {
      const orderResult = await this.pool.query<{ user_id: string }>(
        `UPDATE public.orders SET status = $2, updated_at = NOW()
         WHERE id = $1 RETURNING user_id`,
        [orderId, status],
      );

      if (orderResult.rows.length === 0) {
        return { success: false, message: 'Order not found' };
      }

      return this.getOrder(orderResult.rows[0].user_id, orderId);
    } catch (error) {
      this.logger.error(`Failed to update order status: ${error.message}`);
      return { success: false, message: error.message || 'Failed to update order status' };
    }
  }

  async getOrderAdmin(orderId: string): Promise<OrderResponse> {
    try {
      const orderResult = await this.pool.query<{
        id: string;
        order_number: string;
        user_id: string;
        status: OrderStatus;
        subtotal: number;
        discount: number;
        tax: number;
        total: number;
        shipping_address: Record<string, string> | null;
        billing_address: Record<string, string> | null;
        notes: string | null;
        created_at: Date;
        updated_at: Date;
      }>(
        `SELECT * FROM public.orders WHERE id = $1`,
        [orderId],
      );

      if (orderResult.rows.length === 0) {
        return { success: false, message: 'Order not found' };
      }

      const order = await this.buildOrderResponse(orderResult.rows[0]);
      return { success: true, data: order };
    } catch (error) {
      this.logger.error(`Failed to get order: ${error.message}`);
      return { success: false, message: error.message || 'Failed to get order' };
    }
  }

  private async buildOrderResponse(orderRow: {
    id: string;
    order_number: string;
    user_id: string;
    status: OrderStatus;
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
    shipping_address: Record<string, string> | null;
    billing_address: Record<string, string> | null;
    notes: string | null;
    created_at: Date;
    updated_at: Date;
  }): Promise<Order> {
    const itemsResult = await this.pool.query<{
      id: string;
      product_id: string;
      product_name: string;
      product_name_si: string | null;
      product_sku: string;
      quantity: number;
      unit_price: number;
      total_price: number;
    }>(
      `SELECT id, product_id, product_name, product_name_si, product_sku, quantity, unit_price, total_price
       FROM public.order_items WHERE order_id = $1 ORDER BY created_at ASC`,
      [orderRow.id],
    );

    const items: OrderItem[] = itemsResult.rows.map((row) => ({
      id: row.id,
      productId: row.product_id,
      productName: row.product_name,
      productNameSi: row.product_name_si,
      productSku: row.product_sku || '',
      quantity: row.quantity,
      unitPrice: Number(row.unit_price),
      totalPrice: Number(row.total_price),
    }));

    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

    return {
      id: orderRow.id,
      orderNumber: orderRow.order_number,
      userId: orderRow.user_id,
      status: orderRow.status,
      items,
      itemCount,
      subtotal: Number(orderRow.subtotal),
      discount: Number(orderRow.discount),
      tax: Number(orderRow.tax),
      total: Number(orderRow.total),
      shippingAddress: orderRow.shipping_address,
      billingAddress: orderRow.billing_address,
      notes: orderRow.notes,
      createdAt: orderRow.created_at.toISOString(),
      updatedAt: orderRow.updated_at.toISOString(),
    };
  }

}
