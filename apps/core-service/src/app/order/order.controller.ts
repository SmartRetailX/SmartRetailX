import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';

import { OrderService, OrderStatus } from './order.service';

@Controller()
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  // Customer endpoints
  @MessagePattern({ cmd: 'order_create' })
  async createOrder(data: {
    userId: string;
    shippingAddress?: Record<string, string>;
    billingAddress?: Record<string, string>;
    notes?: string;
  }) {
    return this.orderService.createOrder(data);
  }

  @MessagePattern({ cmd: 'order_get' })
  async getOrder(data: { userId: string; orderId: string }) {
    return this.orderService.getOrder(data.userId, data.orderId);
  }

  @MessagePattern({ cmd: 'order_get_by_number' })
  async getOrderByNumber(data: { userId: string; orderNumber: string }) {
    return this.orderService.getOrderByNumber(data.userId, data.orderNumber);
  }

  @MessagePattern({ cmd: 'order_list' })
  async listOrders(data: {
    userId: string;
    page?: number;
    limit?: number;
    offset?: number;
    status?: OrderStatus;
  }) {
    return this.orderService.listOrders(data.userId, {
      page: data.page,
      limit: data.limit,
      offset: data.offset,
      status: data.status,
    });
  }

  @MessagePattern({ cmd: 'order_cancel' })
  async cancelOrder(data: { userId: string; orderId: string }) {
    return this.orderService.cancelOrder(data.userId, data.orderId);
  }

  // Admin endpoints
  @MessagePattern({ cmd: 'admin_order_list' })
  async listAllOrders(data: {
    page?: number;
    limit?: number;
    offset?: number;
    status?: OrderStatus;
    search?: string;
  }) {
    return this.orderService.listAllOrders(data);
  }

  @MessagePattern({ cmd: 'admin_order_get' })
  async getOrderAdmin(data: { orderId: string }) {
    return this.orderService.getOrderAdmin(data.orderId);
  }

  @MessagePattern({ cmd: 'admin_order_update_status' })
  async updateOrderStatus(data: { orderId: string; status: OrderStatus }) {
    return this.orderService.updateOrderStatus(data.orderId, data.status);
  }
}
