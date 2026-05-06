import { ChangeEvent, useMemo, useState } from 'react';
import { useCartQuery, useCartRecommendations, useStoreMutations } from '@/hooks';
import { createFileRoute } from '@tanstack/react-router';
import {
  AlertCircle,
  Loader2,
  Minus,
  PackageOpen,
  Plus,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Tag,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

import { PageContainer } from '@/components/partials/container/page-container';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { useActivePromotions, type ActivePromotion } from '@/hooks';
import { formatCurrency } from '@/lib/utils';

export const Route = createFileRoute('/_authenticated/_user/cart')({
  component: RouteComponent,
});

// ── Promotion type labels ─────────────────────────────────────────────────────

const PROMO_LABELS: Record<string, string> = {
  seasonal_offer:  '🌿 Seasonal',
  awrudu_offer:    '🎉 Awrudu',
  christmas_offer: '🎄 Christmas',
  new_year_offer:  '🎆 New Year',
  flash_sale:      '⚡ Flash Sale',
  clearance:       '🏷️ Clearance',
  bundle_deal:     '📦 Bundle',
  loyalty_reward:  '⭐ Loyalty',
};

// ── Cart recommendations section ──────────────────────────────────────────────

function CartRecommendationsSection({ productIds }: { productIds: string[] }) {
  const { addToCart } = useStoreMutations();
  const [addingId, setAddingId] = useState<string | null>(null);
  const recsQuery = useCartRecommendations(productIds, 8);

  const recs =
    recsQuery.data?.success && recsQuery.data.recommendations
      ? recsQuery.data.recommendations
      : [];

  if (recsQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading recommendations…
      </div>
    );
  }

  if (recs.length === 0) return null;

  function handleAdd(id: string, name: string) {
    setAddingId(id);
    addToCart.mutate(
      { productId: id },
      {
        onSuccess: () => toast.success(`${name} added to cart`),
        onError:   (e) => toast.error((e as Error).message ?? 'Failed to add'),
        onSettled: () => setAddingId(null),
      },
    );
  }

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h2 className="text-base font-semibold">Frequently bought together</h2>
          <p className="text-xs text-muted-foreground">
            Customers who bought items in your cart also picked these.
          </p>
        </div>
      </div>

      {/* Recommendation cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {recs.map((rec) => {
          const alreadyInCart  = productIds.includes(rec.storefront_product_id);
          const matchPercent   = Math.round(rec.confidence_score * 100);
          const isAdding       = addingId === rec.storefront_product_id;

          return (
            <Card key={rec.storefront_product_id} className="flex flex-col overflow-hidden border-dashed hover:border-primary/40 transition-colors">
              {/* Image */}
              <div className="relative h-36 w-full flex-shrink-0 bg-muted/30">
                {rec.image_url ? (
                  <img src={rec.image_url} alt={rec.product_name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <ShoppingBag className="h-10 w-10 text-muted-foreground/25" />
                  </div>
                )}
                <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-muted/80 px-2 py-0.5 text-[10px] text-muted-foreground backdrop-blur-sm">
                  <Tag className="h-2.5 w-2.5" />
                  {rec.category}
                </span>
              </div>

              <CardContent className="flex flex-1 flex-col gap-2 p-3">
                <div className="flex-1">
                  <p className="line-clamp-2 text-sm font-semibold leading-snug">{rec.product_name}</p>
                  {rec.brand ? <p className="text-xs text-muted-foreground">{rec.brand}</p> : null}
                </div>

                <p className="text-base font-bold">{formatCurrency(rec.price)}</p>

                {/* Confidence bar */}
                <div>
                  <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-1 rounded-full bg-primary transition-all"
                      style={{ width: `${Math.min(matchPercent, 100)}%` }}
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {matchPercent}% match · {rec.co_buyer_count} shopper{rec.co_buyer_count !== 1 ? 's' : ''}
                  </p>
                </div>

                {rec.because_cart_items.length > 0 ? (
                  <p className="rounded-lg bg-muted/40 px-2 py-1 text-[11px] text-muted-foreground line-clamp-1">
                    With: {rec.because_cart_items.join(', ')}
                  </p>
                ) : null}

                <Button
                  size="sm"
                  variant={alreadyInCart ? 'outline' : 'default'}
                  className="mt-auto w-full gap-1.5"
                  disabled={alreadyInCart || isAdding}
                  onClick={() => handleAdd(rec.storefront_product_id, rec.product_name)}
                >
                  {isAdding
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <ShoppingCart className="h-3.5 w-3.5" />}
                  {alreadyInCart ? 'In cart' : isAdding ? 'Adding…' : 'Add to cart'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ── Main cart page ────────────────────────────────────────────────────────────

function RouteComponent() {
  const cartQuery = useCartQuery();
  const { updateCartItem, removeFromCart, clearCart, checkout } = useStoreMutations();
  const { data: promotionsData } = useActivePromotions();
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [shipping, setShipping] = useState({
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    notes: '',
  });

  const cart = cartQuery.data?.data;

  // Build productId → promotion map
  const promotionMap = useMemo<Map<string, ActivePromotion>>(() => {
    const map = new Map<string, ActivePromotion>();
    for (const promo of promotionsData?.data?.promotions ?? []) {
      map.set(promo.productId, promo);
    }
    return map;
  }, [promotionsData]);

  const handleAddressChange =
    (field: keyof typeof shipping) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setShipping((current) => ({ ...current, [field]: event.target.value }));
    };

  // Compute totals with promotions applied
  const totals = useMemo(() => {
    if (!cart) return { original: 0, savings: 0, discounted: 0 };
    let original = 0;
    let savings  = 0;
    for (const item of cart.items) {
      const promo        = promotionMap.get(item.productId);
      const lineOriginal = item.unitPrice * item.quantity;
      original += lineOriginal;
      if (promo) savings += lineOriginal * (promo.discountPercentage / 100);
    }
    return { original, savings, discounted: original - savings };
  }, [cart, promotionMap]);

  const canCheckout =
    !!cart &&
    cart.items.length > 0 &&
    shipping.street &&
    shipping.city &&
    shipping.state &&
    shipping.zipCode &&
    shipping.country;

  return (
    <PageContainer className="space-y-6">
      {/* ── Header ── */}
      <div className="rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-transparent to-transparent px-6 py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
              <ShoppingCart className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold">Cart</h1>
              <p className="text-sm text-muted-foreground">
                {cart && cart.items.length > 0
                  ? `${cart.itemCount} item${cart.itemCount !== 1 ? 's' : ''} · ready for checkout`
                  : 'Review your selections and complete checkout.'}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => window.location.assign('/')}>
            Continue Shopping
          </Button>
        </div>
      </div>

      {cartQuery.error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Unable to load cart</AlertTitle>
          <AlertDescription>{(cartQuery.error as Error).message}</AlertDescription>
        </Alert>
      )}

      {/* Loading */}
      {cartQuery.isLoading ? (
        <div className="flex min-h-56 items-center justify-center rounded-3xl border border-dashed">
          <Spinner className="h-6 w-6" />
        </div>

      /* Empty cart */
      ) : !cart || cart.items.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex min-h-56 flex-col items-center justify-center gap-4 text-center">
            <PackageOpen className="h-10 w-10 text-muted-foreground" />
            <div>
              <h2 className="text-lg font-semibold">Your cart is empty</h2>
              <p className="text-sm text-muted-foreground">
                Add products from the catalog to start a new order.
              </p>
            </div>
            <Button onClick={() => window.location.assign('/')}>Browse Products</Button>
          </CardContent>
        </Card>

      /* Cart content */
      ) : (
        <div className="space-y-8">
          <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">

            {/* ── Cart items ── */}
            <div className="space-y-3">
              {cart.items.map((item) => {
                const promo          = promotionMap.get(item.productId);
                const discountedUnit = promo
                  ? item.unitPrice * (1 - promo.discountPercentage / 100)
                  : null;
                const discountedTotal = discountedUnit !== null
                  ? discountedUnit * item.quantity
                  : null;

                return (
                  <Card
                    key={item.id}
                    className={`transition-shadow hover:shadow-sm ${promo ? 'border-orange-200 dark:border-orange-900/50' : ''}`}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1 min-w-0">
                          <CardTitle className="text-base leading-snug">{item.productName}</CardTitle>
                          <p className="text-xs text-muted-foreground">{item.sku}</p>
                          {promo && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-700 dark:bg-orange-900/40 dark:text-orange-400">
                              <Tag className="h-3 w-3" />
                              {promo.discountPercentage}% off · {PROMO_LABELS[promo.promotionType] ?? promo.promotionType}
                            </span>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                          disabled={removingId === item.productId}
                          onClick={() => {
                            setRemovingId(item.productId);
                            removeFromCart.mutate(item.productId, {
                              onSuccess: () => toast.success(`${item.productName} removed`),
                              onError:   (e) => toast.error((e as Error).message ?? 'Failed to remove'),
                              onSettled: () => setRemovingId(null),
                            });
                          }}
                        >
                          {removingId === item.productId
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : <Trash2 className="h-4 w-4" />}
                        </Button>
                      </div>
                    </CardHeader>

                    <CardContent className="flex flex-col gap-3 pt-0 md:flex-row md:items-center md:justify-between">
                      {/* Unit price */}
                      <div className="text-sm text-muted-foreground">
                        {discountedUnit !== null ? (
                          <span className="flex items-baseline gap-2">
                            <span className="text-base font-semibold text-orange-600 dark:text-orange-400">
                              {formatCurrency(discountedUnit)}
                            </span>
                            <span className="line-through">{formatCurrency(item.unitPrice)}</span>
                            <span>/ unit · stock {item.currentStock}</span>
                          </span>
                        ) : (
                          <span>
                            {formatCurrency(item.unitPrice)} / unit · stock {item.currentStock}
                          </span>
                        )}
                      </div>

                      {/* Quantity controls */}
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="h-8 w-8 p-0"
                          disabled={updatingId === item.productId || item.quantity <= 1}
                          onClick={() => {
                            setUpdatingId(item.productId);
                            updateCartItem.mutate(
                              { productId: item.productId, quantity: item.quantity - 1 },
                              { onSettled: () => setUpdatingId(null) },
                            );
                          }}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <Input
                          value={item.quantity}
                          onChange={(e) => {
                            const qty = Number(e.target.value);
                            if (qty >= 0 && qty <= item.currentStock) {
                              setUpdatingId(item.productId);
                              updateCartItem.mutate(
                                { productId: item.productId, quantity: qty },
                                { onSettled: () => setUpdatingId(null) },
                              );
                            }
                          }}
                          type="number"
                          min={1}
                          max={item.currentStock}
                          className="w-16 text-center"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className="h-8 w-8 p-0"
                          disabled={updatingId === item.productId || item.quantity >= item.currentStock}
                          onClick={() => {
                            setUpdatingId(item.productId);
                            updateCartItem.mutate(
                              { productId: item.productId, quantity: item.quantity + 1 },
                              { onSettled: () => setUpdatingId(null) },
                            );
                          }}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>

                    <CardFooter className="justify-between border-t pt-3">
                      <span className="text-sm text-muted-foreground">{item.quantity} units</span>
                      <div className="flex items-baseline gap-2">
                        {discountedTotal !== null && (
                          <span className="text-sm text-muted-foreground line-through">
                            {formatCurrency(item.totalPrice)}
                          </span>
                        )}
                        <span
                          className={`text-base font-semibold ${discountedTotal !== null ? 'text-orange-600 dark:text-orange-400' : ''}`}
                        >
                          {formatCurrency(discountedTotal ?? item.totalPrice)}
                        </span>
                      </div>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>

            {/* ── Checkout panel ── */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Shipping Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Input placeholder="Street address" value={shipping.street}  onChange={handleAddressChange('street')}  />
                  <div className="grid grid-cols-2 gap-3">
                    <Input placeholder="City"  value={shipping.city}  onChange={handleAddressChange('city')}  />
                    <Input placeholder="State" value={shipping.state} onChange={handleAddressChange('state')} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input placeholder="ZIP Code" value={shipping.zipCode} onChange={handleAddressChange('zipCode')} />
                    <Input placeholder="Country"  value={shipping.country} onChange={handleAddressChange('country')} />
                  </div>
                  <textarea
                    value={shipping.notes}
                    onChange={handleAddressChange('notes')}
                    placeholder="Order notes (optional)"
                    className="min-h-20 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring"
                  />
                </CardContent>

                <CardFooter className="flex-col items-stretch gap-3 border-t pt-4">
                  {/* Items count */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Items</span>
                    <span>{cart.itemCount}</span>
                  </div>

                  {/* Promotion savings rows */}
                  {totals.savings > 0 && (
                    <>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span className="text-muted-foreground line-through">{formatCurrency(totals.original)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm font-medium text-orange-600 dark:text-orange-400">
                        <span className="flex items-center gap-1">
                          <Tag className="h-3.5 w-3.5" />
                          Promotion savings
                        </span>
                        <span>− {formatCurrency(totals.savings)}</span>
                      </div>
                      <hr className="border-border" />
                    </>
                  )}

                  {/* Total */}
                  <div className="flex items-center justify-between text-lg font-bold">
                    <span>Total</span>
                    <span className={totals.savings > 0 ? 'text-orange-600 dark:text-orange-400' : ''}>
                      {formatCurrency(totals.savings > 0 ? totals.discounted : totals.original)}
                    </span>
                  </div>

                  <Button
                    className="w-full"
                    disabled={!canCheckout || checkout.isPending}
                    onClick={() =>
                      checkout.mutate({
                        shippingAddress: {
                          street: shipping.street,
                          city: shipping.city,
                          state: shipping.state,
                          zipCode: shipping.zipCode,
                          country: shipping.country,
                        },
                        billingAddress: {
                          street: shipping.street,
                          city: shipping.city,
                          state: shipping.state,
                          zipCode: shipping.zipCode,
                          country: shipping.country,
                        },
                        notes: shipping.notes || undefined,
                      })
                    }
                  >
                    {checkout.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Placing Order…
                      </>
                    ) : (
                      'Place Order'
                    )}
                  </Button>

                  <Button variant="outline" className="w-full" onClick={() => clearCart.mutate()}>
                    Clear Cart
                  </Button>
                </CardFooter>
              </Card>

              {(updateCartItem.error || removeFromCart.error || clearCart.error || checkout.error) && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Action failed</AlertTitle>
                  <AlertDescription>
                    {(updateCartItem.error as Error)?.message ||
                      (removeFromCart.error as Error)?.message ||
                      (clearCart.error as Error)?.message ||
                      (checkout.error as Error)?.message}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>

          {/* ── Cart recommendations ── */}
          <CartRecommendationsSection productIds={cart.items.map((i) => i.productId)} />
        </div>
      )}
    </PageContainer>
  );
}
