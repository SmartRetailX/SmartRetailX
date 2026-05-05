import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  BiAlert,
  BiAlertsPayload,
  BiApiSuccessResponse,
  BiDashboardSummary,
  BiForecastExplanationPayload,
  BiForecastResponse,
  BiProductsPayload,
  BiRestockExplanationPayload,
  DashboardPeriod,
} from '@/types/bi-dashboard';

type QueryValue = string | number | boolean | null | undefined;
const rootBaseUrl = (import.meta.env.PUBLIC_BASE_URL || '').replace(/\/$/, '');
const biBaseUrl = `${rootBaseUrl}/api/bi`;

function buildUrl(path: string, query?: Record<string, QueryValue>) {
  const url = new URL(`${biBaseUrl}${path}`, window.location.origin);

  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    url.searchParams.set(key, String(value));
  });

  return rootBaseUrl ? url.toString() : `${url.pathname}${url.search}`;
}

async function fetchJson<T>(path: string, init?: RequestInit) {
  const resp = await fetch(path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });

  const payload = (await resp.json()) as T & { message?: string; error?: string };

  if (!resp.ok) {
    throw new Error(payload?.message || payload?.error || `Request failed: ${resp.status}`);
  }

  return payload;
}

export function useBiDashboardQuery(period: DashboardPeriod) {
  return useQuery({
    queryKey: ['bi-dashboard', period],
    queryFn: () =>
      fetchJson<BiApiSuccessResponse<BiDashboardSummary>>(buildUrl('/analytics/dashboard', { period })),
  });
}

export function useBiAlertsQuery(params?: {
  status?: BiAlert['status'] | Uppercase<BiAlert['status']>;
}) {
  return useQuery({
    queryKey: ['bi-alerts', params],
    queryFn: () => fetchJson<BiApiSuccessResponse<BiAlertsPayload>>(buildUrl('/alerts', params ?? {})),
  });
}

export function useBiProductsQuery(params?: {
  search?: string;
  category?: string;
  page?: number;
  limit?: number;
  offset?: number;
  status?: string;
  sortBy?: string;
  order?: string;
}) {
  return useQuery({
    queryKey: ['bi-products', params],
    queryFn: () => fetchJson<BiApiSuccessResponse<BiProductsPayload>>(buildUrl('/products', params ?? {})),
  });
}

export function useBiForecastQuery(params: { productId?: string; horizon?: number; lang?: string }) {
  return useQuery({
    queryKey: ['bi-forecast', params],
    queryFn: () =>
      fetchJson<BiApiSuccessResponse<BiForecastResponse>>(buildUrl('/forecasts', params)),
    enabled: Boolean(params.productId),
  });
}

export function useBiForecastExplanationQuery(params: { productId?: string; lang?: string }) {
  return useQuery({
    queryKey: ['bi-forecast-explain', params],
    queryFn: () =>
      fetchJson<BiApiSuccessResponse<BiForecastExplanationPayload>>(
        buildUrl('/xai/explain/forecast', params),
      ),
    enabled: Boolean(params.productId),
  });
}

export function useBiRestockExplanationQuery(params: { alertId?: string; lang?: string }) {
  return useQuery({
    queryKey: ['bi-restock-explain', params],
    queryFn: () =>
      fetchJson<BiApiSuccessResponse<BiRestockExplanationPayload>>(
        buildUrl('/xai/explain/restock', params),
      ),
    enabled: Boolean(params.alertId),
  });
}

export function useBiDashboardMutations() {
  const queryClient = useQueryClient();

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['bi-dashboard'] }),
      queryClient.invalidateQueries({ queryKey: ['bi-alerts'] }),
      queryClient.invalidateQueries({ queryKey: ['bi-products'] }),
      queryClient.invalidateQueries({ queryKey: ['bi-forecast'] }),
      queryClient.invalidateQueries({ queryKey: ['bi-forecast-explain'] }),
      queryClient.invalidateQueries({ queryKey: ['bi-restock-explain'] }),
    ]);
  };

  return {
    generateAlerts: useMutation({
      mutationFn: async () => fetchJson(buildUrl('/alerts/generate'), { method: 'POST' }),
      onSuccess: invalidate,
    }),
    acceptAlert: useMutation({
      mutationFn: async ({ alertId, payload }: { alertId: string; payload?: Record<string, unknown> }) =>
        fetchJson(buildUrl(`/alerts/${alertId}/accept`), {
          method: 'POST',
          body: JSON.stringify(payload ?? {}),
        }),
      onSuccess: invalidate,
    }),
    autoDismissAlerts: useMutation({
      mutationFn: async () => fetchJson(buildUrl('/alerts/auto-dismiss'), { method: 'POST' }),
      onSuccess: invalidate,
    }),
  };
}

export default {} as const;
