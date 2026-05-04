import { useEffect, useMemo, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertCircle,
  AlertTriangle,
  BarChart3,
  BrainCircuit,
  Loader2,
  RefreshCw,
  Sparkles,
  Eye,
  Bell,
  Settings,
} from 'lucide-react';

import {
  useBiAlertsQuery,
  useBiDashboardMutations,
  useBiDashboardQuery,
  useBiForecastExplanationQuery,
  useBiForecastQuery,
  useBiProductsQuery,
  useBiRestockExplanationQuery,
} from '@/hooks/bi-dashboard';
import { PageContainer } from '@/components/partials/container/page-container';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { XAIExplanationDialog } from '@/components/admin/xai-explanation-dialog';
import { cn } from '@/lib/utils';
import type { BiAlert, DashboardPeriod, TrendDirection } from '@/types/bi-dashboard';

export const Route = createFileRoute('/_authenticated/_admin/admin/bi-dashboard')({
  component: RouteComponent,
});

const PERIODS: Array<{ value: DashboardPeriod; label: string }> = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
];

const currencyFormatter = new Intl.NumberFormat('en-LK', {
  style: 'currency',
  currency: 'LKR',
  maximumFractionDigits: 0,
});

const compactNumberFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 1,
});

function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

function formatNumber(value: number) {
  return compactNumberFormatter.format(value);
}

function formatDate(value?: string | null) {
  if (!value) {
    return 'N/A';
  }

  return new Intl.DateTimeFormat('en-LK', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat('en-CA', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));
}

function TrendBadge({ trend }: { trend: TrendDirection }) {
  const variant = trend === 'up' ? 'default' : trend === 'down' ? 'destructive' : 'secondary';

  return (
    <Badge variant={variant} className="capitalize">
      {trend}
    </Badge>
  );
}

function normalizeAlertUrgency(urgency?: string) {
  return (urgency ?? 'LOW').toLowerCase();
}

