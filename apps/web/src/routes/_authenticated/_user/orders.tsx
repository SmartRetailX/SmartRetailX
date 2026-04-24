import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { AlertCircle, PackageCheck } from 'lucide-react';

import { useOrdersQuery, useStoreMutations } from '@/hooks';
import type { OrderStatus } from '@/types/store';
import { PageContainer } from '@/components/partials/container/page-container';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';

export const Route = createFileRoute('/_authenticated/_user/orders')({
  component: RouteComponent,
});

function RouteComponent() {
  const [status, setStatus] = useState<OrderStatus | ''>('');
  const ordersQuery = useOrdersQuery({ status });
  const { cancelOrder } = useStoreMutations();
  const orders = ordersQuery.data?.data?.orders ?? [];

  return (
    <PageContainer>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Orders</h1>
            <p className="text-sm text-muted-foreground">
              Track placed orders and cancel pending ones when needed.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant={status === '' ? 'default' : 'outline'} onClick={() => setStatus('')}>
              All
            </Button>
            {(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'] as OrderStatus[]).map((item) => (
              <Button key={item} variant={status === item ? 'default' : 'outline'} onClick={() => setStatus(item)}>
                {item}
              </Button>
            ))}
          </div>
        </div>

        {ordersQuery.error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Unable to load orders</AlertTitle>
            <AlertDescription>{(ordersQuery.error as Error).message}</AlertDescription>
          </Alert>
        )}

        {ordersQuery.isLoading ? (
          <div className="flex min-h-56 items-center justify-center rounded-3xl border border-dashed">
            <Spinner className="h-6 w-6" />
          </div>
        ) : orders.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex min-h-56 flex-col items-center justify-center gap-4 text-center">
              <PackageCheck className="h-10 w-10 text-muted-foreground" />
              <div>
                <h2 className="text-xl font-semibold">No orders yet</h2>
                <p className="text-sm text-muted-foreground">
                  Your placed orders will appear here once checkout is complete.
                </p>
              </div>
              <Button onClick={() => window.location.assign('/')}>Shop Now</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {orders.map((order) => (
              <Card key={order.id}>
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <CardTitle>{order.orderNumber}</CardTitle>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Placed {new Date(order.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <Badge variant={order.status === 'cancelled' ? 'destructive' : 'secondary'}>
                      {order.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-4">
                  <div>
                    <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Items</div>
                    <div className="mt-1 font-semibold">{order.itemCount}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Subtotal</div>
                    <div className="mt-1 font-semibold">${order.subtotal.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Total</div>
                    <div className="mt-1 font-semibold">${order.total.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Last update</div>
                    <div className="mt-1 font-semibold">{new Date(order.updatedAt).toLocaleDateString()}</div>
                  </div>
                </CardContent>
                <CardFooter className="justify-between gap-3">
                  <span className="text-sm text-muted-foreground">Order ID: {order.id}</span>
                  {(order.status === 'pending' || order.status === 'confirmed') && (
                    <Button
                      variant="outline"
                      disabled={cancelOrder.isPending}
                      onClick={() => cancelOrder.mutate(order.id)}
                    >
                      Cancel Order
                    </Button>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
