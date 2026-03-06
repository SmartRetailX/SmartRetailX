import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api-client'
import { API_ENDPOINTS } from '@/lib/constants'
import { Store, ApiResponse } from '@/types/api'

// Query keys
export const storeKeys = {
  all: ['stores'] as const,
}

// Get stores - API returns nested { stores: Store[] } structure per OpenAPI spec
export function useStores(filters: { city?: string; active?: boolean } = {}) {
  return useQuery({
    queryKey: [...storeKeys.all, filters],
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<{ stores: Store[] }>>(
        API_ENDPOINTS.STORES.LIST,
        { params: filters }
      )
      return response.data.data.stores
    },
    staleTime: 300000, // 5 minutes - stores don't change often
  })
}
