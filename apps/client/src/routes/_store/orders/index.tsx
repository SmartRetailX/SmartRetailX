import { useAuth } from '@/contexts/auth-context';
import { useOrdersQuery } from '@/queries/order.queries';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { CheckCircle2, Clock, Package } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export const Route = createFileRoute('/_store/orders/')({
  beforeLoad: ({ context, location }) => {
    if (!context.auth.isAuthenticated) {
      throw redirect({
        to: '/login',
        search: { redirect: location.href },
      });
    }
  },
  component: OrdersPage,
});

function OrdersPage() {
  const { user } = useAuth();
  const { data, isLoading: loading } = useOrdersQuery({ page: 1, limit: 50 });

  if (loading)
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-[#00A651]"></div>
      </div>
    );

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      <div className="border-b pb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
          My Orders {user?.role === 'admin' && <span className="text-[#00A651]">(Admin View)</span>}
        </h1>
        <p className="text-muted-foreground mt-2 text-lg">
          Track your recent purchases, view delivery history and reorder your favorites.
        </p>
      </div>

      <div className="space-y-8">
        {!data?.items || data.items.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-300 shadow-sm">
            <div className="h-24 w-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Package className="h-12 w-12 text-gray-300" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No orders found</h3>
            <p className="text-gray-500 text-lg">
              You haven't placed any orders yet. Time to fill your pantry!
            </p>
          </div>
        ) : (
          data.items.map((order) => (
            <Card
              key={order.id}
              className="overflow-hidden border-border bg-white shadow-sm hover:shadow-md transition-shadow rounded-2xl"
            >
              <CardHeader className="bg-gray-50/50 border-b border-gray-100 p-5 md:px-8 md:py-5 flex flex-col md:flex-row gap-5 md:items-center justify-between">
                <div className="grid grid-cols-2 md:flex md:gap-10 gap-5 text-sm">
                  <div>
                    <p className="text-gray-500 uppercase tracking-widest text-[11px] font-bold mb-1.5">
                      Order Placed
                    </p>
                    <p className="font-bold text-gray-900 text-[15px]">
                      {order.createdAt.toLocaleDateString('en-US', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 uppercase tracking-widest text-[11px] font-bold mb-1.5">
                      Total Amount
                    </p>
                    <p className="font-bold text-gray-900 text-[15px]">
                      LKR {order.totalAmount.toFixed(2)}
                    </p>
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <p className="text-gray-500 uppercase tracking-widest text-[11px] font-bold mb-1.5">
                      Ship To
                    </p>
                    <p className="font-bold text-[#00A651] truncate max-w-[150px] cursor-pointer hover:underline text-[15px]">
                      {order.shippingAddress?.fullName || 'My Home'}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col md:items-end gap-2">
                  <p className="text-sm text-gray-500 font-medium">
                    Order # <span className="font-bold text-gray-900">{order.orderNumber}</span>
                  </p>
                  <div className="flex gap-2">
                    <OrderStatusBadge status={order.status} />
                    <Badge
                      variant={order.paymentStatus === 'paid' ? 'default' : 'secondary'}
                      className={
                        order.paymentStatus === 'paid'
                          ? 'bg-emerald-100/50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                          : 'bg-gray-100 text-gray-600 border border-gray-200'
                      }
                    >
                      {order.paymentStatus.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-5 md:p-8 text-sm">
                <h4 className="font-bold text-gray-900 mb-6 text-lg flex items-center gap-2.5">
                  {order.status === 'delivered' ? (
                    <CheckCircle2 className="h-6 w-6 text-[#00A651]" />
                  ) : order.status === 'cancelled' ? (
                    <span className="h-6 w-6 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold">
                      !
                    </span>
                  ) : (
                    <Clock className="h-6 w-6 text-amber-500" />
                  )}
                  {order.status === 'delivered'
                    ? 'Delivered successfully'
                    : order.status === 'cancelled'
                      ? 'Order Cancelled'
                      : 'Arriving Soon'}
                </h4>

                <div className="space-y-6">
                  {order.items.slice(0, 3).map((item, index) => (
                    <div key={index} className="flex gap-5 items-center">
                      <div className="h-20 w-20 bg-gray-50/50 rounded-xl border border-gray-100 flex items-center justify-center shrink-0 p-2">
                        <img
                          src={
                            item.product?.imageUrl ||
                            'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=150'
                          }
                          alt=""
                          className="h-full w-full object-contain mix-blend-multiply"
                        />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-gray-900 text-base mb-1">
                          {item.product?.name || 'Unknown Product'}
                        </p>
                        <p className="text-gray-500 font-medium">
                          Qty: {item.quantity} ×{' '}
                          <span className="text-gray-900">
                            LKR {item.priceAtPurchase?.toFixed(2) || '0.00'}
                          </span>
                        </p>
                        <div className="mt-2.5 flex gap-4">
                          <span className="text-[#00A651] font-bold text-sm cursor-pointer hover:underline">
                            Buy it again
                          </span>
                          <span className="text-gray-500 font-semibold text-sm cursor-pointer hover:text-gray-900 hover:underline">
                            View item details
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {order.items.length > 3 && (
                    <div className="pt-2 border-t border-dashed">
                      <p className="text-[#00A651] font-bold cursor-pointer hover:text-green-700 transition-colors inline-block hover:underline">
                        View {order.items.length - 3} more items from this order
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

function OrderStatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'delivered':
      return (
        <Badge className="bg-green-100 text-[#00A651] hover:bg-green-200 border border-green-200">
          Delivered
        </Badge>
      );
    case 'shipped':
      return (
        <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200">
          Out for Delivery
        </Badge>
      );
    case 'processing':
    case 'confirmed':
      return (
        <Badge className="bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200">
          Processing
        </Badge>
      );
    case 'cancelled':
      return (
        <Badge className="bg-red-50 text-red-600 hover:bg-red-100 border border-red-200">
          Cancelled
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary" className="border border-gray-200">
          Pending
        </Badge>
      );
  }
}
