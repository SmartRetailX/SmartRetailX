import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import {
  Loader2,
  PackageOpen,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Tag,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';

import { PageContainer } from '@/components/partials/container/page-container';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useProductSuggestions, useStoreMutations } from '@/hooks';
import { formatCurrency } from '@/lib/utils';

export const Route = createFileRoute('/_authenticated/_user/product-suggestions')({
  component: RouteComponent,
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function confidenceColor(score: number): { bar: string; badge: string } {
  if (score >= 0.5) return { bar: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  if (score >= 0.3) return { bar: 'bg-blue-500',    badge: 'bg-blue-50 text-blue-700 border-blue-200' };
  if (score >= 0.15) return { bar: 'bg-sky-500',    badge: 'bg-sky-50 text-sky-700 border-sky-200' };
  return                     { bar: 'bg-amber-400', badge: 'bg-amber-50 text-amber-700 border-amber-200' };
}

function categoryColor(category: string): string {
  const map: Record<string, string> = {
    Electronics: 'bg-blue-100 text-blue-600',
    Clothing:    'bg-pink-100 text-pink-600',
    Food:        'bg-amber-100 text-amber-600',
    Groceries:   'bg-green-100 text-green-600',
    Sports:      'bg-orange-100 text-orange-600',
    Beauty:      'bg-rose-100 text-rose-600',
    Home:        'bg-teal-100 text-teal-600',
    Books:       'bg-indigo-100 text-indigo-600',
  };
  for (const [key, cls] of Object.entries(map)) {
    if (category.toLowerCase().includes(key.toLowerCase())) return cls;
  }
  return 'bg-gray-100 text-gray-600';
}

// ── Suggestion card ───────────────────────────────────────────────────────────

function SuggestionCard({
  product,
  index,
  addingId,
  onAddToCart,
}: {
  product: ReturnType<typeof useProductSuggestions>['data'] extends { suggestions: infer S | null } ? NonNullable<S>[number] : never;
  index: number;
  addingId: string | null;
  onAddToCart: (id: string, name: string) => void;
}) {
  const conf   = confidenceColor(product.confidence_score);
  const catCls = categoryColor(product.category);
  const pct    = Math.round(product.confidence_score * 100);
  const isAdding = addingId === product.product_id;

  return (
    <Card className="flex flex-col overflow-hidden">
      {/* Product image */}
      <div className="relative h-44 w-full flex-shrink-0 bg-muted/30">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.product_name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ShoppingBag className="h-12 w-12 text-muted-foreground/30" />
          </div>
        )}
        {/* Rank badge */}
        <span className="absolute right-2 top-2 rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
          #{index + 1}
        </span>
      </div>

      {/* Card body */}
      <CardContent className="flex flex-1 flex-col gap-3 p-4">
        {/* Category */}
        <span className={`inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-xs ${catCls}`}>
          <Tag className="h-3 w-3" />
          {product.category}
        </span>

        {/* Name + brand */}
        <div className="flex-1">
          <p className="line-clamp-2 text-sm font-semibold leading-snug">{product.product_name}</p>
          {product.brand ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{product.brand}</p>
          ) : null}
        </div>

        {/* Price */}
        <p className="text-lg font-bold">{formatCurrency(product.price)}</p>

        {/* Match confidence bar */}
        <div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Match strength</span>
            <span className={`rounded-full border px-2 py-0.5 ${conf.badge}`}>{pct}%</span>
          </div>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-1.5 rounded-full transition-all ${conf.bar}`}
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
        </div>

        {/* Because you bought */}
        {product.because_you_bought.length > 0 ? (
          <p className="rounded-xl bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            Because you bought {product.because_you_bought.join(', ')}
          </p>
        ) : null}

        <p className="text-xs text-muted-foreground">
          {product.co_buyer_count} shopper{product.co_buyer_count !== 1 ? 's' : ''} with similar taste also bought this
        </p>

        {/* Add to Cart */}
        <Button
          size="sm"
          className="mt-auto w-full gap-1.5"
          disabled={isAdding}
          onClick={() => onAddToCart(product.product_id, product.product_name)}
        >
          {isAdding ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <ShoppingCart className="h-3.5 w-3.5" />
          )}
          {isAdding ? 'Adding…' : 'Add to Cart'}
        </Button>
      </CardContent>
    </Card>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

function RouteComponent() {
  const { data, isLoading } = useProductSuggestions(20);
  const { addToCart }       = useStoreMutations();
  const [addingId, setAddingId] = useState<string | null>(null);

  const serviceDown = !isLoading && (!data || data.success === false || data.suggestions === null);
  const noHistory   = !isLoading && !serviceDown && data?.customer_products_count === 0;
  const suggestions = !isLoading && !serviceDown ? (data?.suggestions ?? []) : [];

  function handleAddToCart(productId: string, productName: string) {
    setAddingId(productId);
    addToCart.mutate(
      { productId },
      {
        onSuccess: () => toast.success(`${productName} added to cart`),
        onError:   (e) => toast.error((e as Error).message ?? 'Failed to add to cart'),
        onSettled: () => setAddingId(null),
      },
    );
  }

  return (
    <PageContainer className="space-y-6">
      {/* Header */}
      <div className="rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-transparent to-transparent px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">For You</h1>
            <p className="text-sm text-muted-foreground">
              Products picked based on what similar shoppers bought.
            </p>
          </div>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex min-h-56 items-center justify-center rounded-3xl border border-dashed">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {/* Service down */}
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

      {/* No history */}
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

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="grid gap-4">
          {/* Stats row */}
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { label: 'Suggestions',   value: data?.total ?? 0,                                       icon: Sparkles,     color: 'text-primary bg-primary/10' },
              { label: 'Your purchases',value: data?.customer_products_count ?? 0,                     icon: ShoppingBag,  color: 'text-sky-600 bg-sky-50' },
              { label: 'Top confidence',value: `${((suggestions[0]?.confidence_score ?? 0) * 100).toFixed(0)}%`, icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50' },
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

          {/* Product grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {suggestions.map((product, index) => (
              <SuggestionCard
                key={product.product_id}
                product={product}
                index={index}
                addingId={addingId}
                onAddToCart={handleAddToCart}
              />
            ))}
          </div>
        </div>
      )}
    </PageContainer>
  );
}