export function RouteComponent() {
  const [period, setPeriod] = useState<DashboardPeriod>('month');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedAlertId, setSelectedAlertId] = useState('');
  const [showForecastExplanation, setShowForecastExplanation] = useState(false);
  const [showRestockExplanation, setShowRestockExplanation] = useState(false);

  const dashboardQuery = useBiDashboardQuery(period);
  const alertsQuery = useBiAlertsQuery({ status: 'PENDING' });
  const productsQuery = useBiProductsQuery({ page: 1, limit: 12 });
  const { generateAlerts, acceptAlert, autoDismissAlerts } = useBiDashboardMutations();

  const analytics = dashboardQuery.data?.data;
  const alerts = alertsQuery.data?.data.alerts ?? [];
  const topProducts = analytics?.topProducts ?? [];
  const products = productsQuery.data?.data?.products ?? [];

  useEffect(() => {
    if (!selectedProductId) {
      const fallbackProduct = topProducts[0]?.id || products[0]?.id || '';
      setSelectedProductId(fallbackProduct);
    }
  }, [products, selectedProductId, topProducts]);

  useEffect(() => {
    if (!selectedAlertId) {
      setSelectedAlertId(alerts[0]?.id || '');
    }
  }, [alerts, selectedAlertId]);

  const selectedProduct: BiProduct | undefined =
    products.find((product) => product.id === selectedProductId) ?? products[0];

  const selectedForecastProductId =
    selectedProduct?.sku || topProducts.find((product) => product.id === selectedProductId)?.sku || selectedProductId;
  const forecastQuery = useBiForecastQuery({ productId: selectedForecastProductId, horizon: 30, lang: 'en' });
  const forecastExplanationQuery = useBiForecastExplanationQuery({
    productId: selectedForecastProductId,
    lang: 'en',
  });
  const restockExplanationQuery = useBiRestockExplanationQuery({
    alertId: selectedAlertId,
    lang: 'en',
  });

  const salesTrend = analytics?.salesTrend ?? [];
  const forecastSeries = forecastQuery.data?.data.forecasts ?? [];
  const forecastDrivers = forecastQuery.data?.data.drivers ?? [];
  const forecastExplanation = forecastExplanationQuery.data?.data.explanation;
  const restockExplanation = restockExplanationQuery.data?.data;

  const selectedAlert: BiAlert | undefined =
    alerts.find((alert) => alert.id === selectedAlertId) ?? alerts[0];

  const kpis = analytics?.kpis;

  const metricCards = useMemo(
    () => [
      {
        label: 'Revenue',
        value: kpis ? formatCurrency(kpis.totalRevenue.value) : '—',
        delta: kpis
          ? `${kpis.totalRevenue.change >= 0 ? '+' : ''}${kpis.totalRevenue.change}%`
          : '',
        trend: kpis?.totalRevenue.trend,
      },
      {
        label: 'Orders',
        value: kpis ? formatNumber(kpis.totalOrders.value) : '—',
        delta: kpis ? `${kpis.totalOrders.change >= 0 ? '+' : ''}${kpis.totalOrders.change}%` : '',
        trend: kpis?.totalOrders.trend,
      },
      {
        label: 'Active Alerts',
        value: kpis ? formatNumber(kpis.activeAlerts.value) : '—',
        delta: kpis
          ? `${kpis.activeAlerts.change >= 0 ? '+' : ''}${kpis.activeAlerts.change}%`
          : '',
        trend: kpis?.activeAlerts.trend,
      },
      {
        label: 'Low Stock Items',
        value: kpis?.lowStockProducts ? formatNumber(kpis.lowStockProducts.value) : '—',
        delta: kpis?.lowStockProducts
          ? `${kpis.lowStockProducts.change >= 0 ? '+' : ''}${kpis.lowStockProducts.change}%`
          : '',
        trend: kpis?.lowStockProducts?.trend,
      },
    ],
    [kpis],
  );

  return (
    <PageContainer className="flex h-full min-h-0 flex-col" noMaxHeight>
      <div className="flex h-full min-h-0 flex-col gap-6 overflow-auto pb-4">
        {/* Hero Section */}
        <section className="overflow-hidden rounded-3xl bg-[linear-gradient(135deg,#08121f_0%,#0f4c5c_45%,#0f8b8d_100%)] px-6 py-8 text-white shadow-2xl md:px-10 md:py-10">
          <div className="space-y-4">
            <Badge className="bg-white/15 text-white">BI dashboard + ML service</Badge>
            <h1 className="max-w-3xl text-4xl font-black tracking-tight md:text-5xl">
              Operational metrics, forecasts, alerts, and explainability.
            </h1>
            <p className="max-w-2xl text-white/80 md:text-lg">
              Live analytics, ML-powered insights, and actionable recommendations in one unified interface.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button
                className="bg-white text-slate-950 hover:bg-white/90"
                onClick={() => generateAlerts.mutate()}
                disabled={generateAlerts.isPending}
              >
                {generateAlerts.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                Generate alerts
              </Button>
              <Button
                variant="outline"
                className="border-white/25 bg-transparent text-white hover:bg-white/10"
                onClick={() => autoDismissAlerts.mutate()}
                disabled={autoDismissAlerts.isPending}
              >
                {autoDismissAlerts.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Auto-dismiss resolved
              </Button>
            </div>
          </div>
        </section>

        {dashboardQuery.error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>BI dashboard unavailable</AlertTitle>
            <AlertDescription>{(dashboardQuery.error as Error).message}</AlertDescription>
          </Alert>
        )}

        {/* KPI Cards */}
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {metricCards.map(({ label, value, delta, trend }) => (
            <Card key={label} className="border-border/60 shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
                  {trend && <TrendBadge trend={trend} />}
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-3xl font-black tracking-tight">{value}</div>
                <div className="text-sm text-muted-foreground">{delta || 'No movement yet'}</div>
              </CardContent>
            </Card>
          ))}
        </section>

        {/* Tabbed Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col gap-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="alerts" className="gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Alerts</span>
            </TabsTrigger>
            <TabsTrigger value="control" className="gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Control</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Sales Trend */}
              <Card className="flex min-h-0 flex-col overflow-hidden lg:col-span-1">
                <CardHeader className="border-b border-border/60 bg-muted/20">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <CardTitle>Sales trend</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Revenue and order counts for the selected period.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {PERIODS.map(({ value, label }) => (
                        <Button
                          key={value}
                          size="sm"
                          variant={period === value ? 'default' : 'outline'}
                          onClick={() => setPeriod(value)}
                        >
                          {label}
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="min-h-0 flex-1 p-4">
                  <div className="h-[320px] rounded-2xl border bg-background p-3">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={salesTrend}>
                        <defs>
                          <linearGradient id="biRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#0f8b8d" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#0f8b8d" stopOpacity={0.05} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                        <XAxis dataKey="date" tickFormatter={formatShortDate} />
                        <YAxis />
                        <Tooltip
                          formatter={(value: number, name: string) => [
                            name === 'revenue' ? formatCurrency(value) : formatNumber(value),
                            name === 'revenue' ? 'Revenue' : 'Orders',
                          ]}
                          labelFormatter={(label) => formatShortDate(String(label))}
                        />
                        <Area
                          type="monotone"
                          dataKey="revenue"
                          stroke="#0f8b8d"
                          fillOpacity={1}
                          fill="url(#biRevenue)"
                          strokeWidth={2}
                        />
                        <Area
                          type="monotone"
                          dataKey="orders"
                          stroke="#f59e0b"
                          fillOpacity={0.08}
                          fill="#f59e0b"
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Top Products */}
              <Card className="flex min-h-0 flex-col overflow-hidden lg:col-span-1">
                <CardHeader className="border-b border-border/60 bg-muted/20">
                  <CardTitle>Top products</CardTitle>
                </CardHeader>
                <CardContent className="min-h-0 flex-1 p-4">
                  {topProducts.length === 0 ? (
                    <div className="flex min-h-48 items-center justify-center rounded-2xl border border-dashed text-sm text-muted-foreground">
                      No top product data yet.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {topProducts.map((product) => (
                        <button
                          key={product.id}
                          onClick={() => setSelectedProductId(product.id)}
                          className={cn(
                            'w-full rounded-2xl border p-4 text-left transition hover:border-primary/50 hover:bg-muted/30',
                            selectedProductId === product.id && 'border-primary bg-primary/5',
                          )}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <div className="font-semibold">{product.name}</div>
                              <div className="text-sm text-muted-foreground">{formatCurrency(product.revenue)}</div>
                            </div>
                            <Badge variant="secondary">{formatNumber(product.quantity)} units</Badge>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Top Products Bar Chart */}
            <Card className="flex min-h-0 flex-col overflow-hidden">
              <CardHeader className="border-b border-border/60 bg-muted/20">
                <CardTitle>Revenue distribution</CardTitle>
              </CardHeader>
              <CardContent className="min-h-0 flex-1 p-4">
                <div className="h-[320px] rounded-2xl border bg-background p-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topProducts}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Bar dataKey="revenue" fill="#0f8b8d" radius={[12, 12, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Forecasts tab removed - use the dedicated forecasting page */}

          {/* Alerts Tab */}
          <TabsContent value="alerts" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Pending Alerts List */}
              <Card className="flex min-h-0 flex-col overflow-hidden">
                <CardHeader className="border-b border-border/60 bg-muted/20">
                  <CardTitle>Pending alerts ({alerts.length})</CardTitle>
                </CardHeader>
                <CardContent className="flex min-h-0 flex-1 flex-col gap-4 p-4">
                  {alerts.length === 0 ? (
                    <div className="flex min-h-48 items-center justify-center rounded-2xl border border-dashed text-sm text-muted-foreground">
                      No pending alerts.
                    </div>
                  ) : (
                    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto pr-1">
                      {alerts.map((alert) => (
                        <button
                          key={alert.id}
                          onClick={() => setSelectedAlertId(alert.id)}
                          className={cn(
                            'rounded-2xl border p-4 text-left transition hover:border-primary/50 hover:bg-muted/30',
                            selectedAlertId === alert.id && 'border-primary bg-primary/5',
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="font-semibold">{alert.productName || alert.productId || alert.id}</div>
                              <div className="text-sm text-muted-foreground">{alert.reason || 'No reason provided.'}</div>
                            </div>
                            <Badge
                              variant={
                                normalizeAlertUrgency(alert.urgency) === 'high'
                                  ? 'destructive'
                                  : normalizeAlertUrgency(alert.urgency) === 'medium'
                                    ? 'secondary'
                                    : 'outline'
                              }
                              className="capitalize"
                            >
                              {normalizeAlertUrgency(alert.urgency)}
                            </Badge>
                          </div>
                          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span>Stock: {alert.currentStock ?? 'N/A'}</span>
                            <span>Recommended: {alert.recommendedQuantity ?? 'N/A'}</span>
                            <span>
                              Confidence:{' '}
                              {typeof alert.confidence === 'number'
                                ? `${Math.round(alert.confidence * 100)}%`
                                : 'N/A'}
                            </span>
                          </div>
                          <div className="mt-4 flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              onClick={(event) => {
                                event.stopPropagation();
                                acceptAlert.mutate({
                                  alertId: alert.id,
                                  payload: {
                                    action: 'create_po',
                                    quantity: alert.recommendedQuantity ?? undefined,
                                    notes: 'Approved from BI dashboard',
                                  },
                                });
                              }}
                              disabled={acceptAlert.isPending}
                            >
                              Approve
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-2"
                              onClick={(event) => {
                                event.stopPropagation();
                                setSelectedAlertId(alert.id);
                                setShowRestockExplanation(true);
                              }}
                            >
                              <BrainCircuit className="h-3.5 w-3.5" />
                              Explain
                            </Button>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Alert Explanation */}
              <Card className="flex min-h-0 flex-col overflow-hidden">
                <CardHeader className="border-b border-border/60 bg-muted/20">
                  <CardTitle>Alert analysis</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 p-4">
                  {selectedAlert ? (
                    <>
                      <div className="rounded-2xl border p-4">
                        <div className="text-sm text-muted-foreground">Product</div>
                        <div className="mt-1 text-lg font-semibold">
                          {selectedAlert.productName || selectedAlert.productId || selectedAlert.id}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Badge variant="secondary" className="capitalize">
                            {selectedAlert.type}
                          </Badge>
                          <Badge variant="outline" className="capitalize">
                            {selectedAlert.status}
                          </Badge>
                        </div>
                      </div>

                      {restockExplanation ? (
                        <>
                          <div className="rounded-2xl border p-4">
                            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                              Summary
                            </div>
                            <p className="mt-3 text-sm leading-6">
                              {restockExplanation.explanation.en || 'No explanation available.'}
                            </p>
                          </div>

                          <div className="grid gap-3 md:grid-cols-3">
                            <div className="rounded-2xl border p-4">
                              <div className="text-sm text-muted-foreground">Predicted demand</div>
                              <div className="mt-1 text-2xl font-bold">
                                {formatNumber(restockExplanation.metrics.predictedDailyDemand)}
                              </div>
                            </div>
                            <div className="rounded-2xl border p-4">
                              <div className="text-sm text-muted-foreground">Days to stockout</div>
                              <div className="mt-1 text-2xl font-bold">
                                {restockExplanation.metrics.daysUntilStockout}
                              </div>
                            </div>
                            <div className="rounded-2xl border p-4">
                              <div className="text-sm text-muted-foreground">Recommended qty</div>
                              <div className="mt-1 text-2xl font-bold">
                                {restockExplanation.metrics.recommendedQuantity}
                              </div>
                            </div>
                          </div>

                          <div className="space-y-3">
                            {restockExplanation.features.slice(0, 4).map((feature) => (
                              <div key={feature.name} className="rounded-2xl border p-4">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="font-semibold">{feature.name}</div>
                                  <Badge variant="secondary">{feature.direction || 'signal'}</Badge>
                                </div>
                                <p className="mt-2 text-sm text-muted-foreground">{feature.description}</p>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
                          No restock explanation returned yet for the selected alert.
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
                      Select an alert from the pending list to inspect its ML explanation.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Control Room Tab */}
          <TabsContent value="control" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Dashboard Overview */}
              <Card>
                <CardHeader className="border-b border-border/60 bg-muted/20">
                  <CardTitle>Dashboard overview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 p-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl border p-4">
                      <div className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                        Analytics
                      </div>
                      <div className="mt-2 text-2xl font-bold">{salesTrend.length}</div>
                      <div className="text-sm text-muted-foreground">time slices in {period} view</div>
                    </div>

                    <div className="rounded-2xl border p-4">
                      <div className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                        Forecast
                      </div>
                      <div className="mt-2 text-2xl font-bold">{forecastSeries.length || 0}</div>
                      <div className="text-sm text-muted-foreground">prediction points loaded</div>
                    </div>

                    <div className="rounded-2xl border p-4">
                      <div className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                        Alerts
                      </div>
                      <div className="mt-2 text-2xl font-bold">{alerts.length}</div>
                      <div className="text-sm text-muted-foreground">pending recommendations</div>
                    </div>

                    <div className="rounded-2xl border p-4">
                      <div className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                        Products
                      </div>
                      <div className="mt-2 text-2xl font-bold">{topProducts.length}</div>
                      <div className="text-sm text-muted-foreground">top performing items</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Selection Status */}
              <Card>
                <CardHeader className="border-b border-border/60 bg-muted/20">
                  <CardTitle>Selection status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 p-4">
                  <div className="rounded-2xl border p-4">
                    <div className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Product Focus
                    </div>
                    <div className="mt-2 text-lg font-semibold">
                      {topProducts.find((product) => product.id === selectedProductId)?.name ||
                        'No product selected'}
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {forecastExplanation
                        ? '✓ Forecast explanation loaded'
                        : '◌ Waiting for forecast explanation'}
                    </div>
                  </div>

                  <div className="rounded-2xl border p-4">
                    <div className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Alert Focus
                    </div>
                    <div className="mt-2 text-lg font-semibold">
                      {selectedAlert?.productName || selectedAlert?.productId || 'No alert selected'}
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {restockExplanation
                        ? `✓ ${restockExplanation.features.length} feature signals ready`
                        : '◌ Pick an alert to load signals'}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Forecast Explanation Dialog */}
        <XAIExplanationDialog
          open={showForecastExplanation}
          onOpenChange={setShowForecastExplanation}
          title="Sales Forecast Explanation"
          description="Understanding how the AI model predicts sales using explainable AI"
          isLoading={forecastExplanationQuery.isLoading}
          error={forecastExplanationQuery.error as Error | null}
          explanation={forecastExplanation}
        />

        {/* Restock Explanation Dialog */}
        <XAIExplanationDialog
          open={showRestockExplanation}
          onOpenChange={setShowRestockExplanation}
          title="Restock Alert Explanation"
          description="Understanding why the AI recommends this restock action"
          isLoading={restockExplanationQuery.isLoading}
          error={restockExplanationQuery.error as Error | null}
          explanation={restockExplanation ? {
            summary: restockExplanation.explanation?.en,
            features: restockExplanation.features?.map((f) => ({
              name: f.name,
              nameSi: f.nameSi,
              description: f.description,
              descriptionSi: f.descriptionSi,
              direction: (f.direction === 'increase' || f.direction === 'decrease') ? f.direction : undefined,
              value: f.value,
              contribution: typeof f.contribution === 'number' ? f.contribution : undefined,
              contributionLabel: f.contributionLabel,
              impact: typeof f.impact === 'number' ? f.impact : undefined,
              importance: typeof f.importance === 'number' ? f.importance : undefined,
            })),
            metrics: restockExplanation.metrics,
          } : null}
        />
      </div>
    </PageContainer>
  );
}
