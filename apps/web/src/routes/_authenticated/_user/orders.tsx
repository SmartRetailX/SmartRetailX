import { useState } from 'react';
import { useOrdersQuery, useStoreMutations } from '@/hooks';
import { createFileRoute } from '@tanstack/react-router';
import {
  AlertCircle,
  Calendar,
  ChevronDown,
  ChevronUp,
  Clock,
  Package,
  PackageCheck,
  Receipt,
  Tag,
  Truck,
  X,
} from 'lucide-react';

import { PageContainer } from '@/components/partials/container/page-container';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { formatCurrency } from '@/lib/utils';
import type { OrderStatus } from '@/types/store';

export const Route = createFileRoute('/_authenticated/_user/orders')({
  component: RouteComponent,
});

// ── Status helpers ────────────────────────────────────────────────────────────

const STATUS_META: Record<
  string,
  { label: string; color: string; bg: string; icon: React.ElementType }
> = {
  pending:    { label: 'Pending',    color: 'text-amber-700 dark:text-amber-400',   bg: 'bg-amber-100 dark:bg-amber-900/40',   icon: Clock },
  confirmed:  { label: 'Confirmed',  color: 'text-blue-700 dark:text-blue-400',     bg: 'bg-blue-100 dark:bg-blue-900/40',     icon: PackageCheck },
  processing: { label: 'Processing', color: 'text-violet-700 dark:text-violet-400', bg: 'bg-violet-100 dark:bg-violet-900/40', icon: Package },
  shipped:    { label: 'Shipped',    color: 'text-sky-700 dark:text-sky-400',       bg: 'bg-sky-100 dark:bg-sky-900/40',       icon: Truck },
  delivered:  { label: 'Delivered',  color: 'text-emerald-700 dark:text-emerald-400',bg: 'bg-emerald-100 dark:bg-emerald-900/40',icon: PackageCheck },
  cancelled:  { label: 'Cancelled',  color: 'text-red-700 dark:text-red-400',       bg: 'bg-red-100 dark:bg-red-900/40',       icon: X },
};

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? { label: status, color: 'text-gray-600', bg: 'bg-gray-100', icon: Package };
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${meta.color} ${meta.bg}`}>
      <Icon className="h-3.5 w-3.5" />
      {meta.label}
    </span>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const STATUS_TABS: Array<OrderStatus | ''> = ['', 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
const STATUS_TAB_LABELS: Record<string, string> = {
  '': 'All', pending: 'Pending', confirmed: 'Confirmed',
  processing: 'Processing', shipped: 'Shipped', delivered: 'Delivered', cancelled: 'Cancelled',
};

// ── Order card ────────────────────────────────────────────────────────────────

function OrderCard({ order, onCancel, isCancelling }: {
  order: ReturnType<typeof useOrdersQuery>['data'] extends { data?: { orders: infer O } } ? NonNullable<O>[number] : never;
  onCancel: (id: string) => void;
  isCancelling: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const meta    = STATUS_META[order.status] ?? STATUS_META.pending;
  const savings = order.subtotal - order.total;
  const canCancel = order.status === 'pending' || order.status === 'confirmed';

  return (
    <Card className={`overflow-hidden transition-shadow hover:shadow-md ${order.status === 'cancelled' ? 'opacity-75' : ''}`}>
      {/* Top bar — status accent */}
      <div className={`h-1 w-full ${meta.bg}`} />

      <CardContent className="p-0">
        {/* Main info row */}
        <div className="flex flex-wrap items-start justify-between gap-4 p-5">
          <div className="flex items-start gap-4">
            {/* Status icon */}
            <div className={`hidden sm:flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl ${meta.bg}`}>
              <meta.icon className={`h-5 w-5 ${meta.color}`} />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-bold tracking-tight">{order.orderNumber}</p>
                <StatusBadge status={order.status} />
              </div>
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {formatDateTime(order.createdAt)}
              </p>
              <p className="text-xs text-muted-foreground">ID: {order.id}</p>
            </div>
          </div>

          {/* Right: amounts + actions */}
          <div className="flex flex-col items-end gap-3">
            <div className="text-right">
              <p className="text-xl font-bold">{formatCurrency(order.total)}</p>
              {savings > 0.01 && (
                <p className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  <Tag className="h-3 w-3" />
                  Saved {formatCurrency(savings)}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {canCancel && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1 text-xs text-destructive hover:bg-destructive/10 border-destructive/40"
                  disabled={isCancelling}
                  onClick={() => onCancel(order.id)}
                >
                  <X className="h-3 w-3" />
                  Cancel
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 gap-1 text-xs"
                onClick={() => setExpanded((v) => !v)}
              >
                {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                {expanded ? 'Less' : 'Details'}
              </Button>
            </div>
          </div>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-3 divide-x border-t text-center">
          {[
            { label: 'Items',    value: order.itemCount },
            { label: 'Subtotal', value: formatCurrency(order.subtotal) },
            { label: 'Updated',  value: formatDate(order.updatedAt) },
          ].map((stat) => (
            <div key={stat.label} className="py-3">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{stat.label}</p>
              <p className="mt-0.5 text-sm font-semibold">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Expanded: shipping address */}
        {expanded && (
          <div className="border-t px-5 py-4 space-y-2 bg-muted/20">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Shipping Address</p>
            {order.shippingAddress ? (
              <p className="text-sm leading-relaxed">
                {[
                  order.shippingAddress.street,
                  order.shippingAddress.city,
                  order.shippingAddress.state,
                  order.shippingAddress.zipCode,
                  order.shippingAddress.country,
                ].filter(Boolean).join(', ')}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">No address on file.</p>
            )}
            {order.notes && (
              <>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notes</p>
                <p className="text-sm text-muted-foreground">{order.notes}</p>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

function RouteComponent() {
  const [status, setStatus] = useState<OrderStatus | ''>('');
  const ordersQuery          = useOrdersQuery({ status });
  const { cancelOrder }      = useStoreMutations();
  const orders               = ordersQuery.data?.data?.orders ?? [];

  return (
    <PageContainer className="space-y-6 px-2">
      {/* Header */}
      <div className="rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-transparent to-transparent px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
            <Receipt className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">My Orders</h1>
            <p className="text-sm text-muted-foreground">
              {orders.length > 0
                ? `${orders.length} order${orders.length !== 1 ? 's' : ''} · click an order for details`
                : 'Track and manage your placed orders.'}
            </p>
          </div>
        </div>
      </div>

      {/* Status filter chips */}
      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => {
          const meta    = tab ? STATUS_META[tab] : null;
          const active  = status === tab;
          return (
            <button
              key={tab || 'all'}
              type="button"
              onClick={() => setStatus(tab)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                active
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {meta && <meta.icon className="h-3.5 w-3.5" />}
              {STATUS_TAB_LABELS[tab || ''] ?? tab}
            </button>
          );
        })}
      </div>

      {ordersQuery.error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Unable to load orders</AlertTitle>
          <AlertDescription>{(ordersQuery.error as Error).message}</AlertDescription>
        </Alert>
      )}

      {/* Loading */}
      {ordersQuery.isLoading ? (
        <div className="flex min-h-56 items-center justify-center rounded-3xl border border-dashed">
          <Spinner className="h-6 w-6" />
        </div>

      /* Empty */
      ) : orders.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex min-h-56 flex-col items-center justify-center gap-4 text-center">
            <PackageCheck className="h-10 w-10 text-muted-foreground" />
            <div>
              <p className="text-base font-semibold">
                {status ? `No ${STATUS_TAB_LABELS[status]} orders` : 'No orders yet'}
              </p>
              <p className="text-sm text-muted-foreground">
                {status
                  ? 'Try a different status filter.'
                  : 'Your placed orders will appear here once checkout is complete.'}
              </p>
            </div>
            {!status && (
              <Button type="button" onClick={() => window.location.assign('/')}>Shop Now</Button>
            )}
          </CardContent>
        </Card>

      /* Orders list */
      ) : (
        <div className="grid gap-4">
          {orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onCancel={(id) => cancelOrder.mutate(id)}
              isCancelling={cancelOrder.isPending}
            />
          ))}
        </div>
      )}
    </PageContainer>
  );
}
