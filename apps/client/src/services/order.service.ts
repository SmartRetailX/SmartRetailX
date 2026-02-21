import { processApiResponse } from '../lib/mapper';
import { mapOrderResponse, mapPaginatedOrdersResponse } from '../mappers/order.mapper';
import {
  orderApiSchema,
  orderListApiSchema,
  type CreateOrderFormValues,
} from '../schemas/order.schema';
import type { Order, OrderStatus, PaginatedOrders, PaymentStatus } from '../types/order.type';
import { apiClient } from './api-client';

export const OrderService = {
  /**
   * Fetch a paginated list of orders
   * (Users will fetch their own, Admins fetch all depending on backend impl setup)
   */
  async getOrders(params?: {
    page?: number;
    limit?: number;
    status?: OrderStatus;
  }): Promise<PaginatedOrders> {
    return processApiResponse(
      apiClient.get('/orders', { params }),
      orderListApiSchema,
      mapPaginatedOrdersResponse,
    );
  },

  /**
   * Fetch a single order by ID
   */
  async getOrder(id: string): Promise<Order> {
    return processApiResponse(apiClient.get(`/orders/${id}`), orderApiSchema, mapOrderResponse);
  },

  /**
   * Create a new order
   */
  async createOrder(data: CreateOrderFormValues): Promise<Order> {
    return processApiResponse(apiClient.post('/orders', data), orderApiSchema, mapOrderResponse);
  },

  /**
   * Update the status of an order (Admin only)
   */
  async updateOrderStatus(id: string, status: OrderStatus, notes?: string): Promise<Order> {
    return processApiResponse(
      apiClient.patch(`/orders/${id}/status`, { status, notes }),
      orderApiSchema,
      mapOrderResponse,
    );
  },

  /**
   * Update the payment status of an order (Admin only)
   */
  async updatePaymentStatus(id: string, payment_status: PaymentStatus): Promise<Order> {
    return processApiResponse(
      apiClient.patch(`/orders/${id}/payment-status`, { payment_status }),
      orderApiSchema,
      mapOrderResponse,
    );
  },

  /**
   * Cancel an order
   */
  async cancelOrder(id: string): Promise<Order> {
    return processApiResponse(
      apiClient.post(`/orders/${id}/cancel`),
      orderApiSchema,
      mapOrderResponse,
    );
  },
};
