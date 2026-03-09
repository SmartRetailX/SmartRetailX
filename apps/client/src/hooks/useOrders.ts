import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import apiClient from '@/lib/api-client'
import { API_ENDPOINTS } from '@/lib/constants'
import type { ApiResponse } from '@/types/api'
import { cartKeys } from './useCart'

// Types
export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded'

export type OrderItem = {
  id: string
  productId: string
  productName: string
  productNameSi?: string | null
  sku: string
  quantity: number
  unitPrice: number
  totalPrice: number
}

export type Order = {
  id: string
  orderNumber: string
  userId: string
  status: OrderStatus
  items: OrderItem[]
  itemCount: number
  subtotal: number
  shippingFee: number
  discount: number
  tax: number
  totalAmount: number
  shippingAddress: string | null
  billingAddress: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export type OrderListItem = Omit<Order, 'billingAddress' | 'notes'>

export type OrderListResponse = {
  orders: Order[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export type CreateOrderInput = {
  shippingAddress?: string
  notes?: string
}

type RawOrderItem = Partial<OrderItem> & {
  product_id?: string
  product_name?: string
  product_name_si?: string | null
  product_sku?: string
  unit_price?: number | string | null
  total_price?: number | string | null
}

type RawOrder = Partial<Order> & {
  order_number?: string
  user_id?: string
  item_count?: number | string | null
  total?: number | string | null
  shipping_fee?: number | string | null
  shipping_address?: unknown
  billing_address?: unknown
  created_at?: string
  updated_at?: string
  items?: RawOrderItem[]
}

type RawOrderListResponse = {
  orders: RawOrder[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function normalizeOrderStatus(value: unknown): OrderStatus {
  const normalized = String(value || 'pending').toLowerCase()
  const allowed: OrderStatus[] = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded']
  return allowed.includes(normalized as OrderStatus) ? (normalized as OrderStatus) : 'pending'
}

function normalizeAddress(value: unknown): string | null {
  if (value == null) {
    return null
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) {
      return null
    }

    try {
      const parsed = JSON.parse(trimmed)
      if (typeof parsed === 'string') {
        return parsed.trim() || null
      }

      if (parsed && typeof parsed === 'object') {
        const parts = Object.values(parsed as Record<string, unknown>)
          .map((part) => String(part).trim())
          .filter(Boolean)
        return parts.length > 0 ? parts.join(', ') : null
      }
    } catch {
      // Use raw string when it's not a JSON payload.
    }

    return trimmed
  }

  if (typeof value === 'object') {
    const parts = Object.values(value as Record<string, unknown>)
      .map((part) => String(part).trim())
      .filter(Boolean)
    return parts.length > 0 ? parts.join(', ') : null
  }

  return String(value).trim() || null
}

function normalizeOrderItem(item: RawOrderItem): OrderItem {
  return {
    id: String(item.id || ''),
    productId: String(item.productId || item.product_id || ''),
    productName: String(item.productName || item.product_name || ''),
    productNameSi: item.productNameSi ?? item.product_name_si ?? null,
    sku: String(item.sku || item.productSku || item.product_sku || ''),
    quantity: toNumber(item.quantity, 0),
    unitPrice: toNumber(item.unitPrice ?? item.unit_price, 0),
    totalPrice: toNumber(item.totalPrice ?? item.total_price, 0),
  }
}

function normalizeOrder(order: RawOrder): Order {
  const items = (order.items || []).map(normalizeOrderItem)
  const subtotal = toNumber(order.subtotal, 0)
  const discount = toNumber(order.discount, 0)
  const tax = toNumber(order.tax, 0)
  const shippingFee = toNumber(order.shippingFee ?? order.shipping_fee, 0)
  const explicitTotal = order.totalAmount ?? order.total
  const totalAmount = Number.isFinite(Number(explicitTotal))
    ? Number(explicitTotal)
    : subtotal - discount + tax + shippingFee

  const fallbackItemCount = items.reduce((sum, item) => sum + toNumber(item.quantity, 0), 0)
  const itemCount = toNumber(order.itemCount ?? order.item_count, fallbackItemCount)

  return {
    id: String(order.id || ''),
    orderNumber: String(order.orderNumber || order.order_number || ''),
    userId: String(order.userId || order.user_id || ''),
    status: normalizeOrderStatus(order.status),
    items,
    itemCount,
    subtotal,
    shippingFee,
    discount,
    tax,
    totalAmount,
    shippingAddress: normalizeAddress(order.shippingAddress ?? order.shipping_address),
    billingAddress: normalizeAddress(order.billingAddress ?? order.billing_address),
    notes: order.notes ?? null,
    createdAt: String(order.createdAt || order.created_at || new Date().toISOString()),
    updatedAt: String(order.updatedAt || order.updated_at || new Date().toISOString()),
  }
}

// Query keys
export const orderKeys = {
  all: ['orders'] as const,
  lists: () => [...orderKeys.all, 'list'] as const,
  list: (filters: { page?: number; status?: string }) => [...orderKeys.lists(), filters] as const,
  details: () => [...orderKeys.all, 'detail'] as const,
  detail: (id: string) => [...orderKeys.details(), id] as const,
}

// Customer hooks

// List orders
export function useOrders(params: { page?: number; limit?: number; status?: OrderStatus } = {}) {
  return useQuery({
    queryKey: orderKeys.list({ page: params.page, status: params.status }),
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<RawOrderListResponse>>(API_ENDPOINTS.ORDERS.LIST, {
        params: {
          page: params.page ?? 1,
          limit: params.limit ?? 10,
          status: params.status,
        },
      })
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch orders')
      }

      return {
        orders: (response.data.data.orders || []).map(normalizeOrder),
        pagination: response.data.data.pagination,
      }
    },
    staleTime: 30_000,
  })
}

// Get single order
export function useOrder(orderId: string) {
  return useQuery({
    queryKey: orderKeys.detail(orderId),
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<RawOrder>>(API_ENDPOINTS.ORDERS.GET(orderId))
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch order')
      }

      return normalizeOrder(response.data.data)
    },
    enabled: !!orderId,
    staleTime: 60_000,
  })
}

