import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useAdminProductsQuery, useStoreMutations } from '@/hooks';
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
import { Boxes, Search, X } from 'lucide-react';

import { DataTableCard } from '@/components/admin/data-table-card';
import { TablePagination } from '@/components/admin/table-pagination';
import { PageContainer } from '@/components/partials/container/page-container';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import type { Product } from '@/types/store';

const DEFAULT_STOCK_LIMIT = 10;

type StockRouteSearch = AdminTableSearch;

export const Route = createFileRoute('/_authenticated/_admin/admin/stock')({
  validateSearch: (search): StockRouteSearch =>
    normalizeAdminTableSearch(search, DEFAULT_STOCK_LIMIT),
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = Route.useNavigate();
  const tableSearch = Route.useSearch() as StockRouteSearch;
  const search = tableSearch.search ?? '';
  const pagination = useMemo<PaginationState>(
    () => ({
      pageIndex: tableSearch.page - 1,
      pageSize: tableSearch.limit,
    }),
    [tableSearch.limit, tableSearch.page],
  );
  const [sorting, setSorting] = useState<SortingState>([]);
  const [stockDialogOpen, setStockDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [stockForm, setStockForm] = useState({
    quantityChange: '0',
    balanceTo: '',
    note: '',
  });

  const updateTableSearch = useCallback(
    (patch: Partial<StockRouteSearch>, replace = false) => {
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
  const { adjustProductStock } = useStoreMutations();

  const products = productsQuery.data?.data?.products ?? [];
  const paginationInfo = productsQuery.data?.data?.pagination;

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

  const handleStockFormChange =
    (field: keyof typeof stockForm) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setStockForm((current) => ({ ...current, [field]: event.target.value }));
    };

  const resetStockDialog = useCallback(() => {
    setSelectedProduct(null);
    setStockForm({ quantityChange: '0', balanceTo: '', note: '' });
  }, []);

  const openStockDialog = useCallback((product: Product) => {
    setSelectedProduct(product);
    setStockForm({ quantityChange: '0', balanceTo: '', note: '' });
    setStockDialogOpen(true);
  }, []);

  const submitStockAdjustment = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedProduct) {
      return;
    }

    adjustProductStock.mutate(
      {
        productId: selectedProduct.id,
        payload: {
          quantityChange: stockForm.balanceTo ? undefined : Number(stockForm.quantityChange),
          balanceTo: stockForm.balanceTo ? Number(stockForm.balanceTo) : undefined,
          note: stockForm.note || undefined,
        },
      },
      {
        onSuccess: () => {
          resetStockDialog();
          setStockDialogOpen(false);
        },
      },
    );
  };

  const columns = useMemo<ColumnDef<Product>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Product',
        cell: ({ row }) => (
          <div>
            <div className="max-w-[40rem] truncate font-semibold">{row.original.name}</div>
            <div className="text-sm text-muted-foreground">{row.original.sku}</div>
          </div>
        ),
      },
      {
        accessorKey: 'currentStock',
        header: 'Current Stock',
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
          <Button variant="outline" size="sm" onClick={() => openStockDialog(row.original)}>
            <Boxes className="mr-1 h-3.5 w-3.5" />
            Adjust
          </Button>
        ),
      },
    ],
    [openStockDialog],
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
    (productsQuery.error as Error)?.message || (adjustProductStock.error as Error)?.message;

  return (
    <PageContainer className="flex h-full min-h-0 flex-col" noMaxHeight>
      <Dialog
        open={stockDialogOpen}
        onOpenChange={(open) => {
          setStockDialogOpen(open);

          if (!open) {
            resetStockDialog();
          }
        }}
      >
        <DialogContent>
          <form onSubmit={submitStockAdjustment} className="flex min-h-0 flex-1 flex-col">
            <DialogHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <DialogTitle>Stock Adjustment</DialogTitle>
                <DialogDescription>Apply a movement or set the exact balance.</DialogDescription>
              </div>
              <DialogClose
                render={
                  <Button type="button" variant="ghost" size="icon-sm" aria-label="Close dialog">
                    <X />
                  </Button>
                }
              />
            </DialogHeader>

            <FieldGroup className="px-5 py-4">
              <div className="rounded-lg border border-border/70 bg-muted/30 p-3 text-sm">
                {selectedProduct ? (
                  <>
                    <div className="font-semibold">{selectedProduct.name}</div>
                    <div className="text-muted-foreground">
                      Current balance {selectedProduct.currentStock} / {selectedProduct.sku}
                    </div>
                  </>
                ) : (
                  <div className="text-muted-foreground">No product selected.</div>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="stock-quantity-change">Quantity change</FieldLabel>
                  <Input
                    id="stock-quantity-change"
                    type="number"
                    value={stockForm.quantityChange}
                    onChange={handleStockFormChange('quantityChange')}
                    disabled={!selectedProduct}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="stock-balance-to">Exact balance</FieldLabel>
                  <Input
                    id="stock-balance-to"
                    type="number"
                    value={stockForm.balanceTo}
                    onChange={handleStockFormChange('balanceTo')}
                    disabled={!selectedProduct}
                  />
                </Field>
              </div>

              <Field>
                <FieldLabel htmlFor="stock-note">Note</FieldLabel>
                <Textarea
                  id="stock-note"
                  value={stockForm.note}
                  onChange={handleStockFormChange('note')}
                  className="min-h-24"
                />
              </Field>

              {mutationError && (
                <Alert variant="destructive">
                  <AlertTitle>Stock update failed</AlertTitle>
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
              <Button type="submit" disabled={!selectedProduct || adjustProductStock.isPending}>
                <Boxes data-icon="inline-start" />
                Apply Update
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="h-full min-h-0">
        {mutationError && !stockDialogOpen && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Stock update failed</AlertTitle>
            <AlertDescription>{mutationError}</AlertDescription>
          </Alert>
        )}

        <DataTableCard
          title="Stock Ledger Source"
          description="Browse products and update balances from row actions."
          table={table}
          tableClassName="min-w-[820px]"
          isLoading={productsQuery.isLoading}
          emptyMessage="No products match the current search."
          toolbar={
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
