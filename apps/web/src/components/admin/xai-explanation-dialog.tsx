import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Download, Loader2, AlertCircle } from 'lucide-react';

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { exportToJSON } from '@/lib/export-utils';

export interface XAIExplanationDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title?: string;
    description?: string;
    isLoading?: boolean;
    error?: Error | null;
    explanation?: {
        summary?: string;
        features?: Array<{
            name: string;
            description?: string;
            contributionLabel?: string;
            contribution?: number;
            impact?: number;
            importance?: number;
            direction?: 'increase' | 'decrease';
            value?: string | number;
            nameSi?: string;
            descriptionSi?: string;
        }>;
        metrics?: {
            [key: string]: string | number;
        };
    } | null;
    onExport?: () => void;
}

export function XAIExplanationDialog({
    open,
    onOpenChange,
    title = 'AI Explanation',
    description = 'Understanding how the AI model makes predictions',
    isLoading = false,
    error = null,
    onExport,
    explanation = null,
}: XAIExplanationDialogProps) {
    const topFeatures = explanation?.features
        ?.sort((a, b) => Math.abs((b.contribution ?? b.impact ?? 0)) - Math.abs((a.contribution ?? a.impact ?? 0)))
        .slice(0, 10) || [];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
                <DialogHeader className="pb-2 border-b">
                    <DialogTitle className="text-xl font-bold">{title}</DialogTitle>
                    <DialogDescription className="text-sm">{description}</DialogDescription>
                </DialogHeader>

                {isLoading ? (
                    <div className="flex items-center justify-center py-12 px-6">
                        <div className="flex items-center gap-3 text-muted-foreground">
                            <Loader2 className="h-6 w-6 animate-spin" />
                            <span>Loading explanation...</span>
                        </div>
                    </div>
                ) : error ? (
                    <div className="p-6">
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Failed to load explanation</AlertTitle>
                            <AlertDescription>{error.message}</AlertDescription>
                        </Alert>
                    </div>
                ) : explanation ? (
                    <div className="px-6 py-8 space-y-8">
                        {/* Summary Section */}
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
                        {explanation.metrics && Object.keys(explanation.metrics).length > 0 && (
                            <div>
                                <h3 className="font-bold mb-4 text-lg">Key Metrics</h3>
                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                    {Object.entries(explanation.metrics).map(([key, value]) => (
                                        <div
                                            key={key}
                                            className="rounded-2xl border border-border/60 p-5 bg-gradient-to-br from-muted/50 to-muted/20 hover:border-primary/50 hover:bg-muted/40 transition-all"
                                        >
                                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.08em]">
                                                {key.replace(/([A-Z])/g, ' $1').trim()}
                                            </p>
                                            <p className="mt-3 text-2xl font-bold text-primary">{value}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Feature Importance Chart */}
                        {topFeatures.length > 0 && (
                            <div>
                                <h3 className="font-bold mb-4 text-lg">Feature Importance (SHAP Analysis)</h3>
                                <Card>
                                    <CardContent className="p-4">
                                        <div className="h-[300px] rounded-2xl border bg-background p-3">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart
                                                    data={topFeatures}
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
                                                        formatter={(value: any) => {
                                                            if (typeof value === 'number') {
                                                                return value.toFixed(3);
                                                            }
                                                            return value;
                                                        }}
                                                    />
                                                    <Bar
                                                        dataKey="contribution"
                                                        fill="#0f8b8d"
                                                        radius={[0, 8, 8, 0]}
                                                    />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {/* Detailed Feature Analysis */}
                        {explanation.features && explanation.features.length > 0 && (
                            <div>
                                <h3 className="font-bold mb-4 text-lg">Detailed Feature Analysis</h3>
                                <div className="space-y-3 max-h-[480px] overflow-y-auto pr-3 py-2">
                                    {explanation.features
                                        .sort((a, b) => Math.abs((b.contribution ?? b.impact ?? 0)) - Math.abs((a.contribution ?? a.impact ?? 0)))
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
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <p className="font-semibold text-sm">{feature.name}</p>
                                                        {feature.direction && (
                                                            <Badge
                                                                variant="outline"
                                                                className={
                                                                    feature.direction === 'increase'
                                                                        ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-900/20 dark:text-green-300'
                                                                        : 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-900/20 dark:text-red-300'
                                                                }
                                                            >
                                                                {feature.direction === 'increase' ? '↑' : '↓'}
                                                                {' '}
                                                                {feature.direction}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    {feature.description && (
                                                        <p className="text-xs text-muted-foreground mt-1">
                                                            {feature.description}
                                                        </p>
                                                    )}
                                                    {feature.value && (
                                                        <p className="text-xs text-muted-foreground mt-1">
                                                            Value: <strong>{feature.value}</strong>
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="flex-shrink-0 text-right">
                                                    <p className="font-bold text-sm">
                                                        {(() => {
                                                            const numericContribution = feature.contribution ?? feature.impact;
                                                            if (numericContribution === undefined) return '—';
                                                            return numericContribution > 0
                                                                ? `+${numericContribution.toFixed(3)}`
                                                                : numericContribution.toFixed(3);
                                                        })()}
                                                    </p>
                                                    {feature.contributionLabel && (
                                                        <p className="text-xs text-muted-foreground">
                                                            {feature.contributionLabel}
                                                        </p>
                                                    )}
                                                    {feature.impact !== undefined && (
                                                        <p className="text-xs text-muted-foreground">
                                                            Impact {feature.impact.toFixed(3)}
                                                        </p>
                                                    )}
                                                    {feature.importance !== undefined && (
                                                        <p className="text-xs text-muted-foreground">
                                                            {(feature.importance * 100).toFixed(1)}% impact
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        )}

                        <div className="flex items-center justify-between pt-6 mt-6 border-t">
                            <p className="text-xs text-muted-foreground">XAI-powered analysis using SHAP methodology</p>
                            <Button variant="outline" onClick={onExport} disabled={!onExport} className="gap-2">
                                <Download className="h-4 w-4" />
                                Export Report
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-center py-12 px-6 text-muted-foreground">
                        <p>No explanation data available</p>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
