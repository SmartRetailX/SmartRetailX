import { Link } from 'react-router-dom'
import { Calendar, ChevronRight, Loader2, Package, ShoppingBag } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useOrders, type Order } from '@/hooks/useOrders'
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
        'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium',
        style.bg,
        style.text,
      )}
    >
      {style.label}
    </span>
  )
}

function OrderCard({ order, language }: { order: Order; language: Language }) {
  const createdAt = new Date(order.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
  const previewItems = (order.items || []).slice(0, 2)

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="p-0">
        <Link to={`/orders/${order.id}`} className="block p-4">
          {/* Header */}
          <div className="mb-3 flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-sm font-semibold">{order.orderNumber}</p>
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {createdAt}
              </p>
            </div>
            <StatusBadge status={order.status} />
          </div>

          {/* Items preview */}
          <div className="mb-3 space-y-1">
            {previewItems.length > 0 ? (
              previewItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between text-sm">
                  <span className="flex-1 truncate text-foreground">
                    {item.quantity}x {language === 'si' && item.productNameSi ? item.productNameSi : item.productName}
                  </span>
                  <span className="text-muted-foreground">{formatCurrency(item.totalPrice)}</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground">
                {order.itemCount} item{order.itemCount === 1 ? '' : 's'}
              </p>
            )}
            {(order.items || []).length > 2 && (
              <p className="text-xs text-muted-foreground">
                +{order.items.length - 2} more item{order.items.length - 2 > 1 ? 's' : ''}
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t pt-3">
            <div>
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="font-semibold text-primary">{formatCurrency(order.totalAmount)}</p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </Link>
      </CardContent>
    </Card>
  )
}

export default function OrdersPage() {
  const { data, isLoading, error } = useOrders()
  const { language } = useLanguageStore()

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[#0d7f44]" />
      </div>
    )
  }

  if (error) {
    return (
      <Card className="mx-auto max-w-2xl border-destructive/30 bg-destructive/5">
        <CardContent className="py-8 text-center">
          <p className="text-destructive">Failed to load orders. Please try again.</p>
          <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  const ordersList = data?.orders || []
  const hasOrders = ordersList.length > 0

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Orders</h1>
          <p className="text-sm text-muted-foreground">
            {hasOrders
              ? `You have ${ordersList.length} order${ordersList.length !== 1 ? 's' : ''}`
              : 'No orders yet'}
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link to="/" className="gap-2">
            <ShoppingBag className="h-4 w-4" />
            Continue Shopping
          </Link>
        </Button>
      </div>

      {/* Empty state */}
      {!hasOrders && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center gap-4 py-16 text-center">
            <Package className="h-12 w-12 text-muted-foreground" />
            <div>
              <h3 className="text-lg font-semibold">No orders yet</h3>
              <p className="text-sm text-muted-foreground">
                Once you place an order, it will appear here
              </p>
            </div>
            <Button asChild>
              <Link to="/">Start Shopping</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Orders list */}
      {hasOrders && (
        <div className="grid gap-4 sm:grid-cols-2">
          {ordersList.map((order) => (
            <OrderCard key={order.id} order={order} language={language} />
          ))}
        </div>
      )}
    </div>
  )
}
