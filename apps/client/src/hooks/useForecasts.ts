import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api-client'
import { API_ENDPOINTS } from '@/lib/constants'
import { ForecastResponse, ApiResponse, XAIExplanation, RestockExplanation } from '@/types/api'

// Query keys
export const forecastKeys = {
  all: ['forecasts'] as const,
  forecast: (productId: string, storeId: string, horizon?: number) =>
    [...forecastKeys.all, productId, storeId, horizon] as const,
  explanation: (type: 'forecasts' | 'restock', params: Record<string, string>) =>
    [...forecastKeys.all, 'explanation', type, params] as const,
}

interface ForecastParams {
  productId: string
  storeId: string
  horizon?: number
}

// Get sales forecast
export function useForecast({ productId, storeId, horizon = 30 }: ForecastParams) {
  return useQuery({
    queryKey: forecastKeys.forecast(productId, storeId, horizon),
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<ForecastResponse>>(
        API_ENDPOINTS.FORECASTS.GET,
        {
          params: {
            productId,
            storeId,
            horizon,
          },
        }
      )
      return response.data.data
    },
    enabled: !!productId && !!storeId,
    staleTime: 300000, // 5 minutes
  })
}

// Get XAI explanation for forecast
export function useForecastExplanation(productId: string, storeId: string) {
  return useQuery({
    queryKey: forecastKeys.explanation('forecasts', { productId, storeId }),
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<{ explanation: XAIExplanation }>>(
        API_ENDPOINTS.XAI.EXPLAIN_FORECAST,
        {
          params: {
            productId,
            storeId,
          },
        }
      )
      return response.data.data.explanation
    },
    enabled: !!productId && !!storeId,
    staleTime: 300000,
  })
}

// Get XAI explanation for restock
export function useRestockExplanation(alertId: string) {
  return useQuery({
    queryKey: forecastKeys.explanation('restock', { alertId }),
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<RestockExplanation>>(
        API_ENDPOINTS.XAI.EXPLAIN_RESTOCK,
        {
          params: {
            alertId,
          },
        }
      )
      return response.data.data
    },
    enabled: !!alertId,
    staleTime: 300000,
  })
}
