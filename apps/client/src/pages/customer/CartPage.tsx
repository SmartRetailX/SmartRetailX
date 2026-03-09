import { Link, useNavigate } from 'react-router-dom'
import { Loader2, Minus, Plus, ShoppingBag, ShoppingCart, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { useCart, useUpdateCartItem, useRemoveFromCart, useClearCart, type CartItem } from '@/hooks/useCart'
import { formatCurrency } from '@/lib/utils'

function CartItemRow({ item }: { item: CartItem }) {
  const updateItem = useUpdateCartItem()
  const removeItem = useRemoveFromCart()

  const handleQuantityChange = (delta: number) => {
    const newQuantity = item.quantity + delta
    if (newQuantity < 1) {
      removeItem.mutate(item.productId)
    } else if (newQuantity <= item.currentStock) {
      updateItem.mutate({ productId: item.productId, quantity: newQuantity })
    }
  }

  const isUpdating = updateItem.isPending || removeItem.isPending
  const maxQty = item.currentStock

  return (
    <div className="flex items-start gap-4 border-b py-4 last:border-0">
      {/* Product image placeholder */}
      <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-muted to-muted/70">
        <p className="text-[10px] font-medium text-muted-foreground">{item.sku}</p>
      </div>

      {/* Product details */}
      <div className="flex flex-1 flex-col gap-1">
        <h4 className="font-semibold leading-tight">{item.productNameSi || item.productName}</h4>
        <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>
        <p className="text-sm font-bold text-primary">{formatCurrency(item.unitPrice)}</p>
        {item.currentStock < 10 && (
          <p className="text-xs text-destructive">Only {item.currentStock} left in stock</p>
        )}
      </div>

      {/* Quantity controls */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => handleQuantityChange(-1)}
          disabled={isUpdating}
        >
          <Minus className="h-4 w-4" />
        </Button>

        <span className="w-8 text-center font-medium">{item.quantity}</span>

        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => handleQuantityChange(1)}
          disabled={isUpdating || item.quantity >= maxQty}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Item total */}
      <div className="flex flex-col items-end gap-2">
        <p className="font-semibold">{formatCurrency(item.totalPrice)}</p>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => removeItem.mutate(item.productId)}
          disabled={isUpdating}
        >
          {removeItem.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  )
}

export default function CartPage() {
  const navigate = useNavigate()
  const { data: cart, isLoading, error } = useCart()
  const clearCart = useClearCart()

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <Card className="mx-auto max-w-2xl border-destructive/30 bg-destructive/5">
        <CardContent className="py-8 text-center">
          <p className="text-destructive">Failed to load cart. Please try again.</p>
          <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  const hasItems = cart && cart.items.length > 0

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Shopping Cart</h1>
          <p className="text-sm text-muted-foreground">
            {hasItems ? `${cart.itemCount} item${cart.itemCount !== 1 ? 's' : ''} in your cart` : 'Your cart is empty'}
          </p>
        </div>

        {hasItems && (
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => clearCart.mutate()}
            disabled={clearCart.isPending}
          >
            {clearCart.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Clear cart
          </Button>
        )}
      </div>

      {/* Empty state */}
      {!hasItems && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center gap-4 py-16 text-center">
            <ShoppingCart className="h-12 w-12 text-muted-foreground" />
            <div>
              <h3 className="text-lg font-semibold">Your cart is empty</h3>
              <p className="text-sm text-muted-foreground">Add some products to get started</p>
            </div>
            <Button asChild>
              <Link to="/" className="gap-2">
                <ShoppingBag className="h-4 w-4" />
                Continue Shopping
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Cart items */}
      {hasItems && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Items list */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Items</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {cart.items.map((item) => (
                <CartItemRow key={item.id} item={item} />
              ))}
            </CardContent>
          </Card>

          {/* Order summary */}
          <Card className="h-fit">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal ({cart.itemCount} items)</span>
                <span>{formatCurrency(cart.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Shipping</span>
                <span className="text-secondary">Free</span>
              </div>
              <hr />
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span className="text-lg text-primary">{formatCurrency(cart.subtotal)}</span>
              </div>
            </CardContent>
            <CardFooter className="flex-col gap-2">
              <Button className="w-full" onClick={() => navigate('/checkout')}>
                Proceed to Checkout
              </Button>
              <Button variant="outline" className="w-full" asChild>
                <Link to="/">Continue Shopping</Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  )
}
