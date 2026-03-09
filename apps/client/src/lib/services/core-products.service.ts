import apiClient, { handleApiError } from '@/lib/api-client'
import { CORE_SERVICE_ENDPOINTS } from '@/lib/constants'
import type { ApiResponse, StockStatus } from '@/types/api'

export type CoreAdminProduct = {
  id: string
  sku: string
  name: string
  nameSi?: string | null
  baseProduct?: string | null
  baseProductSi?: string | null
  description?: string | null
  descriptionSi?: string | null
  category?: string | null
  categorySi?: string | null
  price: number
  currentStock: number
  imageUrl?: string | null
  isActive?: boolean
  status: StockStatus
  createdAt?: string
}

export type CoreAdminProductsListData = {
  products: CoreAdminProduct[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export type CoreAdminProductFilters = {
  search?: string
  category?: string
  page?: number
  limit?: number
  sortBy?: string
  sortDir?: 'asc' | 'desc'
}

export type CoreCreateProductInput = {
  sku: string
  name: string
  nameSi?: string
  baseProduct?: string
  baseProductSi?: string
  description?: string
  descriptionSi?: string
  category?: string
  categorySi?: string
  price: number
  stockQuantity: number
  imageUrl?: string
  isActive?: boolean
}

export type CoreUpdateProductInput = Partial<Omit<CoreCreateProductInput, 'sku'>>

function unwrapApiResponse<T>(response: { data: ApiResponse<T> }): T {
  if (!response.data.success) {
    throw new Error(response.data.message || 'Request failed')
  }

  return response.data.data
}

export async function fetchCoreAdminProducts(
  filters: CoreAdminProductFilters = {}
): Promise<CoreAdminProductsListData> {
  try {
    const response = await apiClient.get<ApiResponse<CoreAdminProductsListData>>(
      CORE_SERVICE_ENDPOINTS.ADMIN_PRODUCTS.LIST,
      { params: filters }
    )

    return unwrapApiResponse(response)
  } catch (error) {
    throw new Error(handleApiError(error))
  }
}

export async function createCoreAdminProduct(
  payload: CoreCreateProductInput
): Promise<CoreAdminProduct> {
  try {
    const response = await apiClient.post<ApiResponse<CoreAdminProduct>>(
      CORE_SERVICE_ENDPOINTS.ADMIN_PRODUCTS.CREATE,
      payload
    )

    return unwrapApiResponse(response)
  } catch (error) {
    throw new Error(handleApiError(error))
  }
}

export async function updateCoreAdminProduct(
  productId: string,
  payload: CoreUpdateProductInput
): Promise<CoreAdminProduct> {
  try {
    const response = await apiClient.patch<ApiResponse<CoreAdminProduct>>(
      CORE_SERVICE_ENDPOINTS.ADMIN_PRODUCTS.UPDATE(productId),
      payload
    )

    return unwrapApiResponse(response)
  } catch (error) {
    throw new Error(handleApiError(error))
  }
}

export async function deleteCoreAdminProduct(productId: string): Promise<void> {
  try {
    const response = await apiClient.delete<{ success: boolean; message?: string }>(
      CORE_SERVICE_ENDPOINTS.ADMIN_PRODUCTS.DELETE(productId)
    )

    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to delete product')
    }
  } catch (error) {
    throw new Error(handleApiError(error))
  }
}
