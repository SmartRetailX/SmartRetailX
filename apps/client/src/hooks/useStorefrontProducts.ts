import { useInfiniteQuery, useQuery } from '@tanstack/react-query'

import apiClient from '@/lib/api-client'
import { API_ENDPOINTS } from '@/lib/constants'
import type { ApiResponse, Product } from '@/types/api'

type ProductPagination = {
  page: number
  limit: number
  total: number
  totalPages: number
}

type ProductListPayload = {
  products: Product[]
  pagination: ProductPagination
}

export type StorefrontPage = {
  products: Product[]
  pagination: ProductPagination
}

export type StorefrontFilters = {
  search?: string
  category?: string
  limit?: number
}

const storefrontKeys = {
  all: ['storefront'] as const,
  list: (filters: { search: string; category: string; limit: number }) =>
    [...storefrontKeys.all, 'list', filters] as const,
  categories: (limit: number) => [...storefrontKeys.all, 'categories', limit] as const,
}

function normalizeCategory(category?: string): string | undefined {
  const value = (category || '').trim()
  if (!value || value.toLowerCase() === 'all') {
    return undefined
  }
  return value
}

async function fetchStorefrontPage(params: {
  page: number
  limit: number
  search?: string
  category?: string
}): Promise<StorefrontPage> {
  const response = await apiClient.get<ApiResponse<ProductListPayload>>(API_ENDPOINTS.CORE_CATALOG.PRODUCTS, {
    params: {
      page: params.page,
      limit: params.limit,
      search: params.search || undefined,
      category: normalizeCategory(params.category),
    },
  })

  if (!response.data?.success) {
    throw new Error(response.data?.message || 'Failed to load storefront products')
  }

  const payload = response.data.data
  return {
    products: payload.products || [],
    pagination: payload.pagination || {
      page: params.page,
      limit: params.limit,
      total: 0,
      totalPages: 0,
    },
  }
}

export function useInfiniteStorefrontProducts(filters: StorefrontFilters) {
  const search = (filters.search || '').trim()
  const category = normalizeCategory(filters.category) || ''
  const limit = filters.limit ?? 24

  return useInfiniteQuery({
    queryKey: storefrontKeys.list({ search, category, limit }),
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const page = Number(pageParam) || 1
      return fetchStorefrontPage({
        page,
        limit,
        search,
        category,
      })
    },
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.pagination
      if (page >= totalPages) {
        return undefined
      }
      return page + 1
    },
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  })
}

export function useStorefrontCategories(limit = 200) {
  return useQuery({
    queryKey: storefrontKeys.categories(limit),
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<{ categories: string[] }>>(
        API_ENDPOINTS.CORE_CATALOG.CATEGORIES,
        {
          params: {
            limit,
          },
        },
      )

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Failed to load storefront categories')
      }

      const categories = response.data.data.categories || []
      return Array.from(new Set(categories.map((category) => category.trim()).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b),
      )
    },
    staleTime: 5 * 60_000,
  })
}
