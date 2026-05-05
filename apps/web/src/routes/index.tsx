import { useEffect, useRef, useState } from 'react';
import {
  useAuth,
  useCatalogCategoriesQuery,
  useInfiniteCatalogProductsQuery,
  useStoreMutations,
} from '@/hooks';
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { AlertCircle, ImageOff, Package, ShieldCheck, ShoppingBag, Truck } from 'lucide-react';

import { PageContainer } from '@/components/partials/container/page-container';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';

type CatalogRouteSearch = {
  search?: string;
  category?: string;
};

function normalizeSearchValue(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function buildCatalogSearch(search?: string, category?: string): CatalogRouteSearch {
  return {
    ...(search ? { search } : {}),
    ...(category ? { category } : {}),
  };
}

export const Route = createFileRoute('/')({
  beforeLoad: ({ context }) => {
    if (context.auth.user?.role === 'admin') {
      throw redirect({
        to: '/admin',
        replace: true,
      });
    }
  },
  validateSearch: (search): CatalogRouteSearch => ({
    search: normalizeSearchValue(search.search),
    category: normalizeSearchValue(search.category),
  }),
  component: RouteComponent,
});

function ProductImage({ imageUrl, name }: { imageUrl: string | null; name: string }) {
  const [hasError, setHasError] = useState(false);
  const shouldShowImage = Boolean(imageUrl) && !hasError;

  if (!shouldShowImage) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <div className="flex flex-col items-center gap-2 text-sm">
          <ImageOff className="h-6 w-6" />
          <span>Image unavailable</span>
        </div>
      </div>
    );
  }

  return (
    <img
      src={imageUrl || undefined}
      alt={name}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className="h-full w-full object-cover"
    />
  );
}

function RouteComponent() {
  const navigate = useNavigate({ from: Route.fullPath });
  const { search, category } = Route.useSearch() as CatalogRouteSearch;
  const { user, signOut } = useAuth();
  const productsQuery = useInfiniteCatalogProductsQuery({ search, category, limit: 24 });
  const categoriesQuery = useCatalogCategoriesQuery();
  const { addToCart } = useStoreMutations();
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [pendingCartId, setPendingCartId] = useState<string | null>(null);

  const products = productsQuery.data?.pages.flatMap((page) => page.data.products) ?? [];
  const categories = categoriesQuery.data?.data?.categories ?? [];
  const totalProducts = productsQuery.data?.pages[0]?.data.pagination.total ?? 0;
  const heroMetrics = [
    { label: 'Live Catalog', value: `${totalProducts}+ items`, icon: Package },
    { label: 'Fast Checkout', value: 'Cart to order in one flow', icon: ShoppingBag },
    { label: 'Order Tracking', value: 'Status updates from pending to delivered', icon: Truck },
  ];

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node || !productsQuery.hasNextPage) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting) && !productsQuery.isFetchingNextPage) {
          void productsQuery.fetchNextPage();
        }
      },
      { rootMargin: '240px 0px' },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [
    productsQuery.fetchNextPage,
    productsQuery.hasNextPage,
    productsQuery.isFetchingNextPage,
    totalProducts,
  ]);

  const updateFilters = (next: CatalogRouteSearch) =>
    navigate({
      to: '/',
      search: buildCatalogSearch(next.search, next.category),
    });

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
                Browse the live catalog, filter by category, add items to cart, place orders, and
                manage products and order statuses from the admin dashboard.
              </p>
              <div className="flex flex-wrap gap-3">
                {user?.role === 'admin' ? (
                  <Button
                    className="bg-white text-primary hover:bg-white/90"
                    onClick={() => window.location.assign('/admin')}
                  >
                    Open Admin Dashboard
                  </Button>
                ) : (
                  <Button
                    className="bg-white text-primary hover:bg-white/90"
                    onClick={() => window.location.assign('/cart')}
                  >
                    Open Cart
                  </Button>
                )}
                {user ? (
                  <Button
                    variant="outline"
                    className="border-white/40 bg-transparent text-white hover:bg-white/10"
                    onClick={() => signOut()}
                  >
                    Sign Out
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="border-white/40 bg-transparent text-white hover:bg-white/10"
                    onClick={() => window.location.assign('/sign-in')}
                  >
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
            <Button variant="ghost" onClick={() => void updateFilters({})}>
              Clear Filters
            </Button>
          </div>
        )}

        {productsQuery.error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Catalog unavailable</AlertTitle>
            <AlertDescription>{(productsQuery.error as Error).message}</AlertDescription>
          </Alert>
        )}

        <section className="grid gap-6 lg:grid-cols-[240px_1fr]">
          <Card className="h-fit">
            <CardHeader>
              <CardTitle>Browse by category</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant={!category ? 'default' : 'outline'}
                className="w-full justify-start"
                onClick={() => void updateFilters({ search })}
              >
                All categories
              </Button>
              {categories.map((item) => (
                <Button
                  key={item}
                  variant={category === item ? 'default' : 'outline'}
                  className="w-full justify-start"
                  onClick={() => void updateFilters({ search, category: item })}
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
                  {totalProducts} products ready for checkout
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
            ) : products.length === 0 ? (
              <div className="flex min-h-56 flex-col items-center justify-center rounded-3xl border border-dashed px-6 text-center">
                <div className="text-lg font-semibold">No products found</div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Try a different category or clear the current filters.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {products.map((product) => (
                    <Card key={product.id} className="overflow-hidden border-border/60">
                      <div className="relative aspect-[4/3] bg-muted/40">
                        <ProductImage imageUrl={product.imageUrl} name={product.name} />
                      </div>
                      <CardHeader>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <CardTitle>{product.name}</CardTitle>
                            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                              {product.sku}
                            </p>
                          </div>
                          <Badge
                            variant={
                              product.status === 'OUT_OF_STOCK' ? 'destructive' : 'secondary'
                            }
                          >
                            {product.status.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="text-sm text-muted-foreground">
                          {product.description || 'Fresh catalog item ready to sell.'}
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="text-2xl font-bold">Rs. {product.price.toFixed(2)}</div>
                          <div className="text-sm text-muted-foreground">
                            Stock {product.currentStock}
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="justify-between gap-3">
                        <div className="text-xs text-muted-foreground">{product.category}</div>
                        {user?.role === 'admin' ? (
                          <Button
                            variant="outline"
                            onClick={() => window.location.assign('/admin')}
                          >
                            Manage
                          </Button>
                        ) : (
                          <Button
                            disabled={!user || product.currentStock <= 0 || pendingCartId === product.id}
                            onClick={() => {
                              setPendingCartId(product.id);
                              addToCart.mutate(
                                { productId: product.id },
                                { onSettled: () => setPendingCartId(null) },
                              );
                            }}
                          >
                            {pendingCartId === product.id ? 'Adding...' : 'Add to Cart'}
                          </Button>
                        )}
                      </CardFooter>
                    </Card>
                  ))}
                </div>

                <div ref={loadMoreRef} className="flex min-h-16 items-center justify-center">
                  {productsQuery.isFetchingNextPage ? (
                    <Spinner className="h-6 w-6" />
                  ) : productsQuery.hasNextPage ? (
                    <p className="text-sm text-muted-foreground">Scroll to load more products</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      You&apos;ve reached the end of the catalog
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </PageContainer>
  );
}