// Create order (checkout)
export function useCreateOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateOrderInput) => {
      const response = await apiClient.post<ApiResponse<RawOrder>>(API_ENDPOINTS.ORDERS.CREATE, input)
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to create order')
      }

      return normalizeOrder(response.data.data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.all })
      queryClient.invalidateQueries({ queryKey: cartKeys.all })
    },
  })
}

// Cancel order
export function useCancelOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (orderId: string) => {
      const response = await apiClient.post<ApiResponse<RawOrder>>(API_ENDPOINTS.ORDERS.CANCEL(orderId))
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to cancel order')
      }

      return normalizeOrder(response.data.data)
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: orderKeys.all })
      queryClient.setQueryData(orderKeys.detail(data.id), data)
    },
  })
}

// Admin hooks
export const adminOrderKeys = {
  all: ['adminOrders'] as const,
  lists: () => [...adminOrderKeys.all, 'list'] as const,
  list: (filters: { page?: number; status?: string; search?: string }) =>
    [...adminOrderKeys.lists(), filters] as const,
  details: () => [...adminOrderKeys.all, 'detail'] as const,
  detail: (id: string) => [...adminOrderKeys.details(), id] as const,
}

export function useAdminOrders(
  params: { page?: number; limit?: number; status?: OrderStatus; search?: string } = {},
) {
  return useQuery({
    queryKey: adminOrderKeys.list({ page: params.page, status: params.status, search: params.search }),
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<RawOrderListResponse>>(API_ENDPOINTS.ADMIN_ORDERS.LIST, {
        params: {
          page: params.page ?? 1,
          limit: params.limit ?? 10,
          status: params.status,
          search: params.search,
        },
      })
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch orders')
      }

      return {
        orders: (response.data.data.orders || []).map(normalizeOrder),
        pagination: response.data.data.pagination,
      }
    },
    staleTime: 30_000,
  })
}

export function useAdminOrder(orderId: string) {
  return useQuery({
    queryKey: adminOrderKeys.detail(orderId),
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<RawOrder>>(API_ENDPOINTS.ADMIN_ORDERS.GET(orderId))
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch order')
      }

      return normalizeOrder(response.data.data)
    },
    enabled: !!orderId,
    staleTime: 60_000,
  })
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: OrderStatus }) => {
      const response = await apiClient.patch<ApiResponse<RawOrder>>(
        API_ENDPOINTS.ADMIN_ORDERS.UPDATE_STATUS(orderId),
        { status },
      )
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to update order status')
      }

      return normalizeOrder(response.data.data)
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: adminOrderKeys.all })
      queryClient.setQueryData(adminOrderKeys.detail(data.id), data)
    },
  })
}
