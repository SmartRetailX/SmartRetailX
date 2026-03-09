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
      const response = await apiClient.get<ApiResponse<OrderListResponse>>(API_ENDPOINTS.ORDERS.LIST, {
        params: {
          page: params.page ?? 1,
          limit: params.limit ?? 10,
          status: params.status,
        },
      })
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch orders')
      }
      return response.data.data
    },
    staleTime: 30_000,
  })
}

// Get single order
export function useOrder(orderId: string) {
  return useQuery({
    queryKey: orderKeys.detail(orderId),
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<Order>>(API_ENDPOINTS.ORDERS.GET(orderId))
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch order')
      }
      return response.data.data
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
      const response = await apiClient.post<ApiResponse<Order>>(API_ENDPOINTS.ORDERS.CREATE, input)
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to create order')
      }
      return response.data.data
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
      const response = await apiClient.post<ApiResponse<Order>>(API_ENDPOINTS.ORDERS.CANCEL(orderId))
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to cancel order')
      }
      return response.data.data
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
      const response = await apiClient.get<ApiResponse<OrderListResponse>>(API_ENDPOINTS.ADMIN_ORDERS.LIST, {
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
      return response.data.data
    },
    staleTime: 30_000,
  })
}

export function useAdminOrder(orderId: string) {
  return useQuery({
    queryKey: adminOrderKeys.detail(orderId),
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<Order>>(API_ENDPOINTS.ADMIN_ORDERS.GET(orderId))
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch order')
      }
      return response.data.data
    },
    enabled: !!orderId,
    staleTime: 60_000,
  })
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: OrderStatus }) => {
      const response = await apiClient.patch<ApiResponse<Order>>(
        API_ENDPOINTS.ADMIN_ORDERS.UPDATE_STATUS(orderId),
        { status },
      )
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to update order status')
      }
      return response.data.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: adminOrderKeys.all })
      queryClient.setQueryData(adminOrderKeys.detail(data.id), data)
    },
  })
}
