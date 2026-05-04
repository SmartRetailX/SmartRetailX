import { useState } from 'react';
import { useStoreMutations } from '@/hooks';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft, ImageOff, Package, ShoppingCart } from 'lucide-react';

import { PageContainer } from '@/components/partials/container/page-container';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { coreApi } from '@/lib/core-api';

export const Route = createFileRoute('/_authenticated/_user/products/$productId')({
  component: ProductDetailPage,
});

function ProductImage({ imageUrl, name }: { imageUrl: string | null; name: string }) {
  const [hasError, setHasError] = useState(false);
  const shouldShowImage = Boolean(imageUrl) && !hasError;

  if (!shouldShowImage) {
    return (
      <div className="flex h-full min-h-72 items-center justify-center bg-muted/50 text-muted-foreground">
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
      referrerPolicy="no-referrer"
      className="h-full min-h-72 w-full object-cover"
      onError={() => setHasError(true)}
    />
  );
}

function ProductDetailPage() {
  const { productId } = Route.useParams();
  const { addToCart } = useStoreMutations();

  const productQuery = useQuery({
    queryKey: ['product', productId],
    queryFn: async () => {
      const response = await coreApi.getProduct(productId);
      if (!response.data) {
        throw new Error(response.message || 'Product not found');
      }

      return response.data;
    },
  });

  const product = productQuery.data;

  return (
    <PageContainer>
      <div className="mx-auto max-w-6xl space-y-6">
        <Button asChild variant="ghost" className="gap-2 px-0">
          <Link to="/">
            <ArrowLeft className="h-4 w-4" />
            Back to catalog
          </Link>
        </Button>

        {productQuery.isLoading ? (
          <div className="flex min-h-[50vh] items-center justify-center rounded-lg border border-dashed">
            <Spinner className="h-6 w-6" />
          </div>
        ) : productQuery.error ? (
          <Alert variant="destructive">
            <Package className="h-4 w-4" />
            <AlertTitle>Product unavailable</AlertTitle>
            <AlertDescription>{(productQuery.error as Error).message}</AlertDescription>
          </Alert>
        ) : product ? (
          <section className="grid overflow-hidden rounded-lg border bg-card lg:grid-cols-[1fr_1.05fr]">
            <div className="bg-muted/30">
              <ProductImage imageUrl={product.imageUrl} name={product.name} />
            </div>

            <div className="space-y-6 p-6 lg:p-8">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={product.status === 'OUT_OF_STOCK' ? 'destructive' : 'secondary'}>
                    {product.status.replace(/_/g, ' ')}
                  </Badge>
                  <Badge variant="outline">{product.category}</Badge>
                </div>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">
                    {product.nameSi || product.name}
                  </h1>
                  {product.nameSi ? (
                    <p className="mt-1 text-sm text-muted-foreground">{product.name}</p>
                  ) : null}
                </div>
                <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                  {product.descriptionSi ||
                    product.description ||
                    'Fresh catalog item ready to sell.'}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border p-4">
                  <div className="text-xs text-muted-foreground">Price</div>
                  <div className="mt-1 text-xl font-bold">රු. {product.price.toFixed(2)}</div>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="text-xs text-muted-foreground">Stock</div>
                  <div className="mt-1 text-xl font-bold">{product.currentStock}</div>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="text-xs text-muted-foreground">SKU</div>
                  <div className="mt-1 break-all text-sm font-medium">{product.sku}</div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  disabled={product.currentStock <= 0 || addToCart.isPending}
                  onClick={() => addToCart.mutate({ productId: product.id })}
                  className="gap-2"
                >
                  <ShoppingCart className="h-4 w-4" />
                  {addToCart.isPending ? 'Adding...' : 'Add to Cart'}
                </Button>
                <Button asChild variant="outline">
                  <Link to="/cart">Open Cart</Link>
                </Button>
              </div>

              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">Brand</dt>
                  <dd className="font-medium">{product.brand || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Sinhala category</dt>
                  <dd className="font-medium">{product.categoryNameSi || 'N/A'}</dd>
                </div>
              </dl>
            </div>
          </section>
        ) : null}
      </div>
    </PageContainer>
  );
}
