import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api-client'
import { API_ENDPOINTS } from '@/lib/constants'
import {
  Sale,
  SalesAggregate,
  PaginatedResponse,
  ApiResponse,
} from '@/types/api'

// Query keys
export const salesKeys = {
  all: ['sales'] as const,
  list: (filters: SalesFilters) => [...salesKeys.all, 'list', filters] as const,
  aggregate: (filters: AggregateFilters) => 
    [...salesKeys.all, 'aggregate', filters] as const,
}

interface SalesFilters {
  startDate?: string
  endDate?: string
  storeId?: string
  page?: number
  limit?: number
}

interface AggregateFilters {
  startDate: string
  endDate: string
  storeId?: string
}

// Get sales transactions
export function useSales(filters: SalesFilters = {}) {
  return useQuery({
    queryKey: salesKeys.list(filters),
    queryFn: async () => {
      const response = await apiClient.get<PaginatedResponse<Sale>>(
        API_ENDPOINTS.SALES.LIST,
        { params: filters }
      )
      return response.data
    },
    staleTime: 30000,
  })
}

// Get sales aggregates
export function useSalesAggregate(filters?: Partial<AggregateFilters>) {
  // Default to last 30 days if no dates provided
  const getDefaultDates = () => {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 30)
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    }
  }
  
  const defaultDates = getDefaultDates()
  const params: AggregateFilters = {
    startDate: filters?.startDate || defaultDates.startDate,
    endDate: filters?.endDate || defaultDates.endDate,
    storeId: filters?.storeId
  }
  
  return useQuery({
    queryKey: salesKeys.aggregate(params),
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<SalesAggregate>>(
        API_ENDPOINTS.SALES.AGGREGATE,
        { params }
      )
      const data = response.data.data
      
      // Transform backend response to match frontend expectations
      // Backend returns timeSeries, map to dailyTrends
      const dailyTrends = data.timeSeries?.map(item => ({
        date: item.date,
        revenue: item.revenue,
        orders: item.orders
      })) || []
      
      // Calculate totals from timeSeries if not provided
      const totalRevenue = data.totalRevenue || data.timeSeries?.reduce((sum, item) => sum + item.revenue, 0) || 0
      const totalOrders = data.totalOrders || data.timeSeries?.reduce((sum, item) => sum + item.orders, 0) || 0
      const averageOrderValue = data.averageOrderValue || (totalOrders > 0 ? totalRevenue / totalOrders : 0)
      
      return {
        ...data,
        totalRevenue,
        totalOrders,
        averageOrderValue,
        dailyTrends,
        topProducts: data.topProducts || []
      }
    },
    staleTime: 60000, // 1 minute
  })
}
