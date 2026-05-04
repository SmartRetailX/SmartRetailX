import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAdminOrdersQuery, useStoreMutations } from '@/hooks';
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
import { Check, ChevronDown, RefreshCw, Search } from 'lucide-react';

import { DataTableCard } from '@/components/admin/data-table-card';
import { TablePagination } from '@/components/admin/table-pagination';
import { PageContainer } from '@/components/partials/container/page-container';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import {
  buildAdminTableSearch,
  normalizeAdminTableSearch,
  type AdminTableSearch,
} from '@/lib/admin-table-search';
import type { OrderListItem, OrderStatus } from '@/types/store';

const DEFAULT_ORDER_LIMIT = 10;
const ORDER_STATUSES: OrderStatus[] = [
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
];

type OrderRouteSearch = AdminTableSearch;

export const Route = createFileRoute('/_authenticated/_admin/admin/orders')({
  validateSearch: (search): OrderRouteSearch =>
    normalizeAdminTableSearch(search, DEFAULT_ORDER_LIMIT),
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = Route.useNavigate();
  const tableSearch = Route.useSearch() as OrderRouteSearch;
  const search = tableSearch.search ?? '';
  const pagination = useMemo<PaginationState>(
    () => ({
      pageIndex: tableSearch.page - 1,
      pageSize: tableSearch.limit,
    }),
    [tableSearch.limit, tableSearch.page],
  );
  const [sorting, setSorting] = useState<SortingState>([]);

  const updateTableSearch = useCallback(
    (patch: Partial<OrderRouteSearch>, replace = false) => {
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

  const ordersQuery = useAdminOrdersQuery({
    search: tableSearch.search,
    page: tableSearch.page,
    limit: tableSearch.limit,
  });
  const { updateOrderStatus } = useStoreMutations();
  const orders = ordersQuery.data?.data?.orders ?? [];
  const paginationInfo = ordersQuery.data?.data?.pagination;

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

  const columns = useMemo<ColumnDef<OrderListItem>[]>(
    () => [
      {
        accessorKey: 'orderNumber',
        header: 'Order',
        cell: ({ row }) => (
          <div>
            <div className="font-semibold">{row.original.orderNumber}</div>
            <div className="text-sm text-muted-foreground">User {row.original.userId}</div>
          </div>
        ),
      },
      {
        accessorKey: 'itemCount',
        header: 'Items',
      },
      {
        accessorKey: 'total',
        header: 'Total',
        cell: ({ row }) => `$${row.original.total.toFixed(2)}`,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <Badge variant={row.original.status === 'cancelled' ? 'destructive' : 'secondary'}>
            {row.original.status}
          </Badge>
        ),
      },
      {
        accessorKey: 'updatedAt',
        header: 'Updated',
        cell: ({ row }) => new Date(row.original.updatedAt).toLocaleString(),
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="outline" size="sm" disabled={updateOrderStatus.isPending}>
                  Set status
                  <ChevronDown className="ml-1 h-3.5 w-3.5" />
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Order status</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {ORDER_STATUSES.map((status) => (
                  <DropdownMenuItem
                    key={status}
                    onClick={() => {
                      if (row.original.status !== status) {
                        updateOrderStatus.mutate({ orderId: row.original.id, status });
                      }
                    }}
                    className="cursor-pointer justify-between capitalize"
                  >
                    {status}
                    {row.original.status === status && <Check />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [updateOrderStatus],
  );

  const table = useReactTable({
    data: orders,
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
    (ordersQuery.error as Error)?.message || (updateOrderStatus.error as Error)?.message;

  return (
    <PageContainer className="flex min-h-0 flex-col" noMaxHeight>
      <div className="h-full min-h-0">
        {mutationError && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Order update failed</AlertTitle>
            <AlertDescription>{mutationError}</AlertDescription>
          </Alert>
        )}

        <DataTableCard
          title="Order Operations"
          description="Review customer orders and update fulfillment status."
          table={table}
          tableClassName="min-w-[940px]"
          isLoading={ordersQuery.isLoading}
          emptyMessage="No orders match the current search."
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
                  placeholder="Search orders"
                />
              </InputGroup>
              <Button variant="outline" onClick={() => ordersQuery.refetch()}>
                <RefreshCw data-icon="inline-start" />
                Refresh
              </Button>
            </div>
          }
          footer={
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm text-muted-foreground">
                Showing {orders.length} of {paginationInfo?.total ?? orders.length} orders
              </div>
              <TablePagination table={table} totalPages={paginationInfo?.totalPages ?? 1} />
            </div>
          }
        />
      </div>
    </PageContainer>
  );
}
