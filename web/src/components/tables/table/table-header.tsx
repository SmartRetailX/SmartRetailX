import { flexRender, HeaderGroup } from '@tanstack/react-table';

import { SortableColumnHeader } from '@/components/tables/table-partials/headers/sortable-header';
import { TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DEFAULT_RIGHT_ALIGNED_COLUMNS } from '@/configs/table-config';

import { HeaderContextItem, TableHeaderContextMenu } from './context-menu/header-context';

interface TableHeaderComponentProps<TData extends object> {
  headerGroups: HeaderGroup<TData>[];
  headerContextItems?: HeaderContextItem[];
}

export const TableHeaderComponent = <TData extends object>({
  headerGroups,
  headerContextItems = [],
}: TableHeaderComponentProps<TData>) => {
  return (
    <TableHeader className='bg-background'>
      {headerGroups.map((headerGroup) => (
        <TableRow key={headerGroup.id} className='border-b'>
          {headerGroup.headers.map((header) => {
            // Determine if the column can be sorted
            const canSort = header.column.getCanSort();

            // Get header content - could be string, function or React element
            const headerContent = flexRender(header.column.columnDef.header, header.getContext());

            // Determine alignment from column definition
            let align: 'left' | 'right' | 'center' = 'left';

            // Check if there's an align property in the column meta
            if (header.column.columnDef.meta && 'align' in header.column.columnDef.meta) {
              align = header.column.columnDef.meta.align as 'left' | 'right' | 'center';
            }

            // Try to infer alignment from column id or header
            const columnId = header.column.id.toLowerCase();
            if (DEFAULT_RIGHT_ALIGNED_COLUMNS.some((col) => columnId.includes(col))) {
              align = 'right';
            }

            return (
              <TableHeaderContextMenu key={header.id} items={headerContextItems}>
                <TableHead
                  style={{
                    width: header.getSize(),
                    minWidth: header.column.columnDef.minSize || '100px',
                    maxWidth: header.column.columnDef.maxSize,
                    position: 'relative', // For proper positioning of the resizer
                  }}
                >
                  {header.isPlaceholder ? null : (
                    <SortableColumnHeader
                      column={header.column}
                      title={headerContent}
                      align={align}
                      enabledSorting={canSort}
                    />
                  )}

                  {/* Resizer */}
                  {header.column.getCanResize() && (
                    <div
                      onMouseDown={header.getResizeHandler()}
                      onTouchStart={header.getResizeHandler()}
                      className={`resizer absolute right-0 top-0 h-full w-1 cursor-col-resize bg-transparent hover:bg-primary transition-colors ${
                        header.column.getIsResizing() ? 'isResizing bg-primary' : ''
                      }`}
                    />
                  )}
                </TableHead>
              </TableHeaderContextMenu>
            );
          })}
        </TableRow>
      ))}
    </TableHeader>
  );
};
