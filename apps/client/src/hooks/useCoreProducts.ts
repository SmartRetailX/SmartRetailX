import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  createCoreAdminProduct,
  deleteCoreAdminProduct,
  fetchCoreAdminProducts,
  updateCoreAdminProduct,
  type CoreAdminProductFilters,
  type CoreCreateProductInput,
  type CoreUpdateProductInput,
} from '@/lib/services/core-products.service'

export const coreProductKeys = {
  all: ['core-products'] as const,
  list: (filters: CoreAdminProductFilters) => [...coreProductKeys.all, 'list', filters] as const,
  infiniteList: (filters: Omit<CoreAdminProductFilters, 'page'>) =>
    [...coreProductKeys.all, 'infinite-list', filters] as const,
}

export function useCoreAdminProducts(filters: CoreAdminProductFilters = {}) {
  return useQuery({
    queryKey: coreProductKeys.list(filters),
    queryFn: () => fetchCoreAdminProducts(filters),
    staleTime: 30000,
  })
}

export function useInfiniteCoreAdminProducts(filters: CoreAdminProductFilters = {}) {
  const { page: _ignoredPage, ...restFilters } = filters

  return useInfiniteQuery({
    queryKey: coreProductKeys.infiniteList(restFilters),
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      fetchCoreAdminProducts({
        ...restFilters,
        page: typeof pageParam === 'number' ? pageParam : 1,
      }),
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.pagination
      return page < totalPages ? page + 1 : undefined
    },
    staleTime: 30000,
  })
}

export function useCoreCreateProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CoreCreateProductInput) => createCoreAdminProduct(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: coreProductKeys.all })
    },
  })
}

export function useCoreUpdateProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ productId, payload }: { productId: string; payload: CoreUpdateProductInput }) =>
      updateCoreAdminProduct(productId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: coreProductKeys.all })
    },
  })
}

export function useCoreDeleteProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (productId: string) => deleteCoreAdminProduct(productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: coreProductKeys.all })
    },
  })
}
