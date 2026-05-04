import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { PageContainer } from '@/components/partials/container/page-container';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useBiForecastQuery, useBiForecastExplanationQuery } from '@/hooks/bi-dashboard';
import type { BiForecastResponse } from '@/types/bi-dashboard';

export const Route = createFileRoute('/bi-dashboard/ml-explain')({
    component: RouteComponent,
});

export function RouteComponent() {
    const [productId, setProductId] = useState<string>('');
    const forecastQuery = useBiForecastQuery({ productId, horizon: 30, lang: 'en' });
    const explanationQuery = useBiForecastExplanationQuery({ productId, lang: 'en' });

    const forecast = (forecastQuery.data?.data as BiForecastResponse) ?? null;

    return (
        <PageContainer>
            <div className="space-y-6">
                <section className="rounded-2xl border p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold">ML explanations</h2>
                            <p className="text-sm text-muted-foreground">Inspect model outputs and feature drivers for forecasts.</p>
                        </div>
                        <div>
                            <Button onClick={() => window.history.back()}>Back</Button>
                        </div>
                    </div>
                </section>

                <section className="grid gap-6 md:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Forecast details</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {!productId ? (
                                <div className="text-sm text-muted-foreground">Select a product from the admin surface to populate this page.</div>
                            ) : forecastQuery.isLoading ? (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Loader2 className="h-4 w-4 animate-spin" /> Loading forecast...
                                </div>
                            ) : forecastQuery.error ? (
                                <div className="text-sm text-destructive">{(forecastQuery.error as Error).message}</div>
                            ) : (
                                <div className="space-y-3 text-sm">
                                    <div className="font-semibold">Model</div>
                                    <div>{forecast?.modelType ?? '—'}</div>
                                    <div className="font-semibold">Confidence</div>
                                    <div>{forecast?.confidence ? `${Math.round(forecast.confidence * 100)}%` : '—'}</div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Explanation summary</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {explanationQuery.isLoading ? (
                                <div className="text-sm text-muted-foreground">Loading explanation...</div>
                            ) : explanationQuery.error ? (
                                <div className="text-sm text-destructive">{(explanationQuery.error as Error).message}</div>
                            ) : explanationQuery.data?.data ? (
                                <div className="space-y-3 text-sm text-muted-foreground">
                                    <div className="rounded-xl bg-muted/40 p-3">{explanationQuery.data.data.explanation?.summary}</div>
                                    {explanationQuery.data.data.explanation?.features?.map((f: any) => (
                                        <div key={f.name} className="rounded-xl border p-3">
                                            <div className="font-semibold">{f.name}</div>
                                            <div className="text-sm text-muted-foreground">{f.description}</div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-sm text-muted-foreground">No explanation payload returned yet.</div>
                            )}
                        </CardContent>
                    </Card>
                </section>
            </div>
        </PageContainer>
    );
}
