import { IconArrowsSort, IconSortAscending, IconSortDescending } from '@tabler/icons-react';
import { Column } from '@tanstack/react-table';
import React from 'react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface SortableColumnHeaderProps<TData extends object> {
  column: Column<TData, unknown>;
  title: React.ReactNode;
  enabledSorting?: boolean;
  align?: 'left' | 'right' | 'center';
}

export const SortableColumnHeader = <TData extends object>({
  column,
  title,
  enabledSorting = true,
  align = 'left',
}: SortableColumnHeaderProps<TData>) => {
  const sortedState = column.getIsSorted(); // 'asc' | 'desc' | false

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={!enabledSorting}>
        <div
          className={cn(
            'flex items-center w-full select-none gap-2',
            align === 'right'
              ? 'justify-end'
              : align === 'center'
                ? 'justify-center'
                : 'justify-start',
          )}
        >
          {/* Title Text */}
          {title}

          {/* Sort Icons */}
          {column.getCanSort() && (
            <div className='h-4 w-4'>
              {sortedState === 'asc' && <IconSortAscending className='h-4 w-4' />}
              {sortedState === 'desc' && <IconSortDescending className='h-4 w-4' />}
              {!sortedState && <IconArrowsSort className='h-4 w-4 opacity-50' />}
            </div>
          )}
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='start'>
        <DropdownMenuItem onClick={() => column.toggleSorting(false)}>
          <IconSortAscending className='mr-2 h-3.5 w-3.5 text-muted-foreground' />
          <span>Sort A-Z</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => column.toggleSorting(true)}>
          <IconSortDescending className='mr-2 h-3.5 w-3.5 text-muted-foreground' />
          <span>Sort Z-A</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => column.clearSorting()}>
          <span>Reset</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
