/**
 * Bulk Promotions Admin Page
 * Admin creates store-wide (non-personalized) promotions linked to a product.
 * Visible to ALL customers within the active date range.
 */

import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Loader2,
  PackageOpen,
  Percent,
  Plus,
  Tag,
  Trash2,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';

import { PageContainer } from '@/components/partials/container/page-container';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { useAdminCategoriesQuery, useAdminProductsQuery } from '@/hooks';
import { formatCurrency } from '@/lib/utils';

// ── Constants ────────────────────────────────────────────────────────────────

const PROMOTION_TYPES = [
  { value: 'seasonal_offer',   label: '🌿 Seasonal Offer' },
  { value: 'awrudu_offer',     label: '🎉 Awrudu Offer' },
  { value: 'christmas_offer',  label: '🎄 Christmas Offer' },
  { value: 'new_year_offer',   label: '🎆 New Year Offer' },
  { value: 'flash_sale',       label: '⚡ Flash Sale' },
  { value: 'clearance',        label: '🏷️ Clearance' },
  { value: 'bundle_deal',      label: '📦 Bundle Deal' },
  { value: 'loyalty_reward',   label: '⭐ Loyalty Reward' },
];

// ── Types ────────────────────────────────────────────────────────────────────

interface BulkPromotion {
  id: string;
  productId: string;
  productName: string;
  productCategory: string;
  productPrice: number;
  discountPercentage: number;
  startDate: string;
  endDate: string;
  promotionType: string;
  status: string | null;
  createdAt: string;
}

interface PromotionListResponse {
  success: boolean;
  data: {
    promotions: BulkPromotion[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  };
}

// ── API helpers ──────────────────────────────────────────────────────────────

const BASE = '/api/core';

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: 'include', ...init });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.message ?? `Request failed: ${res.status}`);
  return body as T;
}

// ── Hooks ────────────────────────────────────────────────────────────────────

function useBulkPromotions(status?: string) {
  return useQuery<PromotionListResponse>({
    queryKey: ['admin-bulk-promotions', status],
    queryFn: () => {
      const qs = status ? `?status=${status}` : '';
      return apiFetch<PromotionListResponse>(`${BASE}/admin/promotions${qs}`);
    },
  });
}

function useCreatePromotion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<BulkPromotion, 'id' | 'productName' | 'productCategory' | 'productPrice' | 'status' | 'createdAt'>) =>
      apiFetch(`${BASE}/admin/promotions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-bulk-promotions'] });
      toast.success('Promotion created successfully');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

function useUpdatePromotionStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiFetch(`${BASE}/admin/promotions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-bulk-promotions'] });
      toast.success('Promotion updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

function useDeletePromotion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`${BASE}/admin/promotions/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-bulk-promotions'] });
      toast.success('Promotion deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status, endDate }: { status: string | null; endDate: string }) {
  const expired = new Date(endDate) < new Date();
  const effective = expired ? 'expired' : (status ?? 'active');

  const styles: Record<string, string> = {
    active:   'bg-emerald-50 text-emerald-700 border-emerald-200',
    inactive: 'bg-gray-50 text-gray-500 border-gray-200',
    expired:  'bg-rose-50 text-rose-600 border-rose-200',
  };
  const labels: Record<string, string> = {
    active: 'Active', inactive: 'Inactive', expired: 'Expired',
  };

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${styles[effective] ?? styles.inactive}`}>
      {effective === 'active'   && <CheckCircle2 className="h-3 w-3" />}
      {effective === 'inactive' && <XCircle      className="h-3 w-3" />}
      {effective === 'expired'  && <AlertCircle  className="h-3 w-3" />}
      {labels[effective] ?? effective}
    </span>
  );
}

// ── Promotion type label ──────────────────────────────────────────────────────

function promoTypeLabel(value: string) {
  return PROMOTION_TYPES.find((t) => t.value === value)?.label ?? value;
}

// ── Create form ──────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  categoryName: '',
  productId: '',
  discountPercentage: '',
  startDate: '',
  endDate: '',
  promotionType: '',
};

