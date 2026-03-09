import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import apiClient from '@/lib/api-client'
import { API_ENDPOINTS } from '@/lib/constants'
import type { ApiResponse } from '@/types/api'

// Types
export type CartItem = {
  id: string
  productId: string
  productName: string
  productNameSi: string | null
  sku: string
  quantity: number
  unitPrice: number
  totalPrice: number
  currentStock: number
}

export type Cart = {
  id: string
  userId: string
  status: 'active' | 'abandoned' | 'converted'
  items: CartItem[]
  itemCount: number
  subtotal: number
  createdAt: string
  updatedAt: string
}

// Query keys
export const cartKeys = {
  all: ['cart'] as const,
  detail: () => [...cartKeys.all, 'detail'] as const,
}

// Get cart
export function useCart() {
  return useQuery({
    queryKey: cartKeys.detail(),
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<Cart>>(API_ENDPOINTS.CART.GET)
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch cart')
      }
      return response.data.data
    },
    staleTime: 30_000,
  })
}

// Add to cart
export function useAddToCart() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ productId, quantity = 1 }: { productId: string; quantity?: number }) => {
      const response = await apiClient.post<ApiResponse<Cart>>(API_ENDPOINTS.CART.ADD_ITEM, {
        productId,
        quantity,
      })
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to add to cart')
      }
      return response.data.data
    },
    onSuccess: (data) => {
      queryClient.setQueryData(cartKeys.detail(), data)
    },
  })
}

// Update cart item
export function useUpdateCartItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ productId, quantity }: { productId: string; quantity: number }) => {
      const response = await apiClient.patch<ApiResponse<Cart>>(
        API_ENDPOINTS.CART.UPDATE_ITEM(productId),
        { quantity },
      )
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to update cart')
      }
      return response.data.data
    },
    onSuccess: (data) => {
      queryClient.setQueryData(cartKeys.detail(), data)
    },
  })
}

// Remove from cart
export function useRemoveFromCart() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (productId: string) => {
      const response = await apiClient.delete<ApiResponse<Cart>>(
        API_ENDPOINTS.CART.REMOVE_ITEM(productId),
      )
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to remove from cart')
      }
      return response.data.data
    },
    onSuccess: (data) => {
      queryClient.setQueryData(cartKeys.detail(), data)
    },
  })
}

// Clear cart
export function useClearCart() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.delete<ApiResponse<Cart>>(API_ENDPOINTS.CART.CLEAR)
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to clear cart')
      }
      return response.data.data
    },
    onSuccess: (data) => {
      queryClient.setQueryData(cartKeys.detail(), data)
    },
  })
}
