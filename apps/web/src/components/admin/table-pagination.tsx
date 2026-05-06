import { type Table } from '@tanstack/react-table';
import { Check, ChevronDown } from 'lucide-react';

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
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

type TablePaginationProps<TData> = {
  table: Table<TData>;
  totalPages: number;
  pageSizeOptions?: number[];
};

export function TablePagination<TData>({
  table,
  totalPages,
  pageSizeOptions = [10, 12, 25, 50, 100],
}: TablePaginationProps<TData>) {
  const currentPage = table.getState().pagination.pageIndex;
  const pageSize = table.getState().pagination.pageSize;
  const pageCount = Math.max(totalPages, 1);
  const allPages = Array.from({ length: pageCount }, (_, index) => index);
  const sizeOptions = Array.from(new Set([...pageSizeOptions, pageSize])).sort((a, b) => a - b);
  const compactPages = pageCount <= 5 ? allPages : [0, 1, pageCount - 2, pageCount - 1];

  const renderPageButton = (page: number) => (
    <PaginationItem key={page}>
      <PaginationLink
        key={page}
        isActive={page === currentPage}
        size="icon-sm"
        onClick={() => table.setPageIndex(page)}
      >
        {page + 1}
      </PaginationLink>
    </PaginationItem>
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Pagination className="w-auto">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            />
          </PaginationItem>

          {pageCount <= 5 ? (
            compactPages.map(renderPageButton)
          ) : (
            <>
              {compactPages.slice(0, 2).map(renderPageButton)}
              <PaginationItem>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button variant="outline" size="sm" className="min-w-24 justify-between">
                        Page {currentPage + 1}
                        <ChevronDown data-icon="inline-end" />
                      </Button>
                    }
                  />
                  <DropdownMenuContent align="center" className="max-h-72 w-40">
                    <DropdownMenuGroup>
                      <DropdownMenuLabel>Jump to page</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {allPages.map((page) => (
                        <DropdownMenuItem
                          key={page}
                          onClick={() => table.setPageIndex(page)}
                          className="cursor-pointer justify-between"
                        >
                          Page {page + 1}
                          {page === currentPage && <Check />}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </PaginationItem>
              <PaginationItem>
                <PaginationEllipsis />
              </PaginationItem>
              {compactPages.slice(2).map(renderPageButton)}
            </>
          )}

          <PaginationItem>
            <PaginationNext onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} />
          </PaginationItem>
        </PaginationContent>
      </Pagination>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="outline" size="sm" className="ml-1 min-w-24 justify-between">
              Rows {pageSize}
              <ChevronDown data-icon="inline-end" />
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="w-36">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Rows per page</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {sizeOptions.map((size) => (
              <DropdownMenuItem
                key={size}
                onClick={() => table.setPagination({ pageIndex: 0, pageSize: size })}
                className="cursor-pointer justify-between"
              >
                {size} rows
                {size === pageSize && <Check />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
