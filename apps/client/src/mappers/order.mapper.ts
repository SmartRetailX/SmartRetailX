import type { OrderApiResponse, OrderListApiResponse } from '../schemas/order.schema';
import type { Order, OrderItem, PaginatedOrders } from '../types/order.type';
import { mapProductResponse } from './product.mapper';

export function mapOrderResponse(apiData: OrderApiResponse): Order {
  const items: OrderItem[] = apiData.items.map((item) => ({
    id: item.id,
    orderId: item.order_id,
    productId: item.product_id,
    product: mapProductResponse(item.product),
    quantity: item.quantity,
    priceAtPurchase: item.price_at_purchase,
    createdAt: new Date(item.created_at),
  }));

  return {
    id: apiData.id,
    orderNumber: apiData.order_number,
    userId: apiData.user_id,
    totalAmount: apiData.total_amount,
    status: apiData.status,
    paymentStatus: apiData.payment_status,
    shippingAddress: apiData.shipping_address,
    notes: apiData.notes || undefined,
    items,
    createdAt: new Date(apiData.created_at),
    updatedAt: new Date(apiData.updated_at),
  };
}

export function mapPaginatedOrdersResponse(apiData: OrderListApiResponse): PaginatedOrders {
  return {
    items: apiData.orders.map(mapOrderResponse),
    total: apiData.total,
    page: apiData.page,
    limit: apiData.limit,
    totalPages: Math.ceil(apiData.total / apiData.limit),
  };
}
