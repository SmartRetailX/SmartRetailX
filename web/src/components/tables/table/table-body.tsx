import { flexRender, Row, useReactTable } from '@tanstack/react-table';
import { Fragment } from 'react';

import {
  ContextMenuAction,
  TableRowContextMenu,
} from '@/components/tables/table-partials/context-menu';
import { TableBody, TableCell, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

export const TableBodyComponent = <TData extends object>({
  table,
  emptyState,
  isLoading,
  isPlaceholder,
  length = 10,
  onClickRow = () => {},
  contextMenuActions = [],
  renderSubComponent,
}: {
  table: ReturnType<typeof useReactTable<TData>>;
  emptyState: React.ReactNode;
  isLoading?: boolean;
  isPlaceholder?: boolean;
  length?: number;
  onClickRow?: (row: Row<TData>) => void;
  contextMenuActions?: ContextMenuAction<TData>[];
  renderSubComponent?: (props: { row: Row<TData> }) => React.ReactNode;
}) => {
  if (isLoading || isPlaceholder) {
    // Create a skeleton loading effect with multiple rows
    const columnCount = table.getAllColumns().length;

    return (
      <TableBody>
        {Array.from({ length: length === 0 ? 10 : length }).map((_, rowIndex) => (
          <TableRow key={`skeleton-row-${rowIndex}`} className='animate-pulse'>
            {Array.from({ length: columnCount }).map((_, colIndex) => (
              <TableCell key={`skeleton-cell-${rowIndex}-${colIndex}`}>
                <div className='h-5 bg-muted/30 rounded w-[80%]'></div>
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    );
  }

  return (
    <TableBody>
      {table.getRowModel().rows?.length ? (
        table.getRowModel().rows.map((row) => {
          const mainRow = (
            <TableRow
              data-state={row.getIsSelected() && 'selected'}
              className={cn(
                'cursor-pointer transition-colors hover:bg-muted/50 border-b',
                row.getIsSelected() && 'bg-muted/50',
              )}
              onClick={() => onClickRow(row)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onClickRow(row);
                }
              }}
            >
              {row.getVisibleCells().map((cell) => (
                <TableCell
                  key={cell.id}
                  style={{
                    width: cell.column.getSize(),
                    minWidth: cell.column.columnDef.minSize,
                    maxWidth: cell.column.columnDef.maxSize,
                  }}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          );

          return (
            <Fragment key={row.id}>
              {contextMenuActions.length > 0 ? (
                <TableRowContextMenu row={row} actions={contextMenuActions}>
                  {mainRow}
                </TableRowContextMenu>
              ) : (
                mainRow
              )}
              {row.getIsExpanded() && renderSubComponent && (
                <TableRow>
                  <TableCell colSpan={row.getVisibleCells().length} className='p-0 border-b'>
                    {renderSubComponent({ row })}
                  </TableCell>
                </TableRow>
              )}
            </Fragment>
          );
        })
      ) : (
        <TableRow>
          <TableCell
            colSpan={table.getAllColumns().length}
            className='h-24 text-center text-gray-500'
          >
            {emptyState}
          </TableCell>
        </TableRow>
      )}
    </TableBody>
  );
};