function CreatePromotionForm({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const categoriesQuery = useAdminCategoriesQuery();
  const productsQuery   = useAdminProductsQuery({ category: form.categoryName || undefined, limit: 200 });
  const create          = useCreatePromotion();

  const categories = categoriesQuery.data?.data?.categories ?? [];
  const products   = productsQuery.data?.data?.products ?? [];

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const updates: Partial<typeof form> = { [field]: e.target.value };
    // Clear product when category changes
    if (field === 'categoryName') updates.productId = '';
    setForm((f) => ({ ...f, ...updates }));
  };

  const canSubmit =
    form.productId &&
    form.discountPercentage &&
    form.startDate &&
    form.endDate &&
    form.promotionType &&
    !create.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    create.mutate(
      {
        productId: form.productId,
        discountPercentage: Number(form.discountPercentage),
        startDate: form.startDate,
        endDate: form.endDate,
        promotionType: form.promotionType,
      },
      { onSuccess: () => { setForm(EMPTY_FORM); onClose(); } },
    );
  };

  const inputCls = 'w-full appearance-none rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring';

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader>
        <CardTitle className="text-base">New Bulk Promotion</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {/* Category filter */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Category</label>
            <div className="relative">
              <select className={inputCls} value={form.categoryName} onChange={set('categoryName')}>
                <option value="">All categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
            </div>
          </div>

          {/* Product */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Product *</label>
            <div className="relative">
              <select className={inputCls} value={form.productId} onChange={set('productId')} required>
                <option value="">Select product…</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {formatCurrency(p.price)}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
            </div>
          </div>

          {/* Promotion type */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Promotion type *</label>
            <div className="relative">
              <select className={inputCls} value={form.promotionType} onChange={set('promotionType')} required>
                <option value="">Select type…</option>
                {PROMOTION_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
            </div>
          </div>

          {/* Discount */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Discount % *</label>
            <div className="relative">
              <Input
                type="number"
                min={1}
                max={99}
                step={0.5}
                placeholder="e.g. 20"
                value={form.discountPercentage}
                onChange={set('discountPercentage')}
                required
                className="pr-8"
              />
              <Percent className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
            </div>
          </div>

          {/* Start date */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Start date *</label>
            <Input type="datetime-local" value={form.startDate} onChange={set('startDate')} required />
          </div>

          {/* End date */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">End date *</label>
            <Input type="datetime-local" value={form.endDate} onChange={set('endDate')} required />
          </div>
        </CardContent>

        <CardFooter className="gap-2">
          <Button type="submit" disabled={!canSubmit}>
            {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Create Promotion
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        </CardFooter>
      </form>
    </Card>
  );
}

// ── Promotion card ───────────────────────────────────────────────────────────

function PromotionCard({ promo }: { promo: BulkPromotion }) {
  const updateStatus = useUpdatePromotionStatus();
  const del          = useDeletePromotion();
  const isActive     = promo.status === 'active';

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-white shadow-sm">
              <span className="text-[10px] font-semibold leading-none">OFF</span>
              <span className="text-xl font-bold leading-tight">{promo.discountPercentage}%</span>
            </div>
            <div>
              <p className="font-semibold leading-snug">{promo.productName}</p>
              <p className="text-xs text-muted-foreground">{promo.productCategory}</p>
            </div>
          </div>
          <StatusBadge status={promo.status} endDate={promo.endDate} />
        </div>

        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1">
            <Tag className="h-3 w-3" />{promoTypeLabel(promo.promotionType)}
          </span>
          <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1">
            <Percent className="h-3 w-3" />Original: {formatCurrency(promo.productPrice)}
          </span>
        </div>

        <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Calendar className="h-3 w-3" />
            <span className="font-medium">Start:</span> {fmtDate(promo.startDate)}
          </span>
          <span className="flex items-center gap-1.5">
            <Calendar className="h-3 w-3" />
            <span className="font-medium">End:</span>   {fmtDate(promo.endDate)}
          </span>
        </div>
      </CardContent>

      <CardFooter className="gap-2">
        <Button
          size="sm"
          variant={isActive ? 'outline' : 'default'}
          disabled={updateStatus.isPending}
          onClick={() => updateStatus.mutate({ id: promo.id, status: isActive ? 'inactive' : 'active' })}
        >
          {isActive ? 'Deactivate' : 'Activate'}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="text-destructive hover:text-destructive"
          disabled={del.isPending}
          onClick={() => del.mutate(promo.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function PromotionsAdminPage() {
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<string | undefined>(undefined);
  const query = useBulkPromotions(filter);

  const promotions = query.data?.data?.promotions ?? [];
  const total      = query.data?.data?.pagination?.total ?? 0;

  return (
    <PageContainer className="space-y-6">
      {/* Header */}
      <div className="rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-transparent to-transparent px-6 py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
              <Tag className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold">Bulk Promotions</h1>
              <p className="text-sm text-muted-foreground">
                Store-wide offers visible to all customers within the date range.
              </p>
            </div>
          </div>
          <Button onClick={() => setShowForm((v) => !v)}>
            <Plus className="h-4 w-4" />
            New Promotion
          </Button>
        </div>
      </div>

      {/* Create form */}
      {showForm && <CreatePromotionForm onClose={() => setShowForm(false)} />}

      {/* Stats */}
      {promotions.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { label: 'Total',    value: total,                                      color: 'text-primary bg-primary/10' },
            { label: 'Active',   value: promotions.filter((p) => p.status === 'active').length, color: 'text-emerald-600 bg-emerald-50' },
            { label: 'Inactive', value: promotions.filter((p) => p.status !== 'active').length, color: 'text-muted-foreground bg-muted' },
          ].map((s) => (
            <Card key={s.label} size="sm">
              <CardContent className="flex items-center gap-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${s.color}`}>
                  <Tag className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-lg font-semibold leading-none">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2">
        {[
          { label: 'All',      value: undefined  },
          { label: 'Active',   value: 'active'   },
          { label: 'Inactive', value: 'inactive' },
        ].map((tab) => (
          <Button
            key={tab.label}
            size="sm"
            variant={filter === tab.value ? 'default' : 'outline'}
            onClick={() => setFilter(tab.value)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Loading */}
      {query.isLoading && (
        <div className="flex min-h-56 items-center justify-center rounded-3xl border border-dashed">
          <Spinner className="h-6 w-6" />
        </div>
      )}

      {/* Error */}
      {query.error && (
        <Alert variant="destructive">
          <AlertDescription>{(query.error as Error).message}</AlertDescription>
        </Alert>
      )}

      {/* Empty */}
      {!query.isLoading && promotions.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex min-h-56 flex-col items-center justify-center gap-4 text-center">
            <PackageOpen className="h-10 w-10 text-muted-foreground" />
            <div>
              <p className="text-base font-semibold">No promotions yet</p>
              <p className="text-sm text-muted-foreground">
                Click "New Promotion" to create your first store-wide offer.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Grid */}
      {promotions.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {promotions.map((p) => <PromotionCard key={p.id} promo={p} />)}
        </div>
      )}
    </PageContainer>
  );
}
