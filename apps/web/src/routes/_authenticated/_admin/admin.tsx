import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { AlertCircle, Boxes, PackagePlus, RefreshCw, ShieldCheck, Tags } from 'lucide-react';

import { useAdminCategoriesQuery, useAdminOrdersQuery, useAdminProductsQuery, useStoreMutations } from '@/hooks';
import { coreApi } from '@/lib/core-api';
import type { Category, OrderStatus, Product } from '@/types/store';
import { PageContainer } from '@/components/partials/container/page-container';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';

export const Route = createFileRoute('/_authenticated/_admin/admin')({
  component: RouteComponent,
});

function RouteComponent() {
  const [productSearch, setProductSearch] = useState('');
  const [orderSearch, setOrderSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [translationPending, setTranslationPending] = useState(false);
  const [productForm, setProductForm] = useState({
    sku: '',
    name: '',
    nameSi: '',
    categoryId: '',
    categoryName: '',
    description: '',
    descriptionSi: '',
    price: '0',
    stockQuantity: '0',
    imageUrl: '',
    isActive: true,
  });
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    nameSi: '',
  });
  const [stockForm, setStockForm] = useState({
    quantityChange: '0',
    balanceTo: '',
    note: '',
  });
  const [nameSiTouched, setNameSiTouched] = useState(false);
  const [descriptionSiTouched, setDescriptionSiTouched] = useState(false);
  const lastAutoTranslationRef = useRef({
    nameSi: '',
    descriptionSi: '',
  });

  const productsQuery = useAdminProductsQuery({ search: productSearch });
  const categoriesQuery = useAdminCategoriesQuery();
  const ordersQuery = useAdminOrdersQuery({ search: orderSearch });
  const {
    createProduct,
    updateProduct,
    deleteProduct,
    adjustProductStock,
    createCategory,
    updateCategory,
    deleteCategory,
    updateOrderStatus,
  } = useStoreMutations();

  const products = productsQuery.data?.data?.products ?? [];
  const categories = categoriesQuery.data?.data?.categories ?? [];
  const orders = ordersQuery.data?.data?.orders ?? [];
  const inventoryValue = useMemo(
    () => products.reduce((sum, product) => sum + product.price * product.currentStock, 0),
    [products],
  );

  const mutationError =
    (productsQuery.error as Error)?.message ||
    (categoriesQuery.error as Error)?.message ||
    (ordersQuery.error as Error)?.message ||
    (createProduct.error as Error)?.message ||
    (updateProduct.error as Error)?.message ||
    (deleteProduct.error as Error)?.message ||
    (adjustProductStock.error as Error)?.message ||
    (createCategory.error as Error)?.message ||
    (updateCategory.error as Error)?.message ||
    (deleteCategory.error as Error)?.message ||
    (updateOrderStatus.error as Error)?.message;

  const handleProductFormChange =
    (field: keyof typeof productForm) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = field === 'isActive' ? (event.target as HTMLInputElement).checked : event.target.value;
      setProductForm((current) => ({
        ...current,
        [field]: value,
        ...(field === 'categoryName' ? { categoryId: '' } : {}),
      }));

      if (field === 'nameSi') {
        setNameSiTouched(true);
      }

      if (field === 'descriptionSi') {
        setDescriptionSiTouched(true);
      }
    };

  const handleCategoryFormChange =
    (field: keyof typeof categoryForm) => (event: ChangeEvent<HTMLInputElement>) => {
      setCategoryForm((current) => ({ ...current, [field]: event.target.value }));
    };

  const handleStockFormChange =
    (field: keyof typeof stockForm) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setStockForm((current) => ({ ...current, [field]: event.target.value }));
    };

  const resetProductForm = () => {
    setSelectedProduct(null);
    setTranslationPending(false);
    setNameSiTouched(false);
    setDescriptionSiTouched(false);
    lastAutoTranslationRef.current = { nameSi: '', descriptionSi: '' };
    setStockForm({ quantityChange: '0', balanceTo: '', note: '' });
    setProductForm({
      sku: '',
      name: '',
      nameSi: '',
      categoryId: '',
      categoryName: '',
      description: '',
      descriptionSi: '',
      price: '0',
      stockQuantity: '0',
      imageUrl: '',
      isActive: true,
    });
  };

  const resetCategoryForm = () => {
    setSelectedCategory(null);
    setCategoryForm({
      name: '',
      nameSi: '',
    });
  };

  const loadProductIntoForm = (product: Product) => {
    setSelectedProduct(product);
    setTranslationPending(false);
    setNameSiTouched(Boolean(product.nameSi));
    setDescriptionSiTouched(Boolean(product.descriptionSi));
    lastAutoTranslationRef.current = {
      nameSi: product.nameSi || '',
      descriptionSi: product.descriptionSi || '',
    };
    setProductForm({
      sku: product.sku,
      name: product.name,
      nameSi: product.nameSi || '',
      categoryId: product.categoryId,
      categoryName: product.category,
      description: product.description || '',
      descriptionSi: product.descriptionSi || '',
      price: String(product.price),
      stockQuantity: String(product.currentStock),
      imageUrl: product.imageUrl || '',
      isActive: product.isActive,
    });
    setStockForm({ quantityChange: '0', balanceTo: '', note: '' });
  };

  const loadCategoryIntoForm = (category: Category) => {
    setSelectedCategory(category);
    setCategoryForm({
      name: category.name,
      nameSi: category.nameSi || '',
    });
  };

  const submitProduct = () => {
    const payload = {
      sku: productForm.sku,
      name: productForm.name,
      nameSi: productForm.nameSi || undefined,
      description: productForm.description || undefined,
      descriptionSi: productForm.descriptionSi || undefined,
      categoryId: productForm.categoryId || undefined,
      categoryName: productForm.categoryName || undefined,
      price: Number(productForm.price),
      stockQuantity: Number(productForm.stockQuantity),
      imageUrl: productForm.imageUrl || undefined,
      isActive: productForm.isActive,
    };

    if (selectedProduct) {
      updateProduct.mutate({ productId: selectedProduct.id, payload });
    } else {
      createProduct.mutate(payload);
    }
  };

  const submitCategory = () => {
    const payload = {
      name: categoryForm.name,
      nameSi: categoryForm.nameSi || undefined,
    };

    if (selectedCategory) {
      updateCategory.mutate({ categoryId: selectedCategory.id, payload });
    } else {
      createCategory.mutate(payload);
    }
  };

  const submitStockAdjustment = () => {
    if (!selectedProduct) {
      return;
    }

    adjustProductStock.mutate({
      productId: selectedProduct.id,
      payload: {
        quantityChange: stockForm.balanceTo ? undefined : Number(stockForm.quantityChange),
        balanceTo: stockForm.balanceTo ? Number(stockForm.balanceTo) : undefined,
        note: stockForm.note || undefined,
      },
    });
  };

  useEffect(() => {
    const name = productForm.name.trim();
    const description = productForm.description.trim();

    if (!name && !description) {
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      setTranslationPending(true);

      try {
        const response = await coreApi.translateProductFields({ name, description });
        const translatedName = response.data.nameSi || '';
        const translatedDescription = response.data.descriptionSi || '';
        const previousAuto = lastAutoTranslationRef.current;

        setProductForm((current) => {
          const nextState = { ...current };

          if (!nameSiTouched || current.nameSi === '' || current.nameSi === previousAuto.nameSi) {
            nextState.nameSi = translatedName;
          }

          if (
            !descriptionSiTouched ||
            current.descriptionSi === '' ||
            current.descriptionSi === previousAuto.descriptionSi
          ) {
            nextState.descriptionSi = translatedDescription;
          }

          return nextState;
        });

        lastAutoTranslationRef.current = {
          nameSi: translatedName,
          descriptionSi: translatedDescription,
        };
      } catch {
        // Keep the form usable even if translation preview is unavailable.
      } finally {
        setTranslationPending(false);
      }
    }, 700);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [productForm.name, productForm.description, nameSiTouched, descriptionSiTouched]);

  return (
    <PageContainer noMaxHeight>
      <div className="space-y-6">
        <section className="rounded-3xl bg-[linear-gradient(135deg,#0f172a_0%,#134e4a_42%,#0b6b55_100%)] px-6 py-8 text-white shadow-lg">
          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <div className="space-y-3">
              <Badge className="bg-white/15 text-white">
                <ShieldCheck className="mr-2 h-3.5 w-3.5" />
                Admin dashboard
              </Badge>
              <h1 className="text-4xl font-black tracking-tight">Manage catalog, categories, and stock movements.</h1>
              <p className="max-w-2xl text-white/85">
                Products now reference managed categories and every stock change is logged as a movement, including manual adjustments and customer purchases.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <div className="rounded-2xl bg-white/10 p-4">
                <div className="text-sm text-white/70">Catalog items</div>
                <div className="text-2xl font-bold">{products.length}</div>
              </div>
              <div className="rounded-2xl bg-white/10 p-4">
                <div className="text-sm text-white/70">Categories</div>
                <div className="text-2xl font-bold">{categories.length}</div>
              </div>
              <div className="rounded-2xl bg-white/10 p-4">
                <div className="text-sm text-white/70">Inventory value</div>
                <div className="text-2xl font-bold">${inventoryValue.toFixed(2)}</div>
              </div>
            </div>
          </div>
        </section>

        {mutationError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Admin action failed</AlertTitle>
            <AlertDescription>{mutationError}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6 xl:grid-cols-[1.1fr_1.5fr_1.1fr]">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle>{selectedProduct ? 'Edit Product' : 'Create Product'}</CardTitle>
                  <p className="text-sm text-muted-foreground">Products reference managed categories.</p>
                </div>
                <PackagePlus className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input placeholder="SKU" value={productForm.sku} onChange={handleProductFormChange('sku')} disabled={!!selectedProduct} />
              <Input placeholder="Name" value={productForm.name} onChange={handleProductFormChange('name')} />
              <Input
                placeholder={translationPending ? 'Translating name...' : 'Name (Sinhala)'}
                value={productForm.nameSi}
                onChange={handleProductFormChange('nameSi')}
              />
              <Input
                placeholder="Category name"
                value={productForm.categoryName}
                onChange={handleProductFormChange('categoryName')}
                list="admin-category-list"
              />
              <textarea
                placeholder="Description"
                value={productForm.description}
                onChange={handleProductFormChange('description')}
                className="min-h-24 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none"
              />
              <textarea
                placeholder="Description (Sinhala)"
                value={productForm.descriptionSi}
                onChange={handleProductFormChange('descriptionSi')}
                className="min-h-20 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none"
              />
              <p className="text-xs text-muted-foreground">
                Sinhala fields are auto-filled from the English text and remain fully editable.
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                <Input placeholder="Price" type="number" value={productForm.price} onChange={handleProductFormChange('price')} />
                <Input
                  placeholder={selectedProduct ? 'Current stock balance' : 'Initial stock'}
                  type="number"
                  value={productForm.stockQuantity}
                  onChange={handleProductFormChange('stockQuantity')}
                />
              </div>
              <Input placeholder="Image URL" value={productForm.imageUrl} onChange={handleProductFormChange('imageUrl')} />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={productForm.isActive} onChange={handleProductFormChange('isActive')} />
                Product is active
              </label>
              <datalist id="admin-category-list">
                {categories.map((category) => (
                  <option key={category.id} value={category.name} />
                ))}
              </datalist>
            </CardContent>
            <CardFooter className="flex-wrap gap-3">
              <Button disabled={createProduct.isPending || updateProduct.isPending} onClick={submitProduct}>
                {selectedProduct ? 'Save Product' : 'Create Product'}
              </Button>
              <Button variant="outline" onClick={resetProductForm}>
                Reset
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle>Product Inventory</CardTitle>
                  <p className="text-sm text-muted-foreground">Adjust stock through movements instead of directly editing hidden counters.</p>
                </div>
                <Boxes className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input placeholder="Search products" value={productSearch} onChange={(event) => setProductSearch(event.target.value)} />
              {productsQuery.isLoading ? (
                <div className="flex min-h-56 items-center justify-center">
                  <Spinner className="h-6 w-6" />
                </div>
              ) : (
                <div className="space-y-3">
                  {products.map((product) => (
                    <div key={product.id} className="rounded-2xl border p-4">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <div className="font-semibold">{product.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {product.sku} • {product.category}
                          </div>
                        </div>
                        <Badge variant={product.isActive ? 'secondary' : 'destructive'}>
                          {product.isActive ? 'active' : 'inactive'}
                        </Badge>
                      </div>
                      <div className="mt-3 grid gap-3 md:grid-cols-3">
                        <div>
                          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Price</div>
                          <div className="mt-1 font-semibold">${product.price.toFixed(2)}</div>
                        </div>
                        <div>
                          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Stock</div>
                          <div className="mt-1 font-semibold">{product.currentStock}</div>
                        </div>
                        <div>
                          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Status</div>
                          <div className="mt-1 font-semibold">{product.status.replace(/_/g, ' ')}</div>
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button variant="outline" onClick={() => loadProductIntoForm(product)}>
                          Edit
                        </Button>
                        <Button variant="destructive" onClick={() => deleteProduct.mutate(product.id)}>
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle>Categories</CardTitle>
                  <p className="text-sm text-muted-foreground">Create and reuse category records across products.</p>
                </div>
                <Tags className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input placeholder="Category name" value={categoryForm.name} onChange={handleCategoryFormChange('name')} />
              <Input placeholder="Category name (Sinhala)" value={categoryForm.nameSi} onChange={handleCategoryFormChange('nameSi')} />
              <div className="flex flex-wrap gap-2">
                <Button onClick={submitCategory}>{selectedCategory ? 'Save Category' : 'Create Category'}</Button>
                <Button variant="outline" onClick={resetCategoryForm}>
                  Reset
                </Button>
              </div>
              <div className="space-y-2 pt-2">
                {categoriesQuery.isLoading ? (
                  <div className="flex min-h-20 items-center justify-center">
                    <Spinner className="h-5 w-5" />
                  </div>
                ) : (
                  categories.map((category) => (
                    <div key={category.id} className="rounded-2xl border p-3">
                      <div className="font-medium">{category.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {category.productCount} products
                      </div>
                      <div className="mt-3 flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => loadCategoryIntoForm(category)}>
                          Edit
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => deleteCategory.mutate(category.id)}>
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_1.9fr]">
          <Card>
            <CardHeader>
              <CardTitle>Stock Ledger</CardTitle>
              <p className="text-sm text-muted-foreground">Select a product, then add or rebalance stock.</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-2xl border p-3 text-sm">
                {selectedProduct ? (
                  <>
                    <div className="font-semibold">{selectedProduct.name}</div>
                    <div className="text-muted-foreground">
                      Current balance {selectedProduct.currentStock} • {selectedProduct.sku}
                    </div>
                  </>
                ) : (
                  <div className="text-muted-foreground">Pick a product from the inventory list to adjust stock.</div>
                )}
              </div>
              <Input
                placeholder="Quantity change (use negative for decrease)"
                type="number"
                value={stockForm.quantityChange}
                onChange={handleStockFormChange('quantityChange')}
                disabled={!selectedProduct}
              />
              <Input
                placeholder="Or set exact balance"
                type="number"
                value={stockForm.balanceTo}
                onChange={handleStockFormChange('balanceTo')}
                disabled={!selectedProduct}
              />
              <textarea
                placeholder="Reason or note"
                value={stockForm.note}
                onChange={handleStockFormChange('note')}
                className="min-h-24 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none"
              />
            </CardContent>
            <CardFooter>
              <Button disabled={!selectedProduct || adjustProductStock.isPending} onClick={submitStockAdjustment}>
                Apply Stock Update
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle>Order Operations</CardTitle>
                  <p className="text-sm text-muted-foreground">Update fulfillment state for live customer orders.</p>
                </div>
                <RefreshCw className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input placeholder="Search by order number or user id" value={orderSearch} onChange={(event) => setOrderSearch(event.target.value)} />
              {ordersQuery.isLoading ? (
                <div className="flex min-h-56 items-center justify-center">
                  <Spinner className="h-6 w-6" />
                </div>
              ) : (
                <div className="space-y-3">
                  {orders.map((order) => (
                    <div key={order.id} className="rounded-2xl border p-4">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <div className="font-semibold">{order.orderNumber}</div>
                          <div className="text-sm text-muted-foreground">
                            User {order.userId} • {new Date(order.createdAt).toLocaleString()}
                          </div>
                        </div>
                        <Badge variant={order.status === 'cancelled' ? 'destructive' : 'secondary'}>
                          {order.status}
                        </Badge>
                      </div>
                      <div className="mt-3 grid gap-3 md:grid-cols-4">
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
                          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Updated</div>
                          <div className="mt-1 font-semibold">{new Date(order.updatedAt).toLocaleDateString()}</div>
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'] as OrderStatus[]).map((status) => (
                          <Button
                            key={status}
                            variant={order.status === status ? 'default' : 'outline'}
                            onClick={() => updateOrderStatus.mutate({ orderId: order.id, status })}
                          >
                            {status}
                          </Button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
