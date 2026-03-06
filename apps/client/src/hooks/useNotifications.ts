import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient, { handleApiError } from '@/lib/api-client'
import { API_ENDPOINTS } from '@/lib/constants'
import { Notification, ApiResponse } from '@/types/api'

// Query keys
export const notificationKeys = {
  all: ['notifications'] as const,
  lists: () => [...notificationKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...notificationKeys.lists(), filters] as const,
}

interface NotificationFilters {
  read?: boolean
  type?: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS'
  page?: number
  limit?: number
}

interface NotificationsResponse {
  notifications: Notification[]
  unreadCount: number
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Get notifications - returns nested structure with unreadCount per OpenAPI spec
export function useNotifications(filters: NotificationFilters = {}) {
  return useQuery({
    queryKey: notificationKeys.list(filters),
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<NotificationsResponse>>(
        API_ENDPOINTS.NOTIFICATIONS.LIST,
        { params: filters }
      )
      return response.data.data
    },
    staleTime: 10000, // 10 seconds - notifications should be fresh
    refetchInterval: 30000, // Poll every 30 seconds
  })
}

// Mark notification as read
export function useMarkNotificationRead() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (notificationId: string) => {
      await apiClient.patch(`/notifications/${notificationId}/read`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() })
    },
    onError: (error) => {
      const message = handleApiError(error)
      throw new Error(message)
    },
  })
}
