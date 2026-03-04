import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api-client'
import { API_ENDPOINTS } from '@/lib/constants'
import { AuditLog, ApiResponse } from '@/types/api'

// Query keys
export const auditKeys = {
  all: ['audit-logs'] as const,
  lists: () => [...auditKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...auditKeys.lists(), filters] as const,
}

interface AuditFilters {
  userId?: string
  entity?: string
  action?: string
  startDate?: string
  endDate?: string
  page?: number
  limit?: number
}

interface AuditLogsResponse {
  logs: AuditLog[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Get audit logs - returns nested logs array per OpenAPI spec
export function useAuditLogs(filters: AuditFilters = {}) {
  return useQuery({
    queryKey: auditKeys.list(filters),
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<AuditLogsResponse>>(
        API_ENDPOINTS.AUDIT.LIST,
        { params: filters }
      )
      return response.data.data
    },
    staleTime: 30000, // 30 seconds
  })
}
