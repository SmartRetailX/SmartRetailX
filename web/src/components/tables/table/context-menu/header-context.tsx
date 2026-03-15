import { IconCheck } from '@tabler/icons-react'; // Import the check icon

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';

export type HeaderContextItem = {
  label: React.ReactNode;
  check?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  id?: string;
  divider?: boolean;
};

export function TableHeaderContextMenu({
  children,
  items,
}: {
  children: React.ReactNode;
  items: HeaderContextItem[];
}) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent>
        {items.map((item, index) => {
          const isOnlyOneChecked = items.filter((i) => i.check).length === 1 && item.check;

          return (
            <ContextMenuItem
              key={index}
              onClick={item.onClick}
              className='flex items-center justify-between'
              disabled={isOnlyOneChecked}
            >
              {item.label}
              {item.check && <IconCheck className='h-4 w-4 ml-2' />}{' '}
            </ContextMenuItem>
          );
        })}
      </ContextMenuContent>
    </ContextMenu>
  );
}
