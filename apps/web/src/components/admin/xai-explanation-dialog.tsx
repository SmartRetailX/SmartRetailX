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
}

export function XAIExplanationDialog({
    open,
    onOpenChange,
    title = 'AI Explanation',
    description = 'Understanding how the AI model makes predictions',
    isLoading = false,
    error = null,
    explanation = null,
}: XAIExplanationDialogProps) {
    const topFeatures = explanation?.features
        ?.sort((a, b) => Math.abs((b.contribution ?? b.impact ?? 0)) - Math.abs((a.contribution ?? a.impact ?? 0)))
        .slice(0, 10) || [];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>

                {isLoading ? (
                    <div className="flex items-center justify-center py-8 px-6">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Loader2 className="h-5 w-5 animate-spin" />
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
                    <div className="px-6 py-6 space-y-6">
                        {/* Summary Section */}
                        {explanation.summary && (
                            <div className="rounded-2xl border border-blue-200 bg-blue-50 dark:border-blue-900/50 dark:bg-blue-900/20 p-4">
                                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                                    Analysis Summary
                                </h3>
                                <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">
                                    {explanation.summary}
                                </p>
                            </div>
                        )}

                        {/* Key Metrics */}
                        {explanation.metrics && Object.keys(explanation.metrics).length > 0 && (
                            <div>
                                <h3 className="font-semibold mb-3">Key Metrics</h3>
                                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                                    {Object.entries(explanation.metrics).map(([key, value]) => (
                                        <div
                                            key={key}
                                            className="rounded-2xl border p-4 bg-muted/30"
                                        >
                                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-[0.05em]">
                                                {key.replace(/([A-Z])/g, ' $1').trim()}
                                            </p>
                                            <p className="mt-2 text-2xl font-bold">{value}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Feature Importance Chart */}
                        {topFeatures.length > 0 && (
                            <div>
                                <h3 className="font-semibold mb-3">Feature Importance (SHAP Analysis)</h3>
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
                                <h3 className="font-semibold mb-3">Detailed Feature Analysis</h3>
                                <div className="space-y-2 max-h-[420px] overflow-y-auto pr-2">
                                    {explanation.features
                                        .sort((a, b) => Math.abs((b.contribution ?? b.impact ?? 0)) - Math.abs((a.contribution ?? a.impact ?? 0)))
                                        .map((feature, idx) => (
                                            <div
                                                key={idx}
                                                className="flex items-start gap-4 p-4 bg-muted/40 rounded-lg hover:bg-muted/60 transition-colors border"
                                            >
                                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-col">
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

                        <DialogFooter>
                            <Button variant="outline">
                                <Download className="mr-2 h-4 w-4" />
                                Export Report
                            </Button>
                        </DialogFooter>
                    </div>
                ) : (
                    <div className="flex items-center justify-center py-8 px-6 text-muted-foreground">
                        <p>No explanation data available</p>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
