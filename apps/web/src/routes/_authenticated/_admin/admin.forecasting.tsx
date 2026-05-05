import { useState, useMemo } from 'react';
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
    Legend,
} from 'recharts';
import {
    AlertCircle,
    TrendingUp,
    Download,
    Loader2,
    HelpCircle,
    RefreshCw,
} from 'lucide-react';

import {
    useBiForecastExplanationQuery,
    useBiProductsQuery,
    useBiForecastQuery,
    useBiDashboardMutations,
} from '@/hooks/bi-dashboard';
import { PageContainer } from '@/components/partials/container/page-container';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { exportToCSV, exportToJSON } from '@/lib/export-utils';
import type { BiForecastResponse } from '@/types/bi-dashboard';

export const Route = createFileRoute('/_authenticated/_admin/admin/forecasting')({
    component: RouteComponent,
});

const formatCurrency = new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    maximumFractionDigits: 0,
}).format;

const formatNumber = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 1,
}).format;

function formatShortDate(value: string) {
    return new Intl.DateTimeFormat('en-CA', {
        month: 'short',
        day: 'numeric',
    }).format(new Date(value));
}

function formatDate(value?: string | null) {
    if (!value) return 'N/A';

    return new Intl.DateTimeFormat('en-LK', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    }).format(new Date(value));
}

