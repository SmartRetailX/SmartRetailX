import { useQuery, useMutation } from '@tanstack/react-query'
import api from '@/lib/api-client'
import { API_ENDPOINTS } from '@/lib/constants'

// ── Types ─────────────────────────────────────────────────

export interface ProductItem {
  id: string
  name: string
  category: string
  price: number
}

export interface CustomerTarget {
  customerId: string
  customerName: string
  location: string
  segment: string
  purchaseProbability: number
  cfScore: number
  hybridScore: number
  targetingMethod: string
}

export interface CampaignSummary {
  productId: string
  productName: string
  productCategory: string
  productPrice: number
  discountPercent: number
  totalTargeted: number
  avgPurchaseProbability: number
  expectedConversions: number
  expectedRevenue: number
  expectedCost: number
  expectedProfit: number
  costSavingsVsBroadcast: number
}

export interface GenerateCampaignResponse {
  success: boolean
  campaign: CampaignSummary
  targets: CustomerTarget[]
}

export interface CampaignHistoryItem {
  id: number
  productId: string
  productName: string
  productCategory: string
  productPrice: number
  discountPercent: number
  totalTargeted: number
  avgPurchaseProbability: number
  expectedConversions: number
  expectedRevenue: number
  expectedCost: number
  expectedProfit: number
  costSavingsVsBroadcast: number
  createdAt: string
}

export interface CampaignDetail extends CampaignHistoryItem {
  targets: CustomerTarget[]
}

// ── Hooks ─────────────────────────────────────────────────

export function usePromotionProducts(category?: string, enabled = true) {
  return useQuery({
    queryKey: ['promotion-products', category],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (category) params.set('category', category)
      const qs = params.toString() ? `?${params.toString()}` : ''
      const { data } = await api.get(`${API_ENDPOINTS.PROMOTION_ENGINE.PRODUCTS}${qs}`)
      return data as { success: boolean; products: ProductItem[]; total: number }
    },
    enabled,
  })
}

export function useProductCategories(enabled = true) {
  return useQuery({
    queryKey: ['promotion-categories'],
    queryFn: async () => {
      const { data } = await api.get(API_ENDPOINTS.PROMOTION_ENGINE.CATEGORIES)
      return data.categories as string[]
    },
    enabled,
  })
}

export function useGenerateCampaign() {
  return useMutation({
    mutationFn: async (payload: {
      productId: string
      discountPercent: number
      maxCustomers: number
    }) => {
      const { data } = await api.post(API_ENDPOINTS.PROMOTION_ENGINE.GENERATE, payload)
      return data as GenerateCampaignResponse
    },
  })
}

export function usePromotionEngineHealth() {
  return useQuery({
    queryKey: ['promotion-engine-health'],
    queryFn: async () => {
      const { data } = await api.get(API_ENDPOINTS.PROMOTION_ENGINE.HEALTH)
      return data as { status: string; models_loaded: boolean }
    },
    refetchInterval: (query) =>
      query.state.data?.models_loaded ? 30000 : 3000,
  })
}

export function useCampaignHistory(limit = 50) {
  return useQuery({
    queryKey: ['campaign-history', limit],
    queryFn: async () => {
      const { data } = await api.get(`${API_ENDPOINTS.PROMOTION_ENGINE.CAMPAIGNS}?limit=${limit}`)
      return data as { success: boolean; campaigns: CampaignHistoryItem[]; total: number }
    },
  })
}

export function useCampaignDetail(id: number | null) {
  return useQuery({
    queryKey: ['campaign-detail', id],
    queryFn: async () => {
      const { data } = await api.get(API_ENDPOINTS.PROMOTION_ENGINE.CAMPAIGN_DETAIL(id!))
      return data as CampaignDetail
    },
    enabled: id !== null,
  })
}
