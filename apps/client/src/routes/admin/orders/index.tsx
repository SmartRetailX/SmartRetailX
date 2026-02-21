import * as React from 'react';
import { useOrdersQuery, useUpdateOrderStatusMutation } from '@/queries/order.queries';
import { createFileRoute } from '@tanstack/react-router';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Clock,
  Loader2,
  Package,
  Truck,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import type { OrderStatus } from '@/types/order.type';

export const Route = createFileRoute('/admin/orders/')({
  component: AdminOrdersPage,
  validateSearch: z.object({
    page: z.number().int().positive().optional().catch(1),
    status: z.string().optional().catch(''),
  }),
});

// ---------------------------------------------------------------------------
// Status configuration
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  pending: {
    label: 'Pending',
    icon: Clock,
    color: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  },
  processing: {
    label: 'Processing',
    icon: Loader2,
    color: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  },
  shipped: {
    label: 'Shipped',
    icon: Truck,
    color: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  },
  delivered: {
    label: 'Delivered',
    icon: CheckCircle2,
    color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  },
  cancelled: {
    label: 'Cancelled',
    icon: XCircle,
    color: 'bg-red-500/15 text-red-400 border-red-500/30',
  },
};

const NEXT_STATUSES: Record<string, OrderStatus[]> = {
  pending: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};

const STATUS_FILTER_TABS = ['', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function AdminOrdersPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  const page = search.page ?? 1;

  const { data, isLoading, isError } = useOrdersQuery({
    page,
    limit: 20,
    status: search.status as OrderStatus | undefined,
  });

  const { mutateAsync: updateStatus, isPending: isUpdating } = useUpdateOrderStatusMutation();

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    try {
      await updateStatus({ id: orderId, status: newStatus });
      toast.success(`Order marked as ${newStatus}`);
    } catch {
      toast.error('Failed to update order status');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Orders</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {data
              ? `${data.total} order${data.total !== 1 ? 's' : ''} total`
              : 'Manage customer orders'}
          </p>
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTER_TABS.map((s) => {
          const active = (search.status ?? '') === s;
          return (
            <button
              key={s || 'all'}
              onClick={() => void navigate({ search: { status: s || undefined, page: 1 } })}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all border ${
                active
                  ? 'bg-[#00A651]/15 text-[#00A651] border-[#00A651]/30'
                  : 'text-slate-400 border-slate-700 hover:border-slate-600 hover:text-slate-300'
              }`}
            >
              {s ? STATUS_CONFIG[s]?.label : 'All'}
            </button>
          );
        })}
      </div>

      {/* Table */}
      <Card className="bg-slate-900 border-slate-800 overflow-hidden">
        {/* Table header */}
        <div className="px-6 py-3.5 border-b border-slate-800 bg-slate-800/50 grid grid-cols-12 gap-4">
          <span className="col-span-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Order
          </span>
          <span className="col-span-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Date
          </span>
          <span className="col-span-2 text-xs font-semibold uppercase tracking-wider text-slate-400 text-right">
            Total
          </span>
          <span className="col-span-2 text-xs font-semibold uppercase tracking-wider text-slate-400 text-center">
            Status
          </span>
          <span className="col-span-2 text-xs font-semibold uppercase tracking-wider text-slate-400 text-right">
            Actions
          </span>
        </div>

        <CardContent className="p-0">
          {isError ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <AlertCircle className="h-10 w-10 text-red-400" />
              <p className="text-sm text-slate-400">Failed to load orders</p>
            </div>
          ) : isLoading ? (
            <div className="divide-y divide-slate-800">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="px-6 py-4 grid grid-cols-12 gap-4 items-center">
                  <Skeleton className="col-span-3 h-5 bg-slate-800" />
                  <Skeleton className="col-span-3 h-5 bg-slate-800" />
                  <Skeleton className="col-span-2 h-5 bg-slate-800 ml-auto" />
                  <Skeleton className="col-span-2 h-5 bg-slate-800 mx-auto w-20" />
                  <Skeleton className="col-span-2 h-8 bg-slate-800 ml-auto w-24" />
                </div>
              ))}
            </div>
          ) : !data?.items?.length ? (
            <div className="py-16 text-center">
              <ClipboardList className="h-10 w-10 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">No orders found</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {data.items.map((order) => {
                const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG['pending'];
                const StatusIcon = cfg.icon;
                const nextStatuses = NEXT_STATUSES[order.status] ?? [];

                return (
                  <div
                    key={order.id}
                    className="px-6 py-4 grid grid-cols-12 gap-4 items-center hover:bg-slate-800/40 transition-colors"
                  >
                    {/* Order ID */}
                    <div className="col-span-3 flex items-center gap-3 min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-800">
                        <Package className="h-4 w-4 text-slate-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-mono font-semibold text-slate-100 truncate">
                          #{order.id.slice(0, 8).toUpperCase()}
                        </p>
                        <p className="text-xs text-slate-500">
                          {order.items?.length ?? 0} item
                          {(order.items?.length ?? 0) !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>

                    {/* Date */}
                    <div className="col-span-3">
                      <p className="text-sm text-slate-300">
                        {new Date(order.createdAt).toLocaleDateString('en-US', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(order.createdAt).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>

                    {/* Total */}
                    <div className="col-span-2 text-right">
                      <span className="text-sm font-bold text-slate-100 tabular-nums">
                        LKR {order.totalAmount.toFixed(2)}
                      </span>
                    </div>

                    {/* Status badge */}
                    <div className="col-span-2 flex justify-center">
                      <Badge
                        className={`flex items-center gap-1.5 text-xs font-semibold capitalize border ${cfg.color}`}
                      >
                        <StatusIcon className="h-3 w-3" />
                        {order.status}
                      </Badge>
                    </div>

                    {/* Actions */}
                    <div className="col-span-2 flex justify-end">
                      {nextStatuses.length > 0 ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={isUpdating}
                              className="border-slate-700 text-slate-300 hover:bg-slate-800 bg-transparent h-8 text-xs"
                            >
                              {isUpdating ? (
                                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                              ) : null}
                              Update
                              <ChevronDown className="h-3 w-3 ml-1" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="bg-slate-900 border-slate-700 text-slate-200"
                          >
                            {nextStatuses.map((s) => {
                              const sCfg = STATUS_CONFIG[s];
                              const SIcon = sCfg?.icon ?? Clock;
                              return (
                                <DropdownMenuItem
                                  key={s}
                                  onClick={() => handleStatusChange(order.id, s)}
                                  className="hover:bg-slate-800 cursor-pointer capitalize"
                                >
                                  <SIcon className="h-4 w-4 mr-2" />
                                  Mark as {s}
                                </DropdownMenuItem>
                              );
                            })}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        <span className="text-xs text-slate-600">—</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {data && data.total > 20 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-400">
            Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, data.total)} of {data.total}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-slate-700 text-slate-300 hover:bg-slate-800 bg-transparent"
              disabled={page <= 1}
              onClick={() => void navigate({ search: (prev) => ({ ...prev, page: page - 1 }) })}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-slate-700 text-slate-300 hover:bg-slate-800 bg-transparent"
              disabled={page * 20 >= data.total}
              onClick={() => void navigate({ search: (prev) => ({ ...prev, page: page + 1 }) })}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
