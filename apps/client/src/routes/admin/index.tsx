import type React from 'react';
import { useOrdersQuery } from '@/queries/order.queries';
import { useProductsQuery } from '@/queries/product.queries';
import { createFileRoute } from '@tanstack/react-router';
import {
  ArrowUpRight,
  Box,
  ClipboardList,
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Users,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export const Route = createFileRoute('/admin/')({
  component: AdminDashboard,
});

// ---------------------------------------------------------------------------
// Stat card
// ---------------------------------------------------------------------------
interface StatCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: React.ElementType;
  trend?: { value: string; positive?: boolean };
  loading?: boolean;
  color?: string;
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  loading,
  color = '#00A651',
}: StatCardProps) {
  return (
    <Card className="bg-slate-900 border-slate-800 hover:border-slate-700 transition-colors">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-400 truncate">{title}</p>
            {loading ? (
              <Skeleton className="h-8 w-24 bg-slate-800" />
            ) : (
              <p className="text-3xl font-bold text-slate-100">{value}</p>
            )}
            <p className="text-xs text-slate-500">{description}</p>
          </div>
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ml-4"
            style={{ backgroundColor: `${color}20` }}
          >
            <Icon className="h-6 w-6" style={{ color }} />
          </div>
        </div>
        {trend && (
          <div className="mt-4 flex items-center gap-1.5">
            <TrendingUp
              className={`h-3.5 w-3.5 ${trend.positive !== false ? 'text-emerald-400' : 'text-red-400'}`}
            />
            <span
              className={`text-xs font-semibold ${trend.positive !== false ? 'text-emerald-400' : 'text-red-400'}`}
            >
              {trend.value}
            </span>
            <span className="text-xs text-slate-500">vs last month</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Status styles for recent orders
// ---------------------------------------------------------------------------
const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  processing: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  shipped: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  delivered: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  cancelled: 'bg-red-500/15 text-red-400 border-red-500/30',
};

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
function AdminDashboard() {
  const { data: orders, isLoading: ordersLoading } = useOrdersQuery({ page: 1, limit: 5 });
  const { data: products, isLoading: productsLoading } = useProductsQuery({ page: 1, limit: 1 });
  const totalRevenue = orders?.items?.reduce((sum, o) => sum + (o.totalAmount ?? 0), 0).toFixed(2);

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Dashboard</h1>
        <p className="text-sm text-slate-400 mt-1">
          Welcome back. Here&apos;s an overview of your store.
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Total Revenue"
          value={ordersLoading ? '…' : `LKR ${totalRevenue ?? '0.00'}`}
          description="From all orders"
          icon={DollarSign}
          trend={{ value: '+12.5%', positive: true }}
          loading={ordersLoading}
          color="#00A651"
        />
        <StatCard
          title="Total Orders"
          value={ordersLoading ? '…' : (orders?.total ?? 0)}
          description="All time"
          icon={ShoppingCart}
          trend={{ value: '+8.2%', positive: true }}
          loading={ordersLoading}
          color="#3b82f6"
        />
        <StatCard
          title="Products"
          value={productsLoading ? '…' : (products?.total ?? 0)}
          description="Active listings"
          icon={Box}
          loading={productsLoading}
          color="#8b5cf6"
        />
        <StatCard
          title="Customers"
          value="—"
          description="Registered users"
          icon={Users}
          color="#f59e0b"
        />
      </div>

      {/* Recent orders */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="border-b border-slate-800 pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold text-slate-100">Recent Orders</CardTitle>
            <a
              href="/admin/orders"
              className="flex items-center gap-1 text-xs text-[#00A651] hover:text-[#00c860] font-medium transition-colors"
            >
              View all <ArrowUpRight className="h-3 w-3" />
            </a>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {ordersLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full bg-slate-800" />
              ))}
            </div>
          ) : !orders?.items?.length ? (
            <div className="py-12 text-center">
              <ClipboardList className="h-10 w-10 text-slate-700 mx-auto mb-3" />
              <p className="text-sm text-slate-500">No orders yet</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {orders.items.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between px-6 py-4 hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-slate-400">
                      <ShoppingCart className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-100 truncate">
                        #{order.id.slice(0, 8).toUpperCase()}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(order.createdAt).toLocaleDateString('en-US', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <Badge
                      className={`text-xs font-semibold capitalize border ${STATUS_STYLES[order.status] ?? 'bg-slate-800 text-slate-400'}`}
                    >
                      {order.status}
                    </Badge>
                    <span className="text-sm font-bold text-slate-200 tabular-nums w-28 text-right">
                      LKR {order.totalAmount.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