export function RouteComponent() {
    const [selectedProductId, setSelectedProductId] = useState('');
    const [showExplanationModal, setShowExplanationModal] = useState(false);
    const [horizon, setHorizon] = useState(30);

    const productsQuery = useBiProductsQuery({ page: 1, limit: 50 });

    const products = productsQuery.data?.data?.products ?? [];

    const selectedProduct = useMemo(
        () => products.find((p) => p.id === selectedProductId),
        [products, selectedProductId],
    );
    const selectedForecastProductId = selectedProduct?.sku || selectedProductId;

    const forecastQuery = useBiForecastQuery({
        productId: selectedForecastProductId,
        horizon,
        lang: 'en',
    });
    const explanationQuery = useBiForecastExplanationQuery({
        productId: selectedForecastProductId,
        lang: 'en',
    });

    const forecast = (forecastQuery.data?.data as BiForecastResponse) ?? null;
    const explanation = explanationQuery.data?.data?.explanation;

    const forecastMetrics = useMemo(() => {
        if (!forecast) return null;

        const forecastData = forecast.forecasts || [];
        if (forecastData.length === 0) return null;

        const avgPredicted = forecastData.reduce((sum, d) => sum + (d.predictedSales || 0), 0) / forecastData.length;
        const maxPredicted = Math.max(...forecastData.map((d) => d.predictedSales || 0));
        const minPredicted = Math.min(...forecastData.map((d) => d.predictedSales || 0));

        return {
            avgPredicted,
            maxPredicted,
            minPredicted,
            dataPoints: forecastData.length,
        };
    }, [forecast]);

    const confidenceColor = forecast?.confidence ? (forecast.confidence > 0.8 ? 'text-green-600' : forecast.confidence > 0.6 ? 'text-yellow-600' : 'text-red-600') : 'text-gray-600';

    const handleExportForecast = () => {
        if (!forecast || !forecast.forecasts || forecast.forecasts.length === 0) {
            alert('No forecast data available to export');
            return;
        }

        const exportData = forecast.forecasts.map((item: any) => ({
            date: item.date,
            predictedSales: item.predictedSales,
            lowerBound: item.lowerBound,
            upperBound: item.upperBound,
        }));

        const timestamp = new Date().toISOString().split('T')[0];
        const productName = selectedProduct?.name || 'forecast';
        exportToCSV(exportData, `forecast-${productName}-${timestamp}`);
    };

    const handleExportExplanation = () => {
        if (!explanation) {
            alert('No explanation data available to export');
            return;
        }

        const timestamp = new Date().toISOString().split('T')[0];
        const productName = selectedProduct?.name || 'forecast';
        const exportData = {
            product: productName,
            productId: selectedProductId,
            timestamp,
            horizon,
            modelType: forecast?.modelType,
            confidence: forecast?.confidence,
            explanation: explanation,
        };

        exportToJSON(exportData, `forecast-explanation-${productName}-${timestamp}`);
    };

    return (
        <PageContainer className="flex h-full min-h-0 flex-col" noMaxHeight>
            <div className="flex h-full min-h-0 flex-col gap-6 overflow-auto pb-4">
                {/* Hero Section */}
                <section className="overflow-hidden rounded-3xl bg-[linear-gradient(135deg,#08121f_0%,#0f4c5c_45%,#0f8b8d_100%)] px-6 py-8 text-white shadow-2xl md:px-10 md:py-10">
                    <div className="space-y-4">
                        <Badge className="bg-white/15 text-white">Sales Forecasting</Badge>
                        <h1 className="max-w-3xl text-4xl font-black tracking-tight md:text-5xl">
                            Predict future sales with AI-powered forecasts
                        </h1>
                        <p className="max-w-2xl text-white/80 md:text-lg">
                            Analyze historical data patterns and receive confidence-based predictions to optimize inventory and plan ahead.
                        </p>
                    </div>
                </section>

                {forecastQuery.error && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Forecast unavailable</AlertTitle>
                        <AlertDescription>{(forecastQuery.error as Error).message}</AlertDescription>
                    </Alert>
                )}

                {/* Product & Settings Section */}
                <Card>
                    <CardHeader className="border-b border-border/60 bg-muted/20">
                        <CardTitle>Forecast settings</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 p-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <label className="mb-2 block text-sm font-medium">Select Product</label>
                                {productsQuery.isLoading ? (
                                    <div className="text-sm text-muted-foreground">Loading products...</div>
                                ) : products.length === 0 ? (
                                    <div className="text-sm text-muted-foreground">No products available</div>
                                ) : (
                                    <select
                                        className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none ring-offset-background transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                        value={selectedProductId}
                                        onChange={(event) => setSelectedProductId(event.target.value)}
                                    >
                                        <option value="" disabled>
                                            Choose a product
                                        </option>
                                        {products.map((product) => (
                                            <option key={product.id} value={product.id}>
                                                {product.name} {product.sku ? `(${product.sku})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium">Forecast Horizon (Days)</label>
                                <div className="flex gap-2">
                                    {[7, 14, 30, 60, 90].map((h) => (
                                        <Button
                                            key={h}
                                            size="sm"
                                            variant={horizon === h ? 'default' : 'outline'}
                                            onClick={() => setHorizon(h)}
                                        >
                                            {h}d
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {selectedProductId && (
                            <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/40 p-3">
                                <div className="text-sm">
                                    <span className="font-semibold">{selectedProduct?.name}</span>
                                    <span className="ml-2 text-muted-foreground">({selectedProduct?.id})</span>
                                </div>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => forecastQuery.refetch()}
                                    disabled={forecastQuery.isLoading}
                                >
                                    {forecastQuery.isLoading ? (
                                        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                        <RefreshCw className="mr-2 h-3.5 w-3.5" />
                                    )}
                                    Refresh
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {!selectedProductId ? (
                    <Card>
                        <CardContent className="flex min-h-48 items-center justify-center rounded-lg border border-dashed p-6 text-center">
                            <div className="space-y-2">
                                <TrendingUp className="mx-auto h-8 w-8 text-muted-foreground" />
                                <p className="text-sm text-muted-foreground">Select a product above to generate forecasts</p>
                            </div>
                        </CardContent>
                    </Card>
                ) : forecastQuery.isLoading ? (
                    <Card>
                        <CardContent className="flex min-h-48 items-center justify-center">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Loader2 className="h-5 w-5 animate-spin" />
                                <span>Loading forecast data...</span>
                            </div>
                        </CardContent>
                    </Card>
                ) : forecast ? (
                    <>
                        {/* Forecast Metrics */}
                        <section className="grid gap-4 md:grid-cols-4">
                            <Card className="border-border/60 shadow-sm">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">Model Type</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{forecast.modelType}</div>
                                    <p className="mt-1 text-xs text-muted-foreground">ML Algorithm</p>
                                </CardContent>
                            </Card>

                            <Card className="border-border/60 shadow-sm">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">Confidence</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className={cn('text-2xl font-bold', confidenceColor)}>
                                        {(forecast.confidence * 100).toFixed(1)}%
                                    </div>
                                    <p className="mt-1 text-xs text-muted-foreground">Prediction Confidence</p>
                                </CardContent>
                            </Card>

                            <Card className="border-border/60 shadow-sm">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">Generated</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-base font-bold">{formatDate(forecast.generatedAt)}</div>
                                    <p className="mt-1 text-xs text-muted-foreground">Timestamp</p>
                                </CardContent>
                            </Card>

                            <Card className="border-border/60 shadow-sm">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">Data Points</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{forecastMetrics?.dataPoints || 0}</div>
                                    <p className="mt-1 text-xs text-muted-foreground">Forecast Days</p>
                                </CardContent>
                            </Card>
                        </section>

                        {/* Forecast Chart */}
                        <Card className="flex min-h-0 flex-col overflow-hidden">
                            <CardHeader className="border-b border-border/60 bg-muted/20">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle>Sales Forecast</CardTitle>
                                        <p className="text-sm text-muted-foreground">
                                            Predicted sales over the next {horizon} days
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button size="sm" variant="outline" onClick={handleExportForecast} disabled={!forecast}>
                                            <Download className="mr-2 h-3.5 w-3.5" />
                                            Export
                                        </Button>
                                        <Button
                                            size="sm"
                                            onClick={() => setShowExplanationModal(true)}
                                        >
                                            <HelpCircle className="mr-2 h-3.5 w-3.5" />
                                            Explain
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="min-h-0 flex-1 p-4">
                                <div className="h-[350px] rounded-2xl border bg-background p-3">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={forecast.forecasts || []}>
                                            <defs>
                                                <linearGradient id="forecastGradient" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                                                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.05} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                                            <XAxis dataKey="date" tickFormatter={formatShortDate} />
                                            <YAxis />
                                            <Tooltip
                                                formatter={(value: number) => formatNumber(value)}
                                                labelFormatter={(label) => formatShortDate(String(label))}
                                            />
                                            <Legend />
                                            <Area
                                                type="monotone"
                                                dataKey="predictedSales"
                                                stroke="#f59e0b"
                                                fillOpacity={1}
                                                fill="url(#forecastGradient)"
                                                strokeWidth={2}
                                                name="Predicted Sales"
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Forecast Drivers */}
                        {forecast.drivers && forecast.drivers.length > 0 && (
                            <Card className="flex min-h-0 flex-col overflow-hidden">
                                <CardHeader className="border-b border-border/60 bg-muted/20">
                                    <CardTitle>Key Drivers</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3 p-4">
                                    <p className="text-sm text-muted-foreground">
                                        These factors most influence the forecast:
                                    </p>
                                    <div className="grid gap-3 md:grid-cols-2">
                                        {forecast.drivers.map((driver, idx) => (
                                            <div
                                                key={idx}
                                                className="flex items-center justify-between rounded-2xl border p-4"
                                            >
                                                <div>
                                                    <p className="font-semibold">{driver.name}</p>
                                                    <p className="text-sm text-muted-foreground">{driver.description}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-lg font-bold text-primary">
                                                        {(driver.impact * 100).toFixed(0)}%
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">Impact</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Statistics */}
                        {forecastMetrics && (
                            <Card>
                                <CardHeader className="border-b border-border/60 bg-muted/20">
                                    <CardTitle>Forecast Statistics</CardTitle>
                                </CardHeader>
                                <CardContent className="p-4">
                                    <div className="grid gap-3 md:grid-cols-3">
                                        <div className="rounded-2xl border p-4">
                                            <p className="text-sm text-muted-foreground">Average Predicted Sales</p>
                                            <p className="mt-2 text-2xl font-bold">
                                                {formatNumber(forecastMetrics.avgPredicted)}
                                            </p>
                                        </div>
                                        <div className="rounded-2xl border p-4">
                                            <p className="text-sm text-muted-foreground">Peak Prediction</p>
                                            <p className="mt-2 text-2xl font-bold">
                                                {formatNumber(forecastMetrics.maxPredicted)}
                                            </p>
                                        </div>
                                        <div className="rounded-2xl border p-4">
                                            <p className="text-sm text-muted-foreground">Low Prediction</p>
                                            <p className="mt-2 text-2xl font-bold">
                                                {formatNumber(forecastMetrics.minPredicted)}
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </>
                ) : null}

                {/* XAI Explanation Modal */}
                <Dialog open={showExplanationModal} onOpenChange={setShowExplanationModal}>
                    <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader className="pb-2 border-b">
                            <DialogTitle className="flex items-center gap-3 text-xl font-bold">
                                <div className="rounded-lg bg-primary/10 p-2">
                                    <HelpCircle className="h-5 w-5 text-primary" />
                                </div>
                                Forecast Explanation - AI Analysis
                            </DialogTitle>
                            <DialogDescription className="text-sm">
                                Understanding how the AI model makes predictions using explainable AI (XAI)
                            </DialogDescription>
                        </DialogHeader>

                        {explanationQuery.isLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    <span>Loading explanation...</span>
                                </div>
                            </div>
                        ) : explanationQuery.error ? (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Failed to load explanation</AlertTitle>
                                <AlertDescription>
                                    {(explanationQuery.error as Error).message}
                                </AlertDescription>
                            </Alert>
                        ) : explanation ? (
                            <div className="px-6 py-8 space-y-8">
                                {/* Summary */}
                                {explanation.summary && (
                                    <div className="rounded-3xl border border-blue-200/60 bg-gradient-to-br from-blue-50 to-blue-50/50 dark:border-blue-900/40 dark:bg-gradient-to-br dark:from-blue-950/30 dark:to-blue-900/20 p-6">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                                            <h3 className="font-bold text-blue-900 dark:text-blue-100 text-lg">
                                                Analysis Summary
                                            </h3>
                                        </div>
                                        <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">
                                            {explanation.summary}
                                        </p>
                                    </div>
                                )}

                                {/* Key Metrics */}
                                {explanation.features && explanation.features.length > 0 && (
                                    <div>
                                        <h3 className="font-bold mb-4 text-lg">Feature Importance (SHAP Analysis)</h3>
                                        <div className="h-[340px] rounded-2xl border bg-background p-4">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart
                                                    data={explanation.features
                                                        .sort((a, b) => (b.contribution || 0) - (a.contribution || 0))
                                                        .slice(0, 10)}
                                                    layout="vertical"
                                                    margin={{ left: 120 }}
                                                >
                                                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                                                    <XAxis type="number" />
                                                    <YAxis
                                                        type="category"
                                                        dataKey="name"
                                                        width={110}
                                                        tick={{ fontSize: 12 }}
                                                    />
                                                    <Tooltip
                                                        formatter={(value: number) => value.toFixed(3)}
                                                    />
                                                    <Bar
                                                        dataKey="contribution"
                                                        fill="#0f8b8d"
                                                        radius={[0, 8, 8, 0]}
                                                    />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                )}

                                {/* Feature Details */}
                                {explanation.features && explanation.features.length > 0 && (
                                    <div>
                                        <h3 className="font-bold mb-4 text-lg">Detailed Feature Analysis</h3>
                                        <div className="space-y-3 max-h-[480px] overflow-y-auto pr-3 py-2">
                                            {explanation.features
                                                .sort((a, b) => (b.contribution || 0) - (a.contribution || 0))
                                                .map((feature, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="flex items-start gap-4 p-5 bg-gradient-to-r from-muted/30 to-transparent rounded-2xl hover:from-muted/50 hover:to-muted/20 transition-all border border-border/40 hover:border-primary/30"
                                                    >
                                                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center flex-col border border-primary/20">
                                                            <span className="text-xs font-bold text-primary">
                                                                #{idx + 1}
                                                            </span>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-semibold text-sm">{feature.name}</p>
                                                            <p className="text-xs text-muted-foreground mt-1">
                                                                {feature.description}
                                                            </p>
                                                        </div>
                                                        <div className="flex-shrink-0 text-right">
                                                            <p className="font-bold text-sm text-primary">{(feature.contribution || 0).toFixed(3)}</p>
                                                            <p className="text-xs text-muted-foreground">
                                                                Contribution
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))}
                                        </div>
                                    </div>
                                )}

                                {/* Export */}
                                <div className="flex items-center justify-between pt-6 mt-6 border-t">
                                    <p className="text-xs text-muted-foreground">XAI-powered analysis using SHAP methodology</p>
                                    <Button variant="outline" onClick={handleExportExplanation} className="gap-2">
                                        <Download className="h-4 w-4" />
                                        Export Report
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center py-12 text-muted-foreground">
                                <p>No explanation data available</p>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </PageContainer>
    );
}
