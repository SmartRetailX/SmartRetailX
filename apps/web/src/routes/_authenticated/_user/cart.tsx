import { ChangeEvent, useMemo, useState } from 'react';
import { useCartQuery, useCartRecommendations, useStoreMutations } from '@/hooks';
import { createFileRoute } from '@tanstack/react-router';
import {
  AlertCircle,
  Minus,
  Plus,
  ShoppingCart,
  Sparkles,
  Tag,
  Trash2,
} from 'lucide-react';

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

// ── Promotion type short labels ───────────────────────────────────────────────

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

// ── Cart recommendations (existing) ──────────────────────────────────────────

function CartRecommendationsSection({ productIds }: { productIds: string[] }) {
  const { addToCart } = useStoreMutations();
  const recsQuery = useCartRecommendations(productIds, 8);
  const recs =
    recsQuery.data?.success && recsQuery.data.recommendations
      ? recsQuery.data.recommendations
      : [];

  if (recsQuery.isLoading || recs.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Frequently bought together</h2>
          <p className="text-sm text-muted-foreground">
            Customers who bought items in your cart also picked these.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {recs.map((rec) => {
          const alreadyInCart = productIds.includes(rec.storefront_product_id);
          const matchPercent = Math.round(rec.confidence_score * 100);

          return (
            <Card key={rec.storefront_product_id} className="border-dashed">
              <CardContent className="space-y-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  <Tag className="h-3 w-3" />
                  {rec.category}
                </span>
                <div>
                  <p className="text-sm font-semibold leading-snug">{rec.product_name}</p>
                  {rec.brand ? (
                    <p className="text-xs text-muted-foreground">{rec.brand}</p>
                  ) : null}
                </div>
                <p className="text-base font-semibold">{formatCurrency(rec.price)}</p>
                <div>
                  <div className="h-1 w-full rounded-full bg-muted">
                    <div
                      className="h-1 rounded-full bg-primary transition-all"
                      style={{ width: `${Math.min(matchPercent, 100)}%` }}
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {matchPercent}% match · {rec.co_buyer_count} shopper
                    {rec.co_buyer_count !== 1 ? 's' : ''}
                  </p>
                </div>
                {rec.because_cart_items.length > 0 ? (
                  <p className="text-[11px] text-muted-foreground">
                    With: {rec.because_cart_items.join(', ')}
                  </p>
                ) : null}
              </CardContent>
              <CardFooter className="flex-col items-stretch gap-2">
                <Button
                  size="sm"
                  variant={alreadyInCart ? 'outline' : 'default'}
                  disabled={alreadyInCart || addToCart.isPending}
                  onClick={() =>
                    addToCart.mutate({ productId: rec.storefront_product_id })
                  }
                >
                  {alreadyInCart ? 'In cart' : 'Add to cart'}
                </Button>
              </CardFooter>
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

  const [shipping, setShipping] = useState({
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    notes: '',
  });

  const cart = cartQuery.data?.data;

  // Build productId → promotion map from active store-wide promotions
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
    let savings = 0;
    for (const item of cart.items) {
      const promo = promotionMap.get(item.productId);
      const lineOriginal = item.unitPrice * item.quantity;
      original += lineOriginal;
      if (promo) {
        savings += lineOriginal * (promo.discountPercentage / 100);
      }
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
    <PageContainer>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Cart</h1>
            <p className="text-sm text-muted-foreground">
              Review quantities, adjust stock selections, and complete checkout.
            </p>
          </div>
          <Button variant="outline" onClick={() => window.location.assign('/')}>
            Continue Shopping
          </Button>
        </div>

        {cartQuery.error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Unable to load cart</AlertTitle>
            <AlertDescription>{(cartQuery.error as Error).message}</AlertDescription>
          </Alert>
        )}

        {cartQuery.isLoading ? (
          <div className="flex min-h-56 items-center justify-center rounded-3xl border border-dashed">
            <Spinner className="h-6 w-6" />
          </div>
        ) : !cart || cart.items.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex min-h-56 flex-col items-center justify-center gap-4 text-center">
              <ShoppingCart className="h-10 w-10 text-muted-foreground" />
              <div>
                <h2 className="text-xl font-semibold">Your cart is empty</h2>
                <p className="text-sm text-muted-foreground">
                  Add products from the catalog to start a new order.
                </p>
              </div>
              <Button onClick={() => window.location.assign('/')}>Browse Products</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
              {/* ── Cart items ── */}
              <div className="space-y-4">
                {cart.items.map((item) => {
                  const promo = promotionMap.get(item.productId);
                  const discountedUnit = promo
                    ? item.unitPrice * (1 - promo.discountPercentage / 100)
                    : null;
                  const discountedTotal = discountedUnit !== null
                    ? discountedUnit * item.quantity
                    : null;

                  return (
                    <Card key={item.id} className={promo ? 'border-orange-200 dark:border-orange-900/50' : ''}>
                      <CardHeader>
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1">
                            <CardTitle>{item.productName}</CardTitle>
                            <p className="text-sm text-muted-foreground">{item.sku}</p>
                            {/* Promotion badge */}
                            {promo && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-700 dark:bg-orange-900/40 dark:text-orange-400">
                                <Tag className="h-3 w-3" />
                                {promo.discountPercentage}% off ·{' '}
                                {PROMO_LABELS[promo.promotionType] ?? promo.promotionType}
                              </span>
                            )}
                          </div>
                          <Button variant="ghost" onClick={() => removeFromCart.mutate(item.productId)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>

                      <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        {/* Unit price */}
                        <div className="text-sm text-muted-foreground">
                          {discountedUnit !== null ? (
                            <span className="flex items-baseline gap-2">
                              <span className="text-base font-semibold text-orange-600 dark:text-orange-400">
                                {formatCurrency(discountedUnit)}
                              </span>
                              <span className="line-through">
                                {formatCurrency(item.unitPrice)}
                              </span>
                              <span>/ unit · stock {item.currentStock}</span>
                            </span>
                          ) : (
                            <span>
                              Unit price {formatCurrency(item.unitPrice)} · stock{' '}
                              {item.currentStock}
                            </span>
                          )}
                        </div>

                        {/* Quantity controls */}
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            onClick={() =>
                              updateCartItem.mutate({
                                productId: item.productId,
                                quantity: item.quantity - 1,
                              })
                            }
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <Input
                            value={item.quantity}
                            onChange={(event) =>
                              updateCartItem.mutate({
                                productId: item.productId,
                                quantity: Number(event.target.value || 0),
                              })
                            }
                            type="number"
                            min={0}
                            max={item.currentStock}
                            className="w-20 text-center"
                          />
                          <Button
                            variant="outline"
                            onClick={() =>
                              updateCartItem.mutate({
                                productId: item.productId,
                                quantity: item.quantity + 1,
                              })
                            }
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>

                      <CardFooter className="justify-between">
                        <span className="text-sm text-muted-foreground">{item.quantity} units</span>
                        <div className="flex items-baseline gap-2">
                          {discountedTotal !== null && (
                            <span className="text-sm text-muted-foreground line-through">
                              {formatCurrency(item.totalPrice)}
                            </span>
                          )}
                          <span className={`text-lg font-semibold ${discountedTotal !== null ? 'text-orange-600 dark:text-orange-400' : ''}`}>
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
                  <CardHeader>
                    <CardTitle>Checkout</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Input
                      placeholder="Street"
                      value={shipping.street}
                      onChange={handleAddressChange('street')}
                    />
                    <Input
                      placeholder="City"
                      value={shipping.city}
                      onChange={handleAddressChange('city')}
                    />
                    <Input
                      placeholder="State"
                      value={shipping.state}
                      onChange={handleAddressChange('state')}
                    />
                    <Input
                      placeholder="ZIP Code"
                      value={shipping.zipCode}
                      onChange={handleAddressChange('zipCode')}
                    />
                    <Input
                      placeholder="Country"
                      value={shipping.country}
                      onChange={handleAddressChange('country')}
                    />
                    <textarea
                      value={shipping.notes}
                      onChange={handleAddressChange('notes')}
                      placeholder="Order notes"
                      className="min-h-24 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none"
                    />
                  </CardContent>
                  <CardFooter className="flex-col items-stretch gap-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Items</span>
                      <span>{cart.itemCount}</span>
                    </div>

                    {/* Show savings row only when promotions apply */}
                    {totals.savings > 0 && (
                      <>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Subtotal</span>
                          <span className="line-through text-muted-foreground">
                            {formatCurrency(totals.original)}
                          </span>
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

                    <div className="flex items-center justify-between text-lg font-semibold">
                      <span>Total</span>
                      <span className={totals.savings > 0 ? 'text-orange-600 dark:text-orange-400' : ''}>
                        {formatCurrency(totals.savings > 0 ? totals.discounted : totals.original)}
                      </span>
                    </div>

                    <Button
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
                      {checkout.isPending ? 'Placing Order...' : 'Place Order'}
                    </Button>
                    <Button variant="outline" onClick={() => clearCart.mutate()}>
                      Clear Cart
                    </Button>
                  </CardFooter>
                </Card>

                {(updateCartItem.error ||
                  removeFromCart.error ||
                  clearCart.error ||
                  checkout.error) && (
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

            <CartRecommendationsSection
              productIds={cart.items.map((item) => item.productId)}
            />
          </div>
        )}
      </div>
    </PageContainer>
  );
}
