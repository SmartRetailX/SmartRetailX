import { useMutation } from '@tanstack/react-query'
import apiClient, { handleApiError } from '@/lib/api-client'
import { API_ENDPOINTS } from '@/lib/constants'
import { VoiceQueryResponse, ApiResponse } from '@/types/api'

// Process text query (for voice or text input)
export function useTextQuery() {
  return useMutation({
    mutationFn: async (query: string) => {
      const response = await apiClient.post<ApiResponse<VoiceQueryResponse>>(
        API_ENDPOINTS.VOICE.TEXT_QUERY,
        { query }
      )
      return response.data.data
    },
    onError: (error) => {
      const message = handleApiError(error)
      throw new Error(message)
    },
  })
}
