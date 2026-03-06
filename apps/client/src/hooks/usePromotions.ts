import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api-client'
import { API_ENDPOINTS } from '@/lib/constants'
import { Promotion, ApiResponse } from '@/types/api'

// Query keys
export const promotionKeys = {
  all: ['promotions'] as const,
  lists: () => [...promotionKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...promotionKeys.lists(), filters] as const,
}

// Get all promotions - returns nested promotions array per OpenAPI spec
export function usePromotions(filters: Record<string, any> = {}) {
  return useQuery({
    queryKey: promotionKeys.list(filters),
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<{ promotions: Promotion[] }>>(
        API_ENDPOINTS.PROMOTIONS.LIST,
        { params: filters }
      )
      return response.data.data.promotions
    },
    staleTime: 60000, // 1 minute
  })
}

// Get single promotion
export function usePromotion(promotionId: string) {
  return useQuery({
    queryKey: [...promotionKeys.all, promotionId],
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<Promotion>>(
        `/promotions/${promotionId}`
      )
      return response.data.data
    },
    enabled: !!promotionId,
  })
}

// Create promotion
export function useCreatePromotion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: Partial<Promotion>) => {
      const response = await apiClient.post<ApiResponse<Promotion>>(
        API_ENDPOINTS.PROMOTIONS.LIST,
        data
      )
      return response.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: promotionKeys.lists() })
    },
  })
}

// Update promotion
export function useUpdatePromotion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Promotion> }) => {
      const response = await apiClient.patch<ApiResponse<Promotion>>(
        `/promotions/${id}`,
        data
      )
      return response.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: promotionKeys.lists() })
    },
  })
}

// Delete promotion
export function useDeletePromotion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/promotions/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: promotionKeys.lists() })
    },
  })
}
