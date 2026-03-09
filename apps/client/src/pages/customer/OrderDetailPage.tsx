import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Calendar, Loader2, MapPin, Package, XCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useOrder, useCancelOrder, type OrderItem } from '@/hooks/useOrders'
import { useLanguageStore } from '@/stores/appStore'
import { cn, formatCurrency } from '@/lib/utils'
import type { Language } from '@/types/api'

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: 'bg-accent', text: 'text-accent-foreground', label: 'Pending' },
  confirmed: { bg: 'bg-primary/10', text: 'text-primary', label: 'Confirmed' },
  processing: { bg: 'bg-secondary/15', text: 'text-secondary', label: 'Processing' },
  shipped: { bg: 'bg-primary/10', text: 'text-primary', label: 'Shipped' },
  delivered: { bg: 'bg-secondary/15', text: 'text-secondary', label: 'Delivered' },
  cancelled: { bg: 'bg-destructive/10', text: 'text-destructive', label: 'Cancelled' },
  refunded: { bg: 'bg-muted', text: 'text-muted-foreground', label: 'Refunded' },
}

function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.pending
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-3 py-1 text-sm font-medium',
        style.bg,
        style.text,
      )}
    >
      {style.label}
    </span>
  )
}

function OrderItemRow({ item, language }: { item: OrderItem; language: Language }) {
  const displayName = language === 'si' && item.productNameSi ? item.productNameSi : item.productName

  return (
    <div className="flex items-center gap-4 border-b py-4 last:border-0">
      {/* Product image placeholder */}
      <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-muted to-muted/70">
        <p className="text-[9px] font-medium text-muted-foreground">{item.sku}</p>
      </div>

      {/* Product details */}
      <div className="flex-1">
        <h4 className="font-semibold">{displayName}</h4>
        <p className="text-sm text-muted-foreground">SKU: {item.sku}</p>
        <p className="text-sm text-muted-foreground">
          {formatCurrency(item.unitPrice)} × {item.quantity}
        </p>
      </div>

      {/* Item total */}
      <p className="font-semibold">{formatCurrency(item.totalPrice)}</p>
    </div>
  )
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: order, isLoading, error } = useOrder(id || '')
  const cancelOrder = useCancelOrder()
  const [cancelError, setCancelError] = useState<string | null>(null)
  const { language } = useLanguageStore()

  const handleCancel = async () => {
    if (!id) return

    const confirmed = window.confirm('Are you sure you want to cancel this order?')
    if (!confirmed) return

    setCancelError(null)
    try {
      await cancelOrder.mutateAsync(id)
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : 'Failed to cancel order')
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[#0d7f44]" />
      </div>
    )
  }

  if (error || !order) {
    return (
      <Card className="mx-auto max-w-2xl border-destructive/30 bg-destructive/5">
        <CardContent className="py-8 text-center">
          <p className="text-destructive">Order not found or failed to load.</p>
          <Button variant="outline" className="mt-4" asChild>
            <Link to="/orders">Back to Orders</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  const createdAt = new Date(order.createdAt).toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const canCancel = ['pending', 'confirmed'].includes(order.status)

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Back link */}
      <Link
        to="/orders"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Orders
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Order {order.orderNumber}</h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            {createdAt}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-3">
            <StatusBadge status={order.status} />
            {canCancel && (
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={handleCancel}
                disabled={cancelOrder.isPending}
              >
                {cancelOrder.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <XCircle className="mr-2 h-4 w-4" />
                )}
                Cancel Order
              </Button>
            )}
          </div>
          {cancelError && <p className="text-sm text-destructive">{cancelError}</p>}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Order items */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Order Items
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {order.items.map((item) => (
              <OrderItemRow key={item.id} item={item} language={language} />
            ))}
          </CardContent>
        </Card>

        {/* Order summary */}
        <div className="space-y-6">
          {/* Totals */}
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Shipping</span>
                <span>{formatCurrency(order.shippingFee)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Discount</span>
                  <span className="text-secondary">-{formatCurrency(order.discount)}</span>
                </div>
              )}
              <hr />
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span className="text-lg text-primary">{formatCurrency(order.totalAmount)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Shipping address */}
          {order.shippingAddress && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Shipping Address
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-foreground">{order.shippingAddress}</p>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {order.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Order Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-foreground">{order.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
