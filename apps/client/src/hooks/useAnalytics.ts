import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api-client'
import { API_ENDPOINTS } from '@/lib/constants'
import { DashboardMetrics, ApiResponse } from '@/types/api'

// Query keys
export const analyticsKeys = {
  all: ['analytics'] as const,
  dashboard: (period?: string) =>
    [...analyticsKeys.all, 'dashboard', period] as const,
}

interface DashboardParams {
  period?: 'day' | 'week' | 'month' | 'year'
}

// Get dashboard KPIs and metrics
export function useDashboard({ period = 'month' }: DashboardParams = {}) {
  return useQuery({
    queryKey: analyticsKeys.dashboard(period),
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<DashboardMetrics>>(
        API_ENDPOINTS.ANALYTICS.DASHBOARD,
        {
          params: {
            period,
          },
        }
      )
      const data = response.data.data
      // Ensure all required KPI fields have defaults
      return {
        kpis: data.kpis || {
          totalRevenue: { value: 0, change: 0, trend: 'stable' as const },
          totalOrders: { value: 0, change: 0, trend: 'stable' as const },
          activeAlerts: { value: 0, change: 0, trend: 'stable' as const },
          forecastAccuracy: { value: 0, change: 0, trend: 'stable' as const },
          customerRetention: { value: 0, change: 0, trend: 'stable' as const },
          inventoryTurnover: { value: 0, change: 0, trend: 'stable' as const }
        },
        topProducts: data.topProducts || [],
        salesTrend: data.salesTrend || []
      }
    },
    staleTime: 60000, // 1 minute
    refetchInterval: 120000, // Refetch every 2 minutes
  })
}
