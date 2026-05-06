import { flexRender, type Table } from '@tanstack/react-table';
import { PackageSearch } from 'lucide-react';

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Table as UiTable,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

type DataTableCardProps<TData> = {
  title: string;
  description?: string;
  table: Table<TData>;
  toolbar?: React.ReactNode;
  footer?: React.ReactNode;
  isLoading?: boolean;
  emptyMessage?: string;
  tableClassName?: string;
};

export function DataTableCard<TData>({
  title,
  description,
  table,
  toolbar,
  footer,
  isLoading,
  emptyMessage = 'No rows available.',
  tableClassName,
}: DataTableCardProps<TData>) {
  const rows = table.getRowModel().rows;
  const visibleColumns = table.getVisibleLeafColumns().length;

  return (
    <Card className="flex h-full min-h-0 flex-col overflow-hidden shadow-sm">
      <CardHeader className="border-b border-border/60 bg-muted/20">
        <CardTitle className="truncate">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
        {toolbar && <CardAction>{toolbar}</CardAction>}
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
        <div className="min-h-0 flex-1 overflow-auto">
          <UiTable className={cn('min-w-[760px]', tableClassName)}>
            <TableHeader className="sticky top-0 z-10 bg-muted/70 backdrop-blur">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow
                  key={headerGroup.id}
                  className="border-b border-border/60 hover:bg-transparent"
                >
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className="h-11 px-4 text-xs font-semibold uppercase text-muted-foreground"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <>
                  {Array.from({ length: 6 }).map((_, rowIndex) => (
                    <TableRow key={rowIndex} className="hover:bg-transparent">
                      {table.getVisibleLeafColumns().map((column) => (
                        <TableCell key={column.id} className="px-4 py-3">
                          <Skeleton className="h-5 w-full max-w-40" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={visibleColumns} className="px-4 py-4 text-center">
                      <Spinner className="h-6 w-6" />
                    </TableCell>
                  </TableRow>
                </>
              ) : rows.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={visibleColumns} className="px-4 py-12">
                    <Empty>
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <PackageSearch />
                        </EmptyMedia>
                        <EmptyTitle>No records found</EmptyTitle>
                        <EmptyDescription>{emptyMessage}</EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="border-b border-border/40 align-middle transition-colors hover:bg-muted/35"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="px-4 py-3">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </UiTable>
        </div>

        {footer && (
          <CardFooter className="rounded-none border-t border-border/60 bg-muted/20 px-4 py-3">
            {footer}
          </CardFooter>
        )}
      </CardContent>
    </Card>
  );
}
