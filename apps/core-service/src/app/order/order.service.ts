import { Injectable, Logger } from '@nestjs/common';
import { Prisma, OrderStatus as PrismaOrderStatus, StockEntryType } from '@prisma/client';
import { PrismaService } from '@smart-retail-x/database';

import { CartService } from '../cart/cart.service';
import { InventoryService } from '../catalog/inventory.service';

// Types
export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

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
      offset: number;
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
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cartService: CartService,
    private readonly inventoryService: InventoryService,
  ) {}

  async createOrder(input: CreateOrderInput): Promise<OrderResponse> {
    try {
      const cartResponse = await this.cartService.getOrCreateCart(input.userId);
      if (!cartResponse.success || !cartResponse.data) {
        return { success: false, message: 'Failed to get cart' };
      }

      const cart = cartResponse.data;
      if (cart.items.length === 0) {
        return { success: false, message: 'Cart is empty' };
      }

      // ── Apply active bulk promotions ───────────────────────────────────────
      const now = new Date();
      const activePromotions = await this.prisma.promotion.findMany({
        where: {
          isTargettedPromotion: false,
          status: 'active',
          startDate: { lte: now },
          endDate: { gte: now },
          productId: { in: cart.items.map((i) => i.productId) },
        },
        select: { productId: true, discountPercentage: true },
      });

      // Map productId → discountPercentage (number 0-100)
      const promoMap = new Map(
        activePromotions.map((p) => [p.productId, Number(p.discountPercentage)]),
      );

      // Build line items with discount applied
      const lineItems = cart.items.map((item) => {
        const discountPct = promoMap.get(item.productId) ?? 0;
        const discountedUnit = item.unitPrice * (1 - discountPct / 100);
        const discountedTotal = discountedUnit * item.quantity;
        return {
          productId: item.productId,
          productName: item.productName,
          productNameSi: item.productNameSi ?? null,
          productSku: item.sku,
          quantity: item.quantity,
          unitPrice: discountedUnit,
          totalPrice: discountedTotal,
        };
      });

      const subtotal = cart.items.reduce((sum, i) => sum + i.totalPrice, 0);
      const discount = lineItems.reduce(
        (sum, li, idx) => sum + (cart.items[idx].totalPrice - li.totalPrice),
        0,
      );
      const tax = 0;
      const total = subtotal - discount + tax;

      const orderNumber = `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      const order = await this.prisma.$transaction(async (tx) => {
        const created = await tx.order.create({
          data: {
            orderNumber,
            userId: input.userId,
            status: PrismaOrderStatus.pending,
            subtotal,
            discount,
            tax,
            total,
            shippingAddress: input.shippingAddress ? JSON.stringify(input.shippingAddress) : null,
            billingAddress: input.billingAddress ? JSON.stringify(input.billingAddress) : null,
            notes: input.notes ?? null,
            items: { create: lineItems },
          },
          include: { items: true },
        });

        for (const item of cart.items) {
          await this.inventoryService.requireAvailableStock(item.productId, item.quantity, tx);
          await this.inventoryService.adjustStock(
            {
              productId: item.productId,
              quantityChange: -item.quantity,
              type: StockEntryType.sale,
              note: `Order ${orderNumber} placed`,
              referenceId: created.id,
              createdBy: input.userId,
            },
            tx,
          );
        }

        // Mark cart as converted
        await tx.cart.update({
          where: { id: cart.id },
          data: { status: 'converted' },
        });

        return created;
      });

      return { success: true, data: this.toOrder(order) };
    } catch (error) {
      this.logger.error(`Failed to create order: ${(error as Error).message}`);
      return { success: false, message: (error as Error).message || 'Failed to create order' };
    }
  }

  async getOrder(userId: string, orderId: string): Promise<OrderResponse> {
    try {
      const order = await this.prisma.order.findFirst({
        where: { id: orderId, userId },
        include: { items: { orderBy: { createdAt: 'asc' } } },
      });

      if (!order) return { success: false, message: 'Order not found' };
      return { success: true, data: this.toOrder(order) };
    } catch (error) {
      this.logger.error(`Failed to get order: ${(error as Error).message}`);
      return { success: false, message: (error as Error).message || 'Failed to get order' };
    }
  }

  async getOrderByNumber(userId: string, orderNumber: string): Promise<OrderResponse> {
    try {
      const order = await this.prisma.order.findFirst({
        where: { orderNumber, userId },
        include: { items: { orderBy: { createdAt: 'asc' } } },
      });

      if (!order) return { success: false, message: 'Order not found' };
      return { success: true, data: this.toOrder(order) };
    } catch (error) {
      this.logger.error(`Failed to get order: ${(error as Error).message}`);
      return { success: false, message: (error as Error).message || 'Failed to get order' };
    }
  }

  async listOrders(
    userId: string,
    params: { page?: number; limit?: number; offset?: number; status?: OrderStatus },
  ): Promise<OrderListResponse> {
    try {
      const safeLimit = Number.isFinite(params.limit)
        ? Math.max(1, Math.min(Math.floor(params.limit!), 50))
        : 10;
      const requestedOffset =
        Number.isFinite(params.offset) && params.offset! >= 0
          ? Math.floor(params.offset!)
          : undefined;
      const requestedPage = Number.isFinite(params.page)
        ? Math.max(1, Math.floor(params.page!))
        : 1;
      const safeOffset = requestedOffset ?? (requestedPage - 1) * safeLimit;
      const safePage = Math.floor(safeOffset / safeLimit) + 1;

      const where = {
        userId,
        ...(params.status ? { status: params.status as PrismaOrderStatus } : {}),
      };

      const [total, rows] = await Promise.all([
        this.prisma.order.count({ where }),
        this.prisma.order.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: safeOffset,
          take: safeLimit,
          include: { items: { select: { quantity: true } } },
        }),
      ]);

      return {
        success: true,
        data: {
          orders: rows.map((o) => this.toOrderListItem(o)),
          pagination: {
            page: safePage,
            limit: safeLimit,
            offset: safeOffset,
            total,
            totalPages: total > 0 ? Math.ceil(total / safeLimit) : 0,
          },
        },
      };
    } catch (error) {
      this.logger.error(`Failed to list orders: ${(error as Error).message}`);
      return {
        success: true,
        data: {
          orders: [],
          pagination: { page: 1, limit: 10, offset: 0, total: 0, totalPages: 0 },
        },
      };
    }
  }

  async cancelOrder(userId: string, orderId: string): Promise<OrderResponse> {
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const order = await tx.order.findFirst({
          where: { id: orderId, userId },
          include: { items: { select: { productId: true, quantity: true } } },
        });

        if (!order) throw new Error('Order not found');
        if (
          order.status !== PrismaOrderStatus.pending &&
          order.status !== PrismaOrderStatus.confirmed
        ) {
          throw new Error('Cannot cancel order in current status');
        }

        for (const item of order.items) {
          await this.inventoryService.adjustStock(
            {
              productId: item.productId,
              quantityChange: item.quantity,
              type: StockEntryType.cancellation,
              note: `Order ${order.orderNumber} cancelled`,
              referenceId: order.id,
              createdBy: userId,
            },
            tx,
          );
        }

        return tx.order.update({
          where: { id: orderId },
          data: { status: PrismaOrderStatus.cancelled },
          include: { items: { orderBy: { createdAt: 'asc' } } },
        });
      });

      return { success: true, data: this.toOrder(result) };
    } catch (error) {
      this.logger.error(`Failed to cancel order: ${(error as Error).message}`);
      return { success: false, message: (error as Error).message || 'Failed to cancel order' };
    }
  }

  // ── Admin ────────────────────────────────────────────────────────────────

  async listAllOrders(params: {
    page?: number;
    limit?: number;
    offset?: number;
    status?: OrderStatus;
    search?: string;
  }): Promise<OrderListResponse> {
    try {
      const safeLimit = Number.isFinite(params.limit)
        ? Math.max(1, Math.min(Math.floor(params.limit!), 50))
        : 10;
      const requestedOffset =
        Number.isFinite(params.offset) && params.offset! >= 0
          ? Math.floor(params.offset!)
          : undefined;
      const requestedPage = Number.isFinite(params.page)
        ? Math.max(1, Math.floor(params.page!))
        : 1;
      const safeOffset = requestedOffset ?? (requestedPage - 1) * safeLimit;
      const safePage = Math.floor(safeOffset / safeLimit) + 1;

      const where: Parameters<typeof this.prisma.order.findMany>[0]['where'] = {};
      if (params.status) where.status = params.status as PrismaOrderStatus;
      if (params.search) {
        where.OR = [
          { orderNumber: { contains: params.search, mode: 'insensitive' } },
          { userId: { contains: params.search, mode: 'insensitive' } },
        ];
      }

      const [total, rows] = await Promise.all([
        this.prisma.order.count({ where }),
        this.prisma.order.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: safeOffset,
          take: safeLimit,
          include: { items: { select: { quantity: true } } },
        }),
      ]);

      return {
        success: true,
        data: {
          orders: rows.map((o) => this.toOrderListItem(o)),
          pagination: {
            page: safePage,
            limit: safeLimit,
            offset: safeOffset,
            total,
            totalPages: total > 0 ? Math.ceil(total / safeLimit) : 0,
          },
        },
      };
    } catch (error) {
      this.logger.error(`Failed to list all orders: ${(error as Error).message}`);
      return {
        success: true,
        data: {
          orders: [],
          pagination: { page: 1, limit: 10, offset: 0, total: 0, totalPages: 0 },
        },
      };
    }
  }

  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<OrderResponse> {
    try {
      const order = await this.prisma.order.update({
        where: { id: orderId },
        data: { status: status as PrismaOrderStatus },
        include: { items: { orderBy: { createdAt: 'asc' } } },
      });

      return { success: true, data: this.toOrder(order) };
    } catch (error) {
      const err = error as { code?: string; message?: string };
      this.logger.error(`Failed to update order status: ${err.message}`);
      if (err.code === 'P2025') return { success: false, message: 'Order not found' };
      return { success: false, message: err.message || 'Failed to update order status' };
    }
  }

  async getOrderAdmin(orderId: string): Promise<OrderResponse> {
    try {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: { items: { orderBy: { createdAt: 'asc' } } },
      });

      if (!order) return { success: false, message: 'Order not found' };
      return { success: true, data: this.toOrder(order) };
    } catch (error) {
      this.logger.error(`Failed to get order: ${(error as Error).message}`);
      return { success: false, message: (error as Error).message || 'Failed to get order' };
    }
  }

  // ── Mappers ──────────────────────────────────────────────────────────────

  private toOrder(row: {
    id: string;
    orderNumber: string;
    userId: string;
    status: PrismaOrderStatus;
    subtotal: Prisma.Decimal;
    discount: Prisma.Decimal;
    tax: Prisma.Decimal;
    total: Prisma.Decimal;
    shippingAddress: string | null;
    billingAddress: string | null;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
    items: Array<{
      id: string;
      productId: string;
      productName: string;
      productNameSi: string | null;
      productSku: string;
      quantity: number;
      unitPrice: Prisma.Decimal;
      totalPrice: Prisma.Decimal;
    }>;
  }): Order {
    const items: OrderItem[] = row.items.map((i) => ({
      id: i.id,
      productId: i.productId,
      productName: i.productName,
      productNameSi: i.productNameSi,
      productSku: i.productSku,
      quantity: i.quantity,
      unitPrice: Number(i.unitPrice),
      totalPrice: Number(i.totalPrice),
    }));

    return {
      id: row.id,
      orderNumber: row.orderNumber,
      userId: row.userId,
      status: row.status as OrderStatus,
      items,
      itemCount: items.reduce((s, i) => s + i.quantity, 0),
      subtotal: Number(row.subtotal),
      discount: Number(row.discount),
      tax: Number(row.tax),
      total: Number(row.total),
      shippingAddress: row.shippingAddress
        ? (JSON.parse(row.shippingAddress) as Record<string, string>)
        : null,
      billingAddress: row.billingAddress
        ? (JSON.parse(row.billingAddress) as Record<string, string>)
        : null,
      notes: row.notes,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private toOrderListItem(row: {
    id: string;
    orderNumber: string;
    userId: string;
    status: PrismaOrderStatus;
    subtotal: Prisma.Decimal;
    discount: Prisma.Decimal;
    tax: Prisma.Decimal;
    total: Prisma.Decimal;
    createdAt: Date;
    updatedAt: Date;
    items: Array<{ quantity: number }>;
  }): OrderListItem {
    return {
      id: row.id,
      orderNumber: row.orderNumber,
      userId: row.userId,
      status: row.status as OrderStatus,
      itemCount: row.items.reduce((s, i) => s + i.quantity, 0),
      subtotal: Number(row.subtotal),
      discount: Number(row.discount),
      tax: Number(row.tax),
      total: Number(row.total),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
