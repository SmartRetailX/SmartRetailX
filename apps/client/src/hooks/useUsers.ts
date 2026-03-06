import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient, { handleApiError } from '@/lib/api-client'
import { API_ENDPOINTS } from '@/lib/constants'
import { User, ApiResponse, PaginatedResponse } from '@/types/api'

// Query keys
export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...userKeys.lists(), filters] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
}

// Get all users
export function useUsers(filters: Record<string, any> = {}) {
  return useQuery({
    queryKey: userKeys.list(filters),
    queryFn: async () => {
      const response = await apiClient.get<PaginatedResponse<User>>(
        API_ENDPOINTS.USERS.LIST,
        { params: filters }
      )
      return response.data
    },
    staleTime: 60000, // 1 minute
  })
}

// Get single user
export function useUser(userId: string) {
  return useQuery({
    queryKey: userKeys.detail(userId),
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<User>>(
        API_ENDPOINTS.USERS.GET(userId)
      )
      return response.data.data
    },
    enabled: !!userId,
  })
}

// Create user
export function useCreateUser() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (userData: Partial<User>) => {
      const response = await apiClient.post<ApiResponse<User>>(
        API_ENDPOINTS.USERS.CREATE,
        userData
      )
      return response.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() })
    },
    onError: (error) => {
      const message = handleApiError(error)
      throw new Error(message)
    },
  })
}

// Update user
export function useUpdateUser() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ 
      userId, 
      data 
    }: { 
      userId: string
      data: Partial<User> 
    }) => {
      const response = await apiClient.patch<ApiResponse<User>>(
        API_ENDPOINTS.USERS.UPDATE(userId),
        data
      )
      return response.data.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() })
      queryClient.invalidateQueries({ queryKey: userKeys.detail(variables.userId) })
    },
    onError: (error) => {
      const message = handleApiError(error)
      throw new Error(message)
    },
  })
}

// Delete user
export function useDeleteUser() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (userId: string) => {
      await apiClient.delete(API_ENDPOINTS.USERS.DELETE(userId))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() })
    },
    onError: (error) => {
      const message = handleApiError(error)
      throw new Error(message)
    },
  })
}
