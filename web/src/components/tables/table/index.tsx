import '@/styles/fixed-header.css';

import { IconDatabaseOff, IconTable } from '@tabler/icons-react';
import {
  ColumnDef,
  ColumnFiltersState,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  PaginationState,
  Row,
  SortingState,
  useReactTable,
  VisibilityState,
} from '@tanstack/react-table';
import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react';

import {
  TablePagination,
  TablePaginationState,
} from '@/components/tables/table-partials/pagination/design-2';
import { Button } from '@/components/ui/button';
import { SearchInput } from '@/components/ui/custom/inputs/search-input';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Table } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useTableSettingStore } from '@/store/table-settings.store';

import { ContextMenuAction } from '../table-partials/context-menu';
import { HeaderContextItem } from './context-menu/header-context';
import { TableBodyComponent } from './table-body';
import { TableHeaderComponent } from './table-header';

declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData, TValue> {
    label?: string;
  }
}

export function TableComponent<TData extends object>({
  data = [],
  columns,
  pagination: paginationProps,
  sorting: sortingProps,
  search: searchProps = { initialValue: '', manualSearch: false },
  rowCount: totalRowCount = 0,
  isLoading = false,
  isPlaceholder = false,
  emptyState = (
    <div className='flex items-center justify-center py-6'>
      <IconDatabaseOff />
    </div>
  ),
  hiddenColumns = [],
  className = '',
  onClickRow = () => {},
  showColumnHider = false,
  contextMenuActions = [],
  button = null,
  customTopElement = null,
  nextToSearchInput = null,
  title = '',
  titleSize = '2xl',
  tableId,
  skeletonRowCount,
  enableColumnResizing = true,
  columnResizeMode = 'onChange',
  renderSubComponent,
  getRowCanExpand,
}: {
  data: TData[];
  columns: ColumnDef<TData>[];
  pagination?: TablePaginationProps;
  sorting?: TableSortingProps;
  search?: TableSearchProps;
  rowCount?: number;
  isLoading?: boolean;
  isPlaceholder?: boolean;
  emptyState?: ReactNode;
  hiddenColumns?: string[];
  contextMenuActions?: ContextMenuAction<TData>[];
  className?: string;
  showColumnHider?: boolean;
  onClickRow?: (row: Row<TData>) => void;
  button?: ReactNode;
  customTopElement?: ReactNode;
  nextToSearchInput?: ReactNode;
  title?: string;
  titleSize?: 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl';
  tableId?: string; // Unique identifier for the table to persist column visibility
  skeletonRowCount?: number; // Number of skeleton rows to show when loading
  // Column Resizing
  enableColumnResizing?: boolean;
  columnResizeMode?: 'onChange' | 'onEnd';
  renderSubComponent?: (props: { row: Row<TData> }) => ReactNode;
  getRowCanExpand?: (row: Row<TData>) => boolean;
}) {
  // const [data, setData] = useState<TData[]>(() => []);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = useState({});
  const [globalFilter, setGlobalFilter] = useState(searchProps.initialValue || '');
  const [isSearching, setIsSearching] = useState(false);
  const [localPagination, setLocalPagination] = useState<PaginationState>({
    pageIndex: paginationProps?.pageIndex || 0,
    pageSize: paginationProps?.pageSize || 10,
  });

  // Header context menu items
  const [headerContextItems, setHeaderContextItems] = useState<HeaderContextItem[]>([]);

  // Get column visibility methods from the store
  const { getTableColumnVisibility, setColumnsVisibility, setTablePageSize, getTablePageSize } =
    useTableSettingStore();

  // Initialize column visibility state
  // If tableId is provided, load from store, otherwise use hiddenColumns
  const initialVisibility = useMemo(() => {
    const defaultVisibility = hiddenColumns.reduce(
      (acc, columnId) => ({ ...acc, [columnId]: false }),
      {},
    );

    // If no tableId, just use default visibility based on hiddenColumns
    if (!tableId) return defaultVisibility;

    // Otherwise, load from store
    const storedVisibility = getTableColumnVisibility(tableId);

    // Merge with default to ensure all current columns are included
    return { ...defaultVisibility, ...storedVisibility };
  }, [hiddenColumns, tableId, getTableColumnVisibility]);

  // Manage column visibility with state
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(initialVisibility);

  // Save column visibility changes to the store when they change
  useEffect(() => {
    // Only save if we have a tableId
    if (tableId) {
      setColumnsVisibility(tableId, columnVisibility);
    }
  }, [columnVisibility, tableId, setColumnsVisibility]);

  // Sync internal pagination state with external props
  useEffect(() => {
    if (paginationProps) {
      // If we have a tableId, try to get the stored page size first
      const storedPageSize = tableId
        ? getTablePageSize(tableId, paginationProps.pageSize)
        : paginationProps.pageSize;

      setLocalPagination({
        pageIndex: paginationProps.pageIndex,
        pageSize: storedPageSize,
      });
    }
  }, [paginationProps, tableId, getTablePageSize]);

  // Reset search loading state when data or loading state changes
  useEffect(() => {
    // Only reset searching state when new data arrives and we're not in loading state
    if (!isLoading && !isPlaceholder) {
      setIsSearching(false);
    }
  }, [data, isLoading, isPlaceholder]);

  const handlePaginationChange = (
    updaterOrValue: PaginationState | ((old: PaginationState) => PaginationState),
  ) => {
    // Determine the new pagination state
    const newPagination =
      typeof updaterOrValue === 'function'
        ? (updaterOrValue as (old: PaginationState) => PaginationState)(localPagination)
        : updaterOrValue;

    // If page size changed and we have a tableId, persist it
    if (tableId && newPagination.pageSize !== localPagination.pageSize) {
      setTablePageSize(tableId, newPagination.pageSize);
    }

    if (paginationProps?.onPaginationChange) {
      paginationProps.onPaginationChange(newPagination);
    }

    if (!paginationProps?.manualPagination) {
      setLocalPagination(newPagination);
    }
  };

  const handleSortingChange = (
    updaterOrValue: SortingState | ((old: SortingState) => SortingState),
  ) => {
    const newSorting =
      typeof updaterOrValue === 'function'
        ? (updaterOrValue as (old: SortingState) => SortingState)(sorting)
        : updaterOrValue;

    if (sortingProps?.onSortingChange) {
      sortingProps.onSortingChange(newSorting);
    }

    if (!sortingProps?.manualSorting) {
      setSorting(newSorting);
    }
  };

  const customGlobalFilter = useCallback(
    (row: Row<TData>) => {
      if (!globalFilter) return true;
      const lowerSearchTerm = globalFilter.toLowerCase();

      const searchableColumns =
        searchProps.searchableColumns ||
        columns
          .filter(
            (col): col is ColumnDef<TData> & { accessorKey: string } =>
              'accessorKey' in col && typeof col.accessorKey === 'string',
          )
          .map((col) => String(col.accessorKey)) ||
        columns.map((col) => col.id);

      // Check each searchable column
      return searchableColumns.some((columnId) => {
        const value = row.getValue(columnId);

        // Handle null/undefined
        if (value == null) return false;

        // Handle arrays
        if (Array.isArray(value)) {
          return value.some((item) => String(item).toLowerCase().includes(lowerSearchTerm));
        }

        // Handle objects
        if (typeof value === 'object') {
          return Object.values(value).some(
            (val) => val != null && String(val).toLowerCase().includes(lowerSearchTerm),
          );
        }

        // Handle primitive values
        return String(value).toLowerCase().includes(lowerSearchTerm);
      });
    },
    [globalFilter, searchProps.searchableColumns, columns],
  );

  // values
  const rowCount = totalRowCount || data.length;
  const fallbackData: TData[] = useMemo(() => [], []);

  const table = useReactTable({
    columns,
    data: data ?? fallbackData,
    rowCount,
    enableColumnResizing,
    columnResizeMode,
    getCoreRowModel: getCoreRowModel(),
    onPaginationChange: handlePaginationChange,
    manualPagination: paginationProps?.manualPagination ?? false,
    getPaginationRowModel: paginationProps ? getPaginationRowModel() : undefined,
    onSortingChange: handleSortingChange,
    manualSorting: sortingProps?.manualSorting ?? false,
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    globalFilterFn: customGlobalFilter,
    filterFns: {
      custom: customGlobalFilter,
    },
    pageCount:
      paginationProps?.pageCount || Math.ceil(data?.length / (paginationProps?.pageSize || 10)),
    state: {
      sorting:
        sortingProps?.manualSorting && sortingProps?.sorting ? sortingProps.sorting : sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
      pagination: paginationProps?.manualPagination
        ? { pageIndex: paginationProps.pageIndex, pageSize: paginationProps.pageSize }
        : localPagination,
    },
    onColumnFiltersChange: setColumnFilters,
    getRowCanExpand,
  });

  // Build default header context items from current table columns
  const buildDefaultHeaderContextItems = useCallback((): HeaderContextItem[] => {
    const cols = table.getAllColumns().filter((c) => c.getCanHide());

    return [
      // Column visibility toggles
      ...cols.map((column) => {
        const header = column.columnDef.header;
        const label =
          column.columnDef.meta?.label ??
          (typeof header === 'string'
            ? header
            : typeof header === 'function'
              ? column.id
              : (header ?? column.id));

        return {
          id: `col-${column.id}`,
          label,
          check: column.getIsVisible(),
          onClick: () => column.toggleVisibility(!column.getIsVisible()),
        };
      }),
    ];
  }, [table]);

  // Initialize header context items on mount and when columns change
  useEffect(() => {
    const defaults = buildDefaultHeaderContextItems();
    setHeaderContextItems(defaults);
  }, [buildDefaultHeaderContextItems, columnVisibility, columns]);

  return (
    <div className={cn('w-full h-full space-y-4 flex flex-col', className)}>
      {!customTopElement ? (
        <div className='flex flex-col md:flex-row gap-2 items-center justify-between select-none'>
          <div className='flex items-center gap-4 w-full justify-between'>
            {/* Title */}
            {title && (
              <h2
                className={cn('font-semibold', {
                  'text-3xl': titleSize === '3xl',
                  'text-2xl': titleSize === '2xl',
                  'text-xl': titleSize === 'xl',
                  'text-lg': titleSize === 'lg',
                  'text-base': titleSize === 'base',
                  'text-sm': titleSize === 'sm',
                })}
              >
                {title}
              </h2>
            )}

            {/* Button */}
            {button && <div className='flex items-center gap-2'>{button}</div>}
          </div>

          <div className='flex items-center gap-2'>
            {showColumnHider && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant='outline' size='icon' title='Toggle column visibility'>
                    <IconTable className='h-4 w-4' />
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align='end'>
                  {table
                    .getAllColumns()
                    .filter((column) => column.getCanHide())
                    .map((column) => {
                      const header = column.columnDef.header;
                      const label =
                        column.columnDef.meta?.label ??
                        (typeof header === 'string'
                          ? header
                          : typeof header === 'function'
                            ? column.id
                            : (header ?? column.id));

                      return (
                        <DropdownMenuCheckboxItem
                          key={column.id}
                          className='capitalize'
                          checked={column.getIsVisible()}
                          onCheckedChange={(value) => column.toggleVisibility(!!value)}
                        >
                          {label}
                        </DropdownMenuCheckboxItem>
                      );
                    })}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Search Input */}
            {searchProps && searchProps.onSearch && (
              <SearchInput
                onSearch={(value) => {
                  setIsSearching(true);

                  if (!searchProps.manualSearch) {
                    // For internal filtering, update the global filter
                    setGlobalFilter(value);
                  }

                  // For external search handling (API-based search)
                  if (searchProps.onSearch) {
                    searchProps.onSearch(value);
                  }
                }}
                placeholder={searchProps.placeholder || 'Search...'}
                initialValue={searchProps.initialValue || ''}
                className='w-full md:max-w-sm'
                delay={searchProps.delay || 200}
                isLoading={(isSearching || isLoading || isPlaceholder) && !!globalFilter}
              />
            )}
            {nextToSearchInput}
          </div>
        </div>
      ) : (
        <div className='w-full'>{customTopElement}</div>
      )}

      <div className='rounded-md border overflow-hidden'>
        {/* Remove nested flex containers to simplify the structure */}
        <div className='table-container'>
          <Table className='fixed-header-table'>
            <TableHeaderComponent
              headerContextItems={headerContextItems}
              headerGroups={table.getHeaderGroups()}
            />
            <TableBodyComponent
              table={table}
              emptyState={emptyState}
              isLoading={isLoading || isSearching}
              isPlaceholder={isPlaceholder}
              onClickRow={onClickRow}
              contextMenuActions={contextMenuActions}
              length={skeletonRowCount || paginationProps?.pageSize || 10}
              renderSubComponent={renderSubComponent}
            />
          </Table>
        </div>
      </div>

      {paginationProps && (
        <TablePagination
          pageIndex={paginationProps.pageIndex}
          pageSize={paginationProps.pageSize}
          pageCount={paginationProps.pageCount}
          totalItems={rowCount}
          onPaginationChange={handlePaginationChange}
          pageSizeOptions={paginationProps.pageSizeOptions}
        />
      )}
    </div>
  );
}

// Table Types
interface TablePaginationProps {
  pageIndex: number;
  pageSize: number;
  pageCount: number;
  onPaginationChange?: (pagination: TablePaginationState) => void;
  manualPagination?: boolean;
  pageSizeOptions?: number[];
}

interface TableSortingProps {
  sorting?: SortingState;
  onSortingChange?: (sorting: SortingState) => void;
  manualSorting?: boolean;
}

interface TableSearchProps {
  initialValue?: string;
  onSearch?: (value: string) => void;
  placeholder?: string;
  searchableColumns?: string[];
  manualSearch?: boolean;
  delay?: number;
}
