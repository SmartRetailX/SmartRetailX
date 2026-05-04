/**
 * React Query hooks for the Personalized Promotion Engine.
 * All requests go through the NestJS API Gateway proxy at /api/promotion-engine/*.
 */

import { useMutation, useQuery } from '@tanstack/react-query';

const BASE = '/api/promotion-engine';

// ── Types ──────────────────────────────────────────────────────────────────

export interface XaiReason {
  feature: string;
  label: string;
  formattedValue: string;
  contribution: number;
  importance: number;
  strength: number;
}

export interface CustomerTarget {
  customerId: string;
  customerName: string;
  location: string;
  segment: string;
  purchaseProbability: number;
  cfScore: number;
  hybridScore: number;
  targetingMethod: string;
  reasons: XaiReason[];
}

export interface CampaignSummary {
  productId: string;
  productName: string;
  productCategory: string;
  productPrice: number;
  discountPercent: number;
  totalTargeted: number;
  avgPurchaseProbability: number;
  expectedConversions: number;
  expectedRevenue: number;
  expectedCost: number;
  expectedProfit: number;
  costSavingsVsBroadcast: number;
}

export interface ABTestResult {
  success: boolean;
  productName: string;
  productCategory: string;
  productPrice: number;
  conversionRate: number;
  totalCustomers: number;
  eligibleCustomers: number;
  personalized: {
    customersReached: number;
    discountPercent: number;
    avgPurchaseProbability: number;
    conversionRate: number;
    conversions: number;
    revenue: number;
    cost: number;
    profit: number;
    roi: number;
  };
  broadcast: {
    customersReached: number;
    discountPercent: number;
    avgPurchaseProbability: number;
    conversionRate: number;
    conversions: number;
    revenue: number;
    cost: number;
    profit: number;
    roi: number;
  };
  comparison: {
    costSavings: number;
    profitImprovement: number;
    roiImprovement: number;
    convRateLift: number;
    customerEfficiency: number;
    costReduction: number;
    revenuePerCustomerPersonalized: number;
    revenuePerCustomerBroadcast: number;
    revenueEfficiency: number;
  };
}

// ── Fetcher helpers ────────────────────────────────────────────────────────

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.detail ?? body?.error ?? `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ── Hooks ──────────────────────────────────────────────────────────────────

/** Health check — polled every 10 s until models are loaded. */
export function usePromotionEngineHealth() {
  return useQuery({
    queryKey: ['promotion-engine', 'health'],
    queryFn: () =>
      apiFetch<{ status: string; models_loaded: boolean }>(`${BASE}/health`),
    refetchInterval: (query) =>
      query.state.data?.models_loaded ? false : 10_000,
    retry: false,
  });
}

/** List product categories. */
export function useProductCategories(enabled = true) {
  return useQuery({
    queryKey: ['promotion-engine', 'categories'],
    queryFn: () =>
      apiFetch<{ success: boolean; categories: string[] }>(
        `${BASE}/products/categories`,
      ).then((r) => r.categories),
    enabled,
  });
}

/** List products, optionally filtered by category. */
export function usePromotionProducts(category?: string, enabled = true) {
  return useQuery({
    queryKey: ['promotion-engine', 'products', category],
    queryFn: () => {
      const qs = category ? `?category=${encodeURIComponent(category)}` : '';
      return apiFetch<{
        success: boolean;
        products: { id: string; name: string; category: string; price: number }[];
        total: number;
      }>(`${BASE}/products${qs}`);
    },
    enabled,
  });
}

/** Campaign history list. */
export function useCampaignHistory(limit = 50) {
  return useQuery({
    queryKey: ['promotion-engine', 'campaigns', limit],
    queryFn: () =>
      apiFetch<{
        success: boolean;
        campaigns: Array<{
          id: number;
          productId: string;
          productName: string;
          productCategory: string;
          productPrice: number;
          discountPercent: number;
          totalTargeted: number;
          avgPurchaseProbability: number;
          expectedConversions: number;
          expectedRevenue: number;
          expectedCost: number;
          expectedProfit: number;
          costSavingsVsBroadcast: number;
          createdAt: string;
        }>;
        total: number;
      }>(`${BASE}/campaigns?limit=${limit}`),
  });
}

/** Single campaign detail (with targets list). */
export function useCampaignDetail(id: number | null) {
  return useQuery({
    queryKey: ['promotion-engine', 'campaign', id],
    queryFn: () =>
      apiFetch<{
        success: boolean;
        id: number;
        productId: string;
        productName: string;
        productCategory: string;
        productPrice: number;
        discountPercent: number;
        totalTargeted: number;
        avgPurchaseProbability: number;
        expectedConversions: number;
        expectedRevenue: number;
        expectedCost: number;
        expectedProfit: number;
        costSavingsVsBroadcast: number;
        targets: CustomerTarget[];
        createdAt: string;
      }>(`${BASE}/campaigns/${id}`),
    enabled: id != null,
  });
}

/** Frequently-bought-together bundles for a product. */
export function useProductBundles(productId: string | null) {
  return useQuery({
    queryKey: ['promotion-engine', 'bundles', productId],
    queryFn: () =>
      apiFetch<{
        success: boolean;
        productId: string;
        productName: string;
        totalBuyers: number;
        bundles: Array<{
          productId: string;
          productName: string;
          category: string;
          price: number;
          coPurchaseCount: number;
          support: number;
        }>;
      }>(`${BASE}/products/${productId}/bundles`),
    enabled: productId != null && productId !== '',
  });
}

/** Generate a new campaign — mutation. */
export function useGenerateCampaign() {
  return useMutation({
    mutationFn: (body: {
      productId: string;
      discountPercent: number;
      maxCustomers: number;
    }) =>
      apiFetch<{
        success: boolean;
        campaign: CampaignSummary;
        targets: CustomerTarget[];
      }>(`${BASE}/campaigns/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
  });
}

/** A/B comparison — mutation. */
export function useCompareAB() {
  return useMutation({
    mutationFn: (body: {
      productId: string;
      personalizedDiscount: number;
      broadcastDiscount: number;
      maxCustomers: number;
    }) =>
      apiFetch<ABTestResult>(`${BASE}/campaigns/compare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
  });
}
