import { useState } from 'react'
import {
  Calendar,
  Eye,
  Loader2,
  Package,
  Search,
  Truck,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { useAdminOrders, useAdminOrder, useUpdateOrderStatus, type Order, type OrderItem, type OrderStatus } from '@/hooks/useOrders'
import { cn, formatCurrency } from '@/lib/utils'

const ORDER_STATUSES = [
  { value: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'confirmed', label: 'Confirmed', color: 'bg-blue-100 text-blue-800' },
  { value: 'processing', label: 'Processing', color: 'bg-indigo-100 text-indigo-800' },
  { value: 'shipped', label: 'Shipped', color: 'bg-purple-100 text-purple-800' },
  { value: 'delivered', label: 'Delivered', color: 'bg-green-100 text-green-800' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-800' },
  { value: 'refunded', label: 'Refunded', color: 'bg-gray-100 text-gray-800' },
]

function StatusBadge({ status }: { status: string }) {
  const statusConfig = ORDER_STATUSES.find((s) => s.value === status) || ORDER_STATUSES[0]
  return (
    <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium', statusConfig.color)}>
      {statusConfig.label}
    </span>
  )
}

function StatusSelect({ order, onUpdate }: { order: Order; onUpdate: () => void }) {
  const updateStatus = useUpdateOrderStatus()
  const [error, setError] = useState<string | null>(null)

  const handleUpdate = async (newStatus: string) => {
    if (newStatus === order.status) return
    setError(null)
    try {
      await updateStatus.mutateAsync({ orderId: order.id, status: newStatus as OrderStatus })
      onUpdate()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status')
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={order.status} onValueChange={handleUpdate} disabled={updateStatus.isPending}>
        <SelectTrigger className="h-8 w-32">
          <SelectValue>{ORDER_STATUSES.find((s) => s.value === order.status)?.label || order.status}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {ORDER_STATUSES.map((status) => (
            <SelectItem key={status.value} value={status.value}>
              {status.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  )
}

function OrderDetailDialog({
  orderId,
  open,
  onOpenChange,
}: {
  orderId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { data: order, isLoading } = useAdminOrder(orderId || '')

  if (!orderId) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Order Details</DialogTitle>
          <DialogDescription>
            {order ? `Order ${order.orderNumber}` : 'Loading...'}
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        )}

        {order && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Order Number</p>
                <p className="font-mono font-semibold">{order.orderNumber}</p>
              </div>
              <div>
                <p className="text-gray-500">Status</p>
                <StatusBadge status={order.status} />
              </div>
              <div>
                <p className="text-gray-500">Created</p>
                <p>{new Date(order.createdAt).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-500">Total</p>
                <p className="font-semibold text-[#0d7f44]">{formatCurrency(order.totalAmount)}</p>
              </div>
            </div>

            {/* Shipping */}
            {order.shippingAddress && (
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="mb-1 text-xs font-medium text-gray-500">Shipping Address</p>
                <p className="text-sm">{order.shippingAddress}</p>
              </div>
            )}

            {/* Items */}
            <div>
              <p className="mb-2 text-sm font-medium">Items ({order.items.length})</p>
              <div className="max-h-48 space-y-2 overflow-y-auto">
                {order.items.map((item: OrderItem) => (
                  <div key={item.id} className="flex items-center justify-between rounded-lg border p-2 text-sm">
                    <div>
                      <p className="font-medium">{item.productNameSi || item.productName}</p>
                      <p className="text-xs text-gray-500">SKU: {item.sku}</p>
                    </div>
                    <div className="text-right">
                      <p>{item.quantity} × {formatCurrency(item.unitPrice)}</p>
                      <p className="font-medium">{formatCurrency(item.totalPrice)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {order.notes && (
              <div className="rounded-lg bg-amber-50 p-3">
                <p className="mb-1 text-xs font-medium text-gray-500">Order Notes</p>
                <p className="text-sm">{order.notes}</p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default function OrderManagementPage() {
  const { data, isLoading, error, refetch } = useAdminOrders()

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)

  const ordersList = data?.orders || []

  // Filtered orders
  const filteredOrders = ordersList.filter((order: Order) => {
    const matchesSearch =
      !searchTerm ||
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === 'all' || order.status === statusFilter

    return matchesSearch && matchesStatus
  })

  // Stats
  const stats = {
    total: ordersList.length,
    pending: ordersList.filter((o: Order) => o.status === 'pending').length,
    processing: ordersList.filter((o: Order) => ['confirmed', 'processing'].includes(o.status)).length,
    shipped: ordersList.filter((o: Order) => o.status === 'shipped').length,
    delivered: ordersList.filter((o: Order) => o.status === 'delivered').length,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Order Management</h1>
        <p className="mt-1 text-gray-500">View and manage customer orders</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-blue-100 p-2">
              <Package className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-gray-500">Total Orders</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-yellow-100 p-2">
              <Calendar className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.pending}</p>
              <p className="text-xs text-gray-500">Pending</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-indigo-100 p-2">
              <Package className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.processing}</p>
              <p className="text-xs text-gray-500">Processing</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-purple-100 p-2">
              <Truck className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.shipped}</p>
              <p className="text-xs text-gray-500">Shipped</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-green-100 p-2">
              <Package className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.delivered}</p>
              <p className="text-xs text-gray-500">Delivered</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-4 p-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search by order number..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {ORDER_STATUSES.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => refetch()}>
            Refresh
          </Button>
        </CardContent>
      </Card>

      {/* Orders table */}
      <Card>
        <CardHeader>
          <CardTitle>Orders ({filteredOrders.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[#0d7f44]" />
            </div>
          )}

          {error && (
            <div className="py-12 text-center">
              <p className="text-red-600">Failed to load orders</p>
              <Button variant="outline" className="mt-4" onClick={() => refetch()}>
                Retry
              </Button>
            </div>
          )}

          {!isLoading && filteredOrders.length === 0 && (
            <div className="py-12 text-center">
              <Package className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-gray-500">No orders found</p>
            </div>
          )}

          {!isLoading && filteredOrders.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 font-medium">Order</th>
                    <th className="pb-3 font-medium">Date</th>
                    <th className="pb-3 font-medium">Items</th>
                    <th className="pb-3 font-medium">Total</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order: Order) => (
                    <tr key={order.id} className="border-b last:border-0">
                      <td className="py-3">
                        <p className="font-mono font-semibold">{order.orderNumber}</p>
                      </td>
                      <td className="py-3 text-gray-600">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3">{order.items?.length || 0} items</td>
                      <td className="py-3 font-medium text-[#0d7f44]">
                        {formatCurrency(order.totalAmount)}
                      </td>
                      <td className="py-3">
                        <StatusSelect order={order} onUpdate={() => refetch()} />
                      </td>
                      <td className="py-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedOrderId(order.id)}
                        >
                          <Eye className="mr-1 h-4 w-4" />
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order detail dialog */}
      <OrderDetailDialog
        orderId={selectedOrderId}
        open={!!selectedOrderId}
        onOpenChange={(open) => !open && setSelectedOrderId(null)}
      />
    </div>
  )
}
