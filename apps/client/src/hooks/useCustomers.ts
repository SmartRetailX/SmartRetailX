import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api-client'
import { API_ENDPOINTS } from '@/lib/constants'
import { Customer, ApiResponse } from '@/types/api'

// Query keys
export const customerKeys = {
  all: ['customers'] as const,
  list: (filters?: CustomerFilters) => [...customerKeys.all, 'list', filters] as const,
  customer: (id: string) => [...customerKeys.all, id] as const,
}

interface CustomerFilters {
  segment?: string
  search?: string
  page?: number
  limit?: number
}

interface CustomersResponse {
  customers: Customer[]
  segmentCounts: Record<string, number>
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Get customers with RFM segmentation
export function useCustomers(filters: CustomerFilters = {}) {
  return useQuery({
    queryKey: customerKeys.list(filters),
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<CustomersResponse>>(
        API_ENDPOINTS.CUSTOMERS.LIST,
        { params: filters }
      )
      // Backend returns data.data with nested structure
      const responseData = response.data.data
      // Handle both nested and flat response structures
      if (responseData && typeof responseData === 'object') {
        // If it's already in the correct format
        if ('customers' in responseData) {
          return responseData
        }
        // If customers array is at root level
        if (Array.isArray(responseData)) {
          const customers = responseData as Customer[]
          return {
            customers,
            segmentCounts: {},
            pagination: { page: 1, limit: 50, total: customers.length, totalPages: 1 }
          }
        }
      }
      // Fallback
      return {
        customers: [],
        segmentCounts: {},
        pagination: { page: 1, limit: 50, total: 0, totalPages: 0 }
      }
    },
    staleTime: 60000,
  })
}

// Get single customer
export function useCustomer(customerId: string) {
  return useQuery({
    queryKey: customerKeys.customer(customerId),
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<Customer>>(
        API_ENDPOINTS.CUSTOMERS.GET(customerId)
      )
      return response.data.data
    },
    enabled: !!customerId,
  })
}
