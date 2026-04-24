import { useMemo } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { AlertCircle, Package, ShieldCheck, ShoppingBag, Truck } from 'lucide-react';

import { useAuth, useCatalogCategoriesQuery, useCatalogProductsQuery, useStoreMutations } from '@/hooks';
import { PageContainer } from '@/components/partials/container/page-container';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';

export const Route = createFileRoute('/')({
  component: RouteComponent,
});

function RouteComponent() {
  const searchParams = new URLSearchParams(window.location.search);
  const search = searchParams.get('search') || '';
  const category = searchParams.get('category') || '';
  const { user, signOut } = useAuth();
  const productsQuery = useCatalogProductsQuery({ search, category, limit: 24 });
  const categoriesQuery = useCatalogCategoriesQuery();
  const { addToCart } = useStoreMutations();

  const products = productsQuery.data?.data?.products ?? [];
  const categories = categoriesQuery.data?.data?.categories ?? [];
  const heroMetrics = useMemo(
    () => [
      { label: 'Live Catalog', value: `${productsQuery.data?.data?.pagination.total ?? 0}+ items`, icon: Package },
      { label: 'Fast Checkout', value: 'Cart to order in one flow', icon: ShoppingBag },
      { label: 'Order Tracking', value: 'Status updates from pending to delivered', icon: Truck },
    ],
    [productsQuery.data?.data?.pagination.total],
  );

  return (
    <PageContainer>
      <div className="space-y-8">
        <section className="overflow-hidden rounded-3xl bg-[linear-gradient(135deg,#0a7a43_0%,#26a96c_48%,#effbf4_100%)] px-6 py-8 text-white shadow-lg md:px-10 md:py-12">
          <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
            <div className="space-y-4">
              <Badge className="bg-white/15 px-3 py-1 text-white">Operational storefront</Badge>
              <h1 className="max-w-2xl text-4xl font-black tracking-tight md:text-5xl">
                Stock, cart, checkout, and admin inventory flows are now connected.
              </h1>
              <p className="max-w-2xl text-base text-white/90 md:text-lg">
                Browse the live catalog, filter by category, add items to cart, place orders, and manage products and order statuses from the admin dashboard.
              </p>
              <div className="flex flex-wrap gap-3">
                {user?.role === 'admin' ? (
                  <Button className="bg-white text-primary hover:bg-white/90" onClick={() => window.location.assign('/admin')}>
                    Open Admin Dashboard
                  </Button>
                ) : (
                  <Button className="bg-white text-primary hover:bg-white/90" onClick={() => window.location.assign('/cart')}>
                    Open Cart
                  </Button>
                )}
                {user ? (
                  <Button variant="outline" className="border-white/40 bg-transparent text-white hover:bg-white/10" onClick={() => signOut()}>
                    Sign Out
                  </Button>
                ) : (
                  <Button variant="outline" className="border-white/40 bg-transparent text-white hover:bg-white/10" onClick={() => window.location.assign('/sign-in')}>
                    Sign In to Buy
                  </Button>
                )}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              {heroMetrics.map(({ icon: Icon, label, value }) => (
                <div key={label} className="rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
                  <Icon className="mb-3 h-5 w-5" />
                  <div className="text-sm text-white/80">{label}</div>
                  <div className="text-lg font-bold">{value}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {(search || category) && (
          <div className="flex flex-wrap items-center gap-3">
            {search && <Badge variant="outline">Search: {search}</Badge>}
            {category && <Badge variant="outline">Category: {category}</Badge>}
            <Button variant="ghost" onClick={() => window.location.assign('/')}>
              Clear Filters
            </Button>
          </div>
        )}

        {productsQuery.error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Catalog unavailable</AlertTitle>
            <AlertDescription>
              {(productsQuery.error as Error).message}
            </AlertDescription>
          </Alert>
        )}

        <section className="grid gap-6 lg:grid-cols-[240px_1fr]">
          <Card className="h-fit">
            <CardHeader>
              <CardTitle>Browse by category</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant={!category ? 'default' : 'outline'} className="w-full justify-start" onClick={() => window.location.assign('/')}>
                All categories
              </Button>
              {categories.map((item) => (
                <Button
                  key={item}
                  variant={category === item ? 'default' : 'outline'}
                  className="w-full justify-start"
                  onClick={() => window.location.assign(`/?category=${encodeURIComponent(item)}`)}
                >
                  {item}
                </Button>
              ))}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold">Catalog</h2>
                <p className="text-sm text-muted-foreground">
                  {productsQuery.data?.data?.pagination.total ?? 0} products ready for checkout
                </p>
              </div>
              {user?.role === 'admin' && (
                <Badge className="gap-2">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Admin mode
                </Badge>
              )}
            </div>

            {productsQuery.isLoading ? (
              <div className="flex min-h-56 items-center justify-center rounded-3xl border border-dashed">
                <Spinner className="h-6 w-6" />
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {products.map((product) => (
                  <Card key={product.id} className="border-border/60">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <CardTitle>{product.name}</CardTitle>
                          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                            {product.sku}
                          </p>
                        </div>
                        <Badge variant={product.status === 'OUT_OF_STOCK' ? 'destructive' : 'secondary'}>
                          {product.status.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="text-sm text-muted-foreground">
                        {product.description || 'Fresh catalog item ready to sell.'}
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-2xl font-bold">${product.price.toFixed(2)}</div>
                        <div className="text-sm text-muted-foreground">Stock {product.currentStock}</div>
                      </div>
                    </CardContent>
                    <CardFooter className="justify-between gap-3">
                      <div className="text-xs text-muted-foreground">{product.category}</div>
                      {user?.role === 'admin' ? (
                        <Button variant="outline" onClick={() => window.location.assign('/admin')}>
                          Manage
                        </Button>
                      ) : (
                        <Button
                          disabled={!user || product.currentStock <= 0 || addToCart.isPending}
                          onClick={() => addToCart.mutate({ productId: product.id })}
                        >
                          {addToCart.isPending ? 'Adding...' : 'Add to Cart'}
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </PageContainer>
  );
}
