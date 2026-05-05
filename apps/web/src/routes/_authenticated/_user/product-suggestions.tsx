import { createFileRoute } from '@tanstack/react-router';
import { Loader2, PackageOpen, ShoppingBag, Sparkles, Tag, TrendingUp } from 'lucide-react';

import { PageContainer } from '@/components/partials/container/page-container';
import { Card, CardContent } from '@/components/ui/card';
import { useProductSuggestions } from '@/hooks';
import { formatCurrency } from '@/lib/utils';

export const Route = createFileRoute('/_authenticated/_user/product-suggestions')({
  component: RouteComponent,
});

function confidenceColor(score: number): { bar: string; badge: string } {
  if (score >= 0.5) return { bar: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  if (score >= 0.3) return { bar: 'bg-blue-500', badge: 'bg-blue-50 text-blue-700 border-blue-200' };
  if (score >= 0.15) return { bar: 'bg-sky-500', badge: 'bg-sky-50 text-sky-700 border-sky-200' };
  return { bar: 'bg-amber-400', badge: 'bg-amber-50 text-amber-700 border-amber-200' };
}

function categoryColor(category: string): string {
  const map: Record<string, string> = {
    Electronics: 'bg-blue-100 text-blue-600',
    Clothing: 'bg-pink-100 text-pink-600',
    Food: 'bg-amber-100 text-amber-600',
    Groceries: 'bg-green-100 text-green-600',
    Sports: 'bg-orange-100 text-orange-600',
    Beauty: 'bg-rose-100 text-rose-600',
    Home: 'bg-teal-100 text-teal-600',
    Books: 'bg-indigo-100 text-indigo-600',
  };

  for (const [key, cls] of Object.entries(map)) {
    if (category.toLowerCase().includes(key.toLowerCase())) {
      return cls;
    }
  }

  return 'bg-gray-100 text-gray-600';
}

function RouteComponent() {
  const { data, isLoading } = useProductSuggestions(20);

  const serviceDown = !isLoading && (!data || data.success === false || data.suggestions === null);
  const noHistory = !isLoading && !serviceDown && data?.customer_products_count === 0;
  const suggestions = !isLoading && !serviceDown ? data?.suggestions ?? [] : [];

  return (
    <PageContainer className="space-y-6">
      <div className="rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-transparent to-transparent px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">For you</h1>
            <p className="text-sm text-muted-foreground">
              Products picked based on what similar shoppers bought.
            </p>
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="flex min-h-56 items-center justify-center rounded-3xl border border-dashed">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {serviceDown && (
        <Card className="border-dashed">
          <CardContent className="flex min-h-56 flex-col items-center justify-center gap-4 text-center">
            <PackageOpen className="h-10 w-10 text-muted-foreground" />
            <div>
              <p className="text-base font-semibold">Recommendation service is offline</p>
              <p className="text-sm text-muted-foreground">
                Product suggestions will appear here once the service is back online.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {noHistory && (
        <Card className="border-dashed">
          <CardContent className="flex min-h-56 flex-col items-center justify-center gap-4 text-center">
            <ShoppingBag className="h-10 w-10 text-muted-foreground" />
            <div>
              <p className="text-base font-semibold">No purchase history yet</p>
              <p className="text-sm text-muted-foreground">
                Start shopping and we will recommend products based on your history.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {suggestions.length > 0 && (
        <div className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              {
                label: 'Suggestions',
                value: data?.total ?? 0,
                icon: Sparkles,
                color: 'text-primary bg-primary/10',
              },
              {
                label: 'Your purchases',
                value: data?.customer_products_count ?? 0,
                icon: ShoppingBag,
                color: 'text-sky-600 bg-sky-50',
              },
              {
                label: 'Top confidence',
                value: `${((suggestions[0]?.confidence_score ?? 0) * 100).toFixed(0)}%`,
                icon: TrendingUp,
                color: 'text-emerald-600 bg-emerald-50',
              },
            ].map((stat) => (
              <Card key={stat.label} size="sm">
                <CardContent className="flex items-center gap-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${stat.color}`}>
                    <stat.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold leading-none">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {suggestions.map((product, index) => {
              const conf = confidenceColor(product.confidence_score);
              const catCls = categoryColor(product.category);
              const pct = Math.round(product.confidence_score * 100);

              return (
                <Card key={product.product_id} className="relative overflow-hidden">
                  <CardContent className="space-y-3">
                    <div className="flex items-start justify-between">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${catCls}`}>
                        <Tag className="h-3 w-3" />
                        {product.category}
                      </span>
                      <span className="text-xs text-muted-foreground">#{index + 1}</span>
                    </div>

                    <div>
                      <p className="text-base font-semibold leading-snug">{product.product_name}</p>
                      {product.brand ? (
                        <p className="text-xs text-muted-foreground">{product.brand}</p>
                      ) : null}
                    </div>

                    <p className="text-lg font-semibold">{formatCurrency(product.price)}</p>

                    <div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Match strength</span>
                        <span className={`rounded-full border px-2 py-0.5 ${conf.badge}`}>
                          {pct}%
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 w-full rounded-full bg-muted">
                        <div className={`h-1.5 rounded-full ${conf.bar}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                    </div>

                    {product.because_you_bought.length > 0 ? (
                      <div className="rounded-xl bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                        Because you bought {product.because_you_bought.join(', ')}
                      </div>
                    ) : null}

                    <p className="text-xs text-muted-foreground">
                      {product.co_buyer_count} shopper{product.co_buyer_count !== 1 ? 's' : ''} with similar taste also bought this
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </PageContainer>
  );
}
