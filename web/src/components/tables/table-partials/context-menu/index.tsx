import { Row } from '@tanstack/react-table';
import React from 'react';

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';

export interface ContextMenuAction<TData> {
  label: string;
  onClick: (row: Row<TData>) => void;
  show?: (row: Row<TData>) => boolean;
  disabled?: boolean | ((row: Row<TData>) => boolean);
  className?: string;
  icon?: React.ReactNode;
}

interface TableRowContextMenuProps<TData> {
  row: Row<TData>;
  actions: ContextMenuAction<TData>[];
  children: React.ReactNode;
  className?: string;
}

export function TableRowContextMenu<TData>({
  row,
  actions,
  children,
  className = '',
}: TableRowContextMenuProps<TData>) {
  const filteredActions = actions.filter((action) => {
    if (typeof action.show === 'function') {
      return action.show(row);
    }
    return action.show !== false;
  });

  if (filteredActions.length === 0) {
    return <>{children}</>;
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className={className}>
        {filteredActions.map((action, index) => {
          const isDisabled =
            typeof action.disabled === 'function' ? action.disabled(row) : action.disabled;
          return (
            <ContextMenuItem
              key={`${action.label}-${index}`}
              onClick={() => !isDisabled && action.onClick(row)}
              className={`${action.className ?? ''} ${isDisabled ? 'opacity-50 pointer-events-none' : ''}`}
              disabled={isDisabled}
            >
              {action.icon && <span className='mr-2'>{action.icon}</span>}
              {action.label}
            </ContextMenuItem>
          );
        })}
      </ContextMenuContent>
    </ContextMenu>
  );
}
