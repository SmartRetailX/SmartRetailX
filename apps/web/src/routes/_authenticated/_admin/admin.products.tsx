import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAdminCategoriesQuery, useAdminProductsQuery, useStoreMutations } from '@/hooks';
import { createFileRoute } from '@tanstack/react-router';
import {
  functionalUpdate,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type PaginationState,
  type SortingState,
} from '@tanstack/react-table';
import { PackagePlus, Pencil, Plus, Search, Trash2, X } from 'lucide-react';

import { DataTableCard } from '@/components/admin/data-table-card';
import { TablePagination } from '@/components/admin/table-pagination';
import { PageContainer } from '@/components/partials/container/page-container';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Textarea } from '@/components/ui/textarea';
import {
  buildAdminTableSearch,
  normalizeAdminTableSearch,
  type AdminTableSearch,
} from '@/lib/admin-table-search';
import { coreApi } from '@/lib/core-api';
import type { Product } from '@/types/store';

const DEFAULT_PRODUCT_LIMIT = 12;

type ProductRouteSearch = AdminTableSearch;

export const Route = createFileRoute('/_authenticated/_admin/admin/products')({
  validateSearch: (search): ProductRouteSearch =>
    normalizeAdminTableSearch(search, DEFAULT_PRODUCT_LIMIT),
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = Route.useNavigate();
  const tableSearch = Route.useSearch() as ProductRouteSearch;
  const search = tableSearch.search ?? '';
  const pagination = useMemo<PaginationState>(
    () => ({
      pageIndex: tableSearch.page - 1,
      pageSize: tableSearch.limit,
    }),
    [tableSearch.limit, tableSearch.page],
  );
  const [sorting, setSorting] = useState<SortingState>([]);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
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
  const [nameSiTouched, setNameSiTouched] = useState(false);
  const [descriptionSiTouched, setDescriptionSiTouched] = useState(false);
  const lastAutoTranslationRef = useRef({
    nameSi: '',
    descriptionSi: '',
  });

  const updateTableSearch = useCallback(
    (patch: Partial<ProductRouteSearch>, replace = false) => {
      void navigate({
        search: buildAdminTableSearch({
          search,
          page: tableSearch.page,
          limit: tableSearch.limit,
          ...patch,
        }),
        replace,
      });
    },
    [navigate, search, tableSearch.limit, tableSearch.page],
  );

  const productsQuery = useAdminProductsQuery({
    search: tableSearch.search,
    page: tableSearch.page,
    limit: tableSearch.limit,
  });
  const categoriesQuery = useAdminCategoriesQuery();
  const { createProduct, updateProduct, deleteProduct } = useStoreMutations();

  const products = productsQuery.data?.data?.products ?? [];
  const paginationInfo = productsQuery.data?.data?.pagination;
  const categories = categoriesQuery.data?.data?.categories ?? [];

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (!params.has('page') || !params.has('limit')) {
      updateTableSearch({}, true);
    }
  }, [updateTableSearch]);

  useEffect(() => {
    const totalPages = paginationInfo?.totalPages;

    if (totalPages && tableSearch.page > totalPages) {
      updateTableSearch({ page: totalPages }, true);
    }
  }, [paginationInfo?.totalPages, tableSearch.page, updateTableSearch]);

  useEffect(() => {
    const name = productForm.name.trim();
    const description = productForm.description.trim();

    if (!productDialogOpen || (!name && !description)) {
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
  }, [
    productDialogOpen,
    productForm.name,
    productForm.description,
    nameSiTouched,
    descriptionSiTouched,
  ]);

  const handleProductFormChange =
    (field: keyof typeof productForm) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setProductForm((current) => ({
        ...current,
        [field]: event.target.value,
        ...(field === 'categoryName' ? { categoryId: '' } : {}),
      }));

      if (field === 'nameSi') {
        setNameSiTouched(true);
      }

      if (field === 'descriptionSi') {
        setDescriptionSiTouched(true);
      }
    };

  const resetProductForm = useCallback(() => {
    setSelectedProduct(null);
    setTranslationPending(false);
    setNameSiTouched(false);
    setDescriptionSiTouched(false);
    lastAutoTranslationRef.current = { nameSi: '', descriptionSi: '' };
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
  }, []);

  const openCreateProductDialog = () => {
    resetProductForm();
    setProductDialogOpen(true);
  };

  const loadProductIntoForm = useCallback((product: Product) => {
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
    setProductDialogOpen(true);
  }, []);

  const submitProduct = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

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

    const onSuccess = () => {
      resetProductForm();
      setProductDialogOpen(false);
    };

    if (selectedProduct) {
      updateProduct.mutate({ productId: selectedProduct.id, payload }, { onSuccess });
      return;
    }

    createProduct.mutate(payload, { onSuccess });
  };

  const columns = useMemo<ColumnDef<Product>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Product',
        cell: ({ row }) => (
          <div className="min-w-0">
            <div className="max-w-[38rem] truncate font-semibold">{row.original.name}</div>
            <div className="text-xs text-muted-foreground">{row.original.sku}</div>
          </div>
        ),
      },
      {
        accessorKey: 'category',
        header: 'Category',
        cell: ({ row }) => <span className="whitespace-nowrap">{row.original.category}</span>,
      },
      {
        accessorKey: 'price',
        header: 'Price',
        cell: ({ row }) => `$${row.original.price.toFixed(2)}`,
      },
      {
        accessorKey: 'currentStock',
        header: 'Stock',
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <Badge
            variant={row.original.status === 'OUT_OF_STOCK' ? 'destructive' : 'secondary'}
            className="whitespace-nowrap"
          >
            {row.original.status.replace(/_/g, ' ')}
          </Badge>
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon-sm"
              aria-label={`Edit ${row.original.name}`}
              onClick={() => loadProductIntoForm(row.original)}
            >
              <Pencil />
            </Button>
            <Button
              variant="destructive"
              size="icon-sm"
              aria-label={`Delete ${row.original.name}`}
              onClick={() => {
                if (!window.confirm(`Delete ${row.original.name}?`)) {
                  return;
                }

                deleteProduct.mutate(row.original.id);
              }}
            >
              <Trash2 />
            </Button>
          </div>
        ),
      },
    ],
    [deleteProduct, loadProductIntoForm],
  );

  const table = useReactTable({
    data: products,
    columns,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: (updater) => {
      const next = functionalUpdate(updater, pagination);

      updateTableSearch({
        page: next.pageIndex + 1,
        limit: next.pageSize,
      });
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    pageCount: paginationInfo?.totalPages ?? 0,
  });

  const mutationError =
    (productsQuery.error as Error)?.message ||
    (categoriesQuery.error as Error)?.message ||
    (createProduct.error as Error)?.message ||
    (updateProduct.error as Error)?.message ||
    (deleteProduct.error as Error)?.message;

  return (
    <PageContainer className="flex h-full min-h-0 flex-col" noMaxHeight>
      <Dialog
        open={productDialogOpen}
        onOpenChange={(open) => {
          setProductDialogOpen(open);

          if (!open) {
            resetProductForm();
          }
        }}
      >
        <DialogContent className="max-w-3xl">
          <form onSubmit={submitProduct} className="flex min-h-0 flex-1 flex-col">
            <DialogHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <DialogTitle>{selectedProduct ? 'Edit Product' : 'Create Product'}</DialogTitle>
                <DialogDescription>
                  Catalog details, translations, pricing, and starting inventory.
                </DialogDescription>
              </div>
              <DialogClose
                render={
                  <Button type="button" variant="ghost" size="icon-sm" aria-label="Close dialog">
                    <X />
                  </Button>
                }
              />
            </DialogHeader>

            <FieldGroup className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="product-sku">SKU</FieldLabel>
                  <Input
                    id="product-sku"
                    value={productForm.sku}
                    onChange={handleProductFormChange('sku')}
                    disabled={!!selectedProduct}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="product-category">Category</FieldLabel>
                  <Input
                    id="product-category"
                    value={productForm.categoryName}
                    onChange={handleProductFormChange('categoryName')}
                    list="admin-category-list"
                  />
                </Field>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="product-name">Name</FieldLabel>
                  <Input
                    id="product-name"
                    value={productForm.name}
                    onChange={handleProductFormChange('name')}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="product-name-si">
                    {translationPending ? 'Translating name' : 'Name (Sinhala)'}
                  </FieldLabel>
                  <Input
                    id="product-name-si"
                    value={productForm.nameSi}
                    onChange={handleProductFormChange('nameSi')}
                  />
                </Field>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="product-description">Description</FieldLabel>
                  <Textarea
                    id="product-description"
                    value={productForm.description}
                    onChange={handleProductFormChange('description')}
                    className="min-h-28"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="product-description-si">
                    {translationPending ? 'Translating description' : 'Description (Sinhala)'}
                  </FieldLabel>
                  <Textarea
                    id="product-description-si"
                    value={productForm.descriptionSi}
                    onChange={handleProductFormChange('descriptionSi')}
                    className="min-h-28"
                  />
                </Field>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <Field>
                  <FieldLabel htmlFor="product-price">Price</FieldLabel>
                  <Input
                    id="product-price"
                    type="number"
                    value={productForm.price}
                    onChange={handleProductFormChange('price')}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="product-stock">
                    {selectedProduct ? 'Current stock balance' : 'Initial stock'}
                  </FieldLabel>
                  <Input
                    id="product-stock"
                    type="number"
                    value={productForm.stockQuantity}
                    onChange={handleProductFormChange('stockQuantity')}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="product-image-url">Image URL</FieldLabel>
                  <Input
                    id="product-image-url"
                    value={productForm.imageUrl}
                    onChange={handleProductFormChange('imageUrl')}
                  />
                </Field>
              </div>

              <Field orientation="horizontal">
                <Checkbox
                  checked={productForm.isActive}
                  onCheckedChange={(checked) =>
                    setProductForm((current) => ({ ...current, isActive: checked }))
                  }
                />
                <FieldLabel>Product is active</FieldLabel>
              </Field>

              <datalist id="admin-category-list">
                {categories.map((category) => (
                  <option key={category.id} value={category.name} />
                ))}
              </datalist>

              {mutationError && (
                <Alert variant="destructive">
                  <AlertTitle>Product action failed</AlertTitle>
                  <AlertDescription>{mutationError}</AlertDescription>
                </Alert>
              )}
            </FieldGroup>

            <DialogFooter>
              <DialogClose
                render={
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                }
              />
              <Button type="submit" disabled={createProduct.isPending || updateProduct.isPending}>
                <PackagePlus data-icon="inline-start" />
                {selectedProduct ? 'Save Product' : 'Create Product'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="h-full min-h-0">
        {mutationError && !productDialogOpen && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Product action failed</AlertTitle>
            <AlertDescription>{mutationError}</AlertDescription>
          </Alert>
        )}

        <DataTableCard
          title="Product Management"
          description="Search, inspect, and edit catalog products."
          table={table}
          tableClassName="min-w-[980px]"
          isLoading={productsQuery.isLoading}
          emptyMessage="No products match the current search."
          toolbar={
            <div className="flex flex-wrap items-center gap-3">
              <InputGroup className="w-full sm:w-72">
                <InputGroupAddon>
                  <Search />
                </InputGroupAddon>
                <InputGroupInput
                  value={search}
                  onChange={(event) =>
                    updateTableSearch({
                      search: event.target.value || undefined,
                      page: 1,
                    })
                  }
                  placeholder="Search products"
                />
              </InputGroup>
              <Button onClick={openCreateProductDialog}>
                <Plus data-icon="inline-start" />
                Add Product
              </Button>
            </div>
          }
          footer={
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm text-muted-foreground">
                Showing {products.length} of {paginationInfo?.total ?? products.length} products
              </div>
              <TablePagination table={table} totalPages={paginationInfo?.totalPages ?? 1} />
            </div>
          }
        />
      </div>
    </PageContainer>
  );
}
