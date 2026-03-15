import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface TablePaginationState {
  pageIndex: number;
  pageSize: number;
}

export interface TablePaginationProps {
  /**
   * Current page index (0-based)
   */
  pageIndex: number;

  /**
   * Number of items per page
   */
  pageSize: number;

  /**
   * Total number of pages
   */
  pageCount: number;

  /**
   * Total number of items across all pages
   */
  totalItems?: number;

  /**
   * Callback fired when pagination changes
   */
  onPaginationChange: (pagination: TablePaginationState) => void;

  /**
   * Available page size options
   */
  pageSizeOptions?: number[];

  /**
   * Custom class name for the container
   */
  className?: string;

  /**
   * Show the items per page selector
   */
  showPageSizeSelector?: boolean;

  /**
   * Label for page size selector
   */
  pageSizeLabel?: string;

  /**
   * Show the total items counter
   */
  showTotalItems?: boolean;

  /**
   * Maximum number of page buttons to show
   */
  maxPageButtons?: number;
}

export function TablePagination({
  pageIndex,
  pageSize,
  pageCount,
  totalItems,
  onPaginationChange,
  pageSizeOptions,
  className = '',
  showPageSizeSelector = true,
  pageSizeLabel = 'Rows per page',
  showTotalItems = true,
  maxPageButtons = 5,
}: TablePaginationProps) {
  // Generate page links for pagination
  const renderPageLinks = () => {
    const pageButtons = [];

    // Calculate start and end page numbers to display
    let startPage = Math.max(0, pageIndex - Math.floor(maxPageButtons / 2));
    const endPage = Math.min(pageCount - 1, startPage + maxPageButtons - 1);

    // Adjust start page if we're near the end
    if (endPage - startPage + 1 < maxPageButtons) {
      startPage = Math.max(0, endPage - maxPageButtons + 1);
    }

    // First page + ellipsis if needed
    if (startPage > 0) {
      pageButtons.push(
        <PaginationItem key='start'>
          <PaginationLink
            onClick={() =>
              onPaginationChange({
                pageIndex: 0,
                pageSize,
              })
            }
          >
            1
          </PaginationLink>
        </PaginationItem>,
      );

      if (startPage > 1) {
        pageButtons.push(
          <PaginationItem key='ellipsis-start'>
            <PaginationEllipsis />
          </PaginationItem>,
        );
      }
    }

    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
      pageButtons.push(
        <PaginationItem key={i}>
          <PaginationLink
            isActive={pageIndex === i}
            onClick={() =>
              onPaginationChange({
                pageIndex: i,
                pageSize,
              })
            }
          >
            {i + 1}
          </PaginationLink>
        </PaginationItem>,
      );
    }

    // Last page + ellipsis if needed
    if (endPage < pageCount - 1) {
      if (endPage < pageCount - 2) {
        pageButtons.push(
          <PaginationItem key='ellipsis-end'>
            <PaginationEllipsis />
          </PaginationItem>,
        );
      }

      pageButtons.push(
        <PaginationItem key='end'>
          <PaginationLink
            onClick={() =>
              onPaginationChange({
                pageIndex: pageCount - 1,
                pageSize,
              })
            }
          >
            {pageCount}
          </PaginationLink>
        </PaginationItem>,
      );
    }

    return pageButtons;
  };

  // Calculate visible item range
  const startItem = pageCount ? pageIndex * pageSize + 1 : 0;
  const endItem = Math.min((pageIndex + 1) * pageSize, totalItems || 0);

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 ${className}`}>
      {showPageSizeSelector && pageSizeOptions && (
        <div className='flex items-center gap-2'>
          <span className='text-sm text-muted-foreground'>{pageSizeLabel}</span>
          <Select
            value={String(pageSize)}
            onValueChange={(value) =>
              onPaginationChange({
                pageIndex: 0, // Reset to first page when changing page size
                pageSize: Number(value),
              })
            }
          >
            <SelectTrigger className='w-20'>
              <SelectValue placeholder={`${pageSize}`} />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className='flex items-center gap-2 justify-end w-full sm:w-auto sm:ml-auto'>
        {showTotalItems && totalItems !== undefined && (
          <div className='text-sm text-muted-foreground w-full text-right'>
            Showing {startItem}-{endItem} of {totalItems} items
          </div>
        )}

        <Pagination className='flex items-center gap-2 justify-end'>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() =>
                  onPaginationChange({
                    pageIndex: Math.max(0, pageIndex - 1),
                    pageSize,
                  })
                }
                aria-disabled={pageIndex === 0}
                className={
                  pageIndex === 0
                    ? 'pointer-events-none opacity-50'
                    : 'pointer-events-auto hover:cursor-pointer'
                }
              />
            </PaginationItem>

            {renderPageLinks()}

            <PaginationItem>
              <PaginationNext
                onClick={() =>
                  onPaginationChange({
                    pageIndex: Math.min(pageCount - 1, pageIndex + 1),
                    pageSize,
                  })
                }
                aria-disabled={pageIndex >= pageCount - 1}
                className={
                  pageIndex >= pageCount - 1
                    ? 'pointer-events-none opacity-50'
                    : 'pointer-events-auto hover:cursor-pointer'
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  );
}
