import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient, { handleApiError } from '@/lib/api-client'
import { API_ENDPOINTS } from '@/lib/constants'
import { Alert, ApiResponse } from '@/types/api'

// Query keys
export const alertKeys = {
  all: ['alerts'] as const,
  list: (filters?: AlertFilters) => [...alertKeys.all, 'list', filters] as const,
}

interface AlertFilters {
  severity?: string
  read?: boolean
}

// Get alerts
export function useAlerts(filters: AlertFilters = {}) {
  return useQuery({
    queryKey: alertKeys.list(filters),
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<{ alerts: Alert[] }>>(
        API_ENDPOINTS.ALERTS.LIST,
        { params: filters }
      )
      return response.data.data.alerts
    },
    refetchInterval: 60000, // Refetch every minute
  })
}

// Accept alert mutation
export function useAcceptAlert() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (alertId: string) => {
      const response = await apiClient.post(
        API_ENDPOINTS.ALERTS.ACCEPT(alertId)
      )
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: alertKeys.all })
    },
    onError: (error) => {
      const message = handleApiError(error)
      console.error('Failed to accept alert:', message)
      throw new Error(message)
    },
  })
}

// Generate alerts from ML service
export function useGenerateAlerts() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.post(API_ENDPOINTS.ALERTS.GENERATE)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: alertKeys.all })
    },
    onError: (error) => {
      const message = handleApiError(error)
      console.error('Failed to generate alerts:', message)
      throw new Error(message)
    },
  })
}

// Auto-dismiss resolved alerts
export function useAutoDismissAlerts() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.post(API_ENDPOINTS.ALERTS.AUTO_DISMISS)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: alertKeys.all })
    },
    onError: (error) => {
      const message = handleApiError(error)
      console.error('Failed to auto-dismiss alerts:', message)
      throw new Error(message)
    },
  })
}
