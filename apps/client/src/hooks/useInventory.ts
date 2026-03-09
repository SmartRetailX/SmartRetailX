import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient, { handleApiError } from '@/lib/api-client'
import { API_ENDPOINTS } from '@/lib/constants'
import {
  Product,
  ApiResponse,
  StockStatus,
  InventoryStatus,
} from '@/types/api'

// Query keys
export const inventoryKeys = {
  all: ['inventory'] as const,
  products: () => [...inventoryKeys.all, 'products'] as const,
  productsList: (filters: ProductFilters) => 
    [...inventoryKeys.products(), filters] as const,
  product: (id: string) => [...inventoryKeys.products(), id] as const,
  status: () => [...inventoryKeys.all, 'status'] as const,
}

interface ProductFilters {
  search?: string
  status?: StockStatus
  category?: string
  storeId?: string
  page?: number
  limit?: number
}

// Get products with filters
export function useProducts(filters: ProductFilters = {}) {
  return useQuery({
    queryKey: inventoryKeys.productsList(filters),
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<{ products: Product[], pagination: any }>>(
        API_ENDPOINTS.PRODUCTS.LIST,
        { params: filters }
      )
      // Backend returns data.products array, not data as array
      const products = response.data.data.products || []
      const pagination = response.data.data.pagination || { page: 1, limit: 50, total: 0, totalPages: 0 }
      
      // Transform to match expected PaginatedResponse format
      return {
        success: response.data.success,
        data: products,
        pagination: pagination
      }
    },
    staleTime: 30000, // 30 seconds
  })
}

// Get single product
export function useProduct(productId: string) {
  return useQuery({
    queryKey: inventoryKeys.product(productId),
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<Product>>(
        API_ENDPOINTS.PRODUCTS.GET(productId)
      )
      return response.data.data
    },
    enabled: !!productId,
  })
}

interface InventoryStatusResponse {
  summary: {
    totalProducts: number
    inStock: number
    lowStock: number
    outOfStock: number
    totalValue: number
  }
  items: Array<{
    productId: string
    productName: string
    currentStock: number
    reorderLevel: number
    status: string
    daysUntilStockout?: number
    lastRestocked?: string
  }>
}

// Get inventory status - returns summary and items per OpenAPI spec
export function useInventoryStatus() {
  return useQuery({
    queryKey: [...inventoryKeys.status()],
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<InventoryStatusResponse>>(
        API_ENDPOINTS.INVENTORY.STATUS
      )
      // Transform to legacy format for backward compatibility
      const data = response.data.data
      return {
        totalProducts: data.summary.totalProducts,
        lowStockCount: data.summary.lowStock,
        outOfStockCount: data.summary.outOfStock,
        totalValue: data.summary.totalValue,
        categories: [],
        items: data.items
      } as InventoryStatus & { items: typeof data.items }
    },
  })
}

// Create product mutation
export function useCreateProduct() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (productData: Partial<Product>) => {
      const response = await apiClient.post<ApiResponse<Product>>(
        API_ENDPOINTS.PRODUCTS.CREATE,
        productData
      )
      return response.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.products() })
      queryClient.invalidateQueries({ queryKey: inventoryKeys.status() })
    },
    onError: (error) => {
      const message = handleApiError(error)
      console.error('Failed to create product:', message)
      throw new Error(message)
    },
  })
}

// Update product mutation
export function useUpdateProduct() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ 
      id, 
      data 
    }: { 
      id: string
      data: Partial<Product> 
    }) => {
      const response = await apiClient.patch<ApiResponse<Product>>(
        API_ENDPOINTS.PRODUCTS.UPDATE(id),
        data
      )
      return response.data.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.products() })
      queryClient.invalidateQueries({ queryKey: inventoryKeys.product(variables.id) })
      queryClient.invalidateQueries({ queryKey: inventoryKeys.status() })
    },
    onError: (error) => {
      const message = handleApiError(error)
      console.error('Failed to update product:', message)
      throw new Error(message)
    },
  })
}

// Delete product mutation
export function useDeleteProduct() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (productId: string) => {
      await apiClient.delete(API_ENDPOINTS.PRODUCTS.DELETE(productId))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.products() })
      queryClient.invalidateQueries({ queryKey: inventoryKeys.status() })
    },
    onError: (error) => {
      const message = handleApiError(error)
      console.error('Failed to delete product:', message)
      throw new Error(message)
    },
  })
}

// Restock mutation
export function useRestock() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (restockData: {
      productId: string
      quantity: number
    }) => {
      const response = await apiClient.post(
        API_ENDPOINTS.INVENTORY.RESTOCK,
        restockData
      )
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.products() })
      queryClient.invalidateQueries({ queryKey: inventoryKeys.status() })
    },
    onError: (error) => {
      const message = handleApiError(error)
      console.error('Failed to restock:', message)
      throw new Error(message)
    },
  })
}
