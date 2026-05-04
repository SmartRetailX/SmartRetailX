import { ChangeEvent, useState } from 'react';
import { useCartQuery, useStoreMutations } from '@/hooks';
import { createFileRoute } from '@tanstack/react-router';
import { AlertCircle, Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react';

import { PageContainer } from '@/components/partials/container/page-container';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';

export const Route = createFileRoute('/_authenticated/_user/cart')({
  component: RouteComponent,
});

function RouteComponent() {
  const cartQuery = useCartQuery();
  const { updateCartItem, removeFromCart, clearCart, checkout } = useStoreMutations();
  const [shipping, setShipping] = useState({
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    notes: '',
  });

  const cart = cartQuery.data?.data;

  const handleAddressChange =
    (field: keyof typeof shipping) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setShipping((current) => ({ ...current, [field]: event.target.value }));
    };

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
          <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
            <div className="space-y-4">
              {cart.items.map((item) => (
                <Card key={item.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <CardTitle>{item.productName}</CardTitle>
                        <p className="mt-1 text-sm text-muted-foreground">{item.sku}</p>
                      </div>
                      <Button variant="ghost" onClick={() => removeFromCart.mutate(item.productId)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="text-sm text-muted-foreground">
                      Unit price Rs. {item.unitPrice.toFixed(2)}. Available stock {item.currentStock}.
                    </div>
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
                    <span className="text-lg font-semibold">Rs. {item.totalPrice.toFixed(2)}</span>
                  </CardFooter>
                </Card>
              ))}
            </div>

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
                  <div className="flex items-center justify-between text-lg font-semibold">
                    <span>Total</span>
                    <span>Rs. {cart.subtotal.toFixed(2)}</span>
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
        )}
      </div>
    </PageContainer>
  );
}
