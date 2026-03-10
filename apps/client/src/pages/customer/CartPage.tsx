import { Link, useNavigate } from 'react-router-dom'
import { Loader2, Minus, Plus, ShoppingBag, ShoppingCart, Sparkles, Tag, Trash2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { useCart, useUpdateCartItem, useRemoveFromCart, useClearCart, useAddToCart, type CartItem } from '@/hooks/useCart'
import { useLanguageStore } from '@/stores/appStore'
import { formatCurrency } from '@/lib/utils'
import apiClient from '@/lib/api-client'
import { API_ENDPOINTS } from '@/lib/constants'
import type { Language } from '@/types/api'

// ── Types ─────────────────────────────────────────────────

interface CartRec {
  storefront_product_id: string
  product_name: string
  category: string
  brand: string
  price: number
  co_buyer_count: number
  confidence_score: number
  because_cart_items: string[]
}

interface CartRecsResponse {
  success: boolean
  recommendations: CartRec[] | null
  cart_matched_count: number
  total: number
  error?: string
}

// ── Cart Recommendations Panel ─────────────────────────────

function CartRecommendations({ cartProductIds }: { cartProductIds: string[] }) {
  const addToCart = useAddToCart()

  const { data, isLoading } = useQuery<CartRecsResponse>({
    queryKey: ['cart-recommendations', ...cartProductIds.slice().sort()],
    queryFn: async () => {
      const res = await apiClient.post<CartRecsResponse>(
        API_ENDPOINTS.CART_RECOMMENDATIONS,
        { productIds: cartProductIds, limit: 8 },
      )
      return res.data
    },
    enabled: cartProductIds.length > 0,
    staleTime: 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  })

  const recs = (!isLoading && data?.success && data.recommendations) ? data.recommendations : []
  if (isLoading || recs.length === 0) return null

  return (
    <div className="mt-2">
      {/* Section header */}
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-100">
          <Sparkles className="h-4 w-4 text-sky-600" />
        </div>
        <div>
          <h2 className="text-base font-bold text-gray-900">Frequently Bought Together</h2>
          <p className="text-xs text-gray-400">Customers who bought items in your cart also picked these</p>
        </div>
      </div>

      {/* Product grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {recs.map(rec => {
          const alreadyInCart = cartProductIds.includes(rec.storefront_product_id)
          const pct = Math.round(rec.confidence_score * 100)

          return (
            <div
              key={rec.storefront_product_id}
              className="flex flex-col justify-between rounded-2xl border border-sky-200/80 bg-gradient-to-br from-white to-sky-50 p-4 shadow-sm transition-all hover:shadow-md hover:border-sky-300"
            >
              {/* Category tag */}
              <div>
                <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-700">
                  <Tag className="h-3 w-3" />
                  {rec.category}
                </span>

                <h3 className="mt-2 text-sm font-bold text-gray-900 leading-tight line-clamp-2">
                  {rec.product_name}
                </h3>
                {rec.brand && (
                  <p className="mt-0.5 text-xs text-gray-400">{rec.brand}</p>
                )}

                <p className="mt-2 text-base font-extrabold text-gray-900">
                  {formatCurrency(rec.price)}
                </p>

                {/* Match strength */}
                <div className="mt-2">
                  <div className="h-1 w-full rounded-full bg-gray-100">
                    <div
                      className="h-1 rounded-full bg-sky-400 transition-all"
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                  <p className="mt-0.5 text-[10px] text-gray-400">
                    {pct}% match · {rec.co_buyer_count} shopper{rec.co_buyer_count !== 1 ? 's' : ''}
                  </p>
                </div>

                {/* Because of */}
                {rec.because_cart_items.length > 0 && (
                  <p className="mt-1.5 text-[10px] text-gray-400 line-clamp-1">
                    With: {rec.because_cart_items.join(', ')}
                  </p>
                )}
              </div>

              {/* Add to cart button */}
              <Button
                size="sm"
                variant={alreadyInCart ? 'outline' : 'default'}
                className={`mt-3 w-full text-xs ${alreadyInCart ? '' : 'bg-sky-600 hover:bg-sky-700 text-white border-0'}`}
                disabled={alreadyInCart || addToCart.isPending}
                onClick={() => {
                  if (!alreadyInCart) addToCart.mutate({ productId: rec.storefront_product_id })
                }}
              >
                {addToCart.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : alreadyInCart ? (
                  'In Cart'
                ) : (
                  'Add to Cart'
                )}
              </Button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function CartItemRow({ item, language }: { item: CartItem; language: Language }) {
  const updateItem = useUpdateCartItem()
  const removeItem = useRemoveFromCart()
  const displayName = language === 'si' && item.productNameSi ? item.productNameSi : item.productName

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
        <h4 className="font-semibold leading-tight">{displayName}</h4>
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
  const { language } = useLanguageStore()

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

      {/* Cart items + order summary */}
      {hasItems && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Items list */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Items</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {cart.items.map((item) => (
                <CartItemRow key={item.id} item={item} language={language} />
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

      {/* Frequently bought together */}
      {hasItems && <CartRecommendations cartProductIds={cart!.items.map(i => i.productId)} />}
    </div>
  )
}
