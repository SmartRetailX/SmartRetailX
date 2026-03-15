import {
  type Icon,
  IconBell,
  IconBrandThreads,
  IconBrush,
  IconCreditCardPay,
  IconPlus,
  IconSearch,
  IconStar,
  IconUser,
} from '@tabler/icons-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface IconItem {
  name: string;
  icon: Icon;
  label: string;
}

const availableIcons: IconItem[] = [
  { name: 'User', icon: IconUser, label: 'User' },
  { name: 'Payment', icon: IconCreditCardPay, label: 'Payment' },
  { name: 'Art', icon: IconBrush, label: 'Art' },
  { name: 'Bell', icon: IconBell, label: 'Notifications' },
  { name: 'Star', icon: IconStar, label: 'Favorites' },
  { name: 'Search', icon: IconSearch, label: 'Search' },
  { name: 'Thread', icon: IconBrandThreads, label: 'Thread' },
].filter((item) => item.icon !== undefined);

export interface IconPickerProps {
  value?: string;
  onChange?: (iconName: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function IconPicker({
  value,
  onChange,
  disabled = false,
  placeholder = 'Select an icon',
  className,
}: IconPickerProps) {
  const [open, setOpen] = React.useState(false);

  const selectedIcon = React.useMemo(
    () => availableIcons.find((item) => item.name === value),
    [value],
  );

  const handleIconSelect = React.useCallback(
    (iconName: string) => {
      onChange?.(iconName);
      setOpen(false);
    },
    [onChange],
  );

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent, iconName: string) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleIconSelect(iconName);
      }
    },
    [handleIconSelect],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type='button'
          variant='outline'
          size='icon'
          disabled={disabled}
          className={cn(
            'w-10 h-10 flex items-center justify-center',
            !selectedIcon && 'text-muted-foreground',
            className,
          )}
          aria-label={selectedIcon ? `Selected icon: ${selectedIcon.label}` : placeholder}
        >
          {selectedIcon ? (
            <selectedIcon.icon size={20} aria-hidden='true' />
          ) : (
            <IconPlus size={20} aria-hidden='true' />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-[220px] p-2'>
        <div className='grid grid-cols-4 gap-2' role='grid' aria-label='Icon selection grid'>
          {availableIcons.map(({ name, icon: Icon, label }) => {
            const isSelected = value === name;
            return (
              <button
                key={name}
                type='button'
                role='gridcell'
                tabIndex={isSelected ? 0 : -1}
                onClick={() => handleIconSelect(name)}
                onKeyDown={(e) => handleKeyDown(e, name)}
                className={cn(
                  'flex flex-col items-center justify-center p-2 rounded-md border transition-colors',
                  'focus:outline-none',
                  isSelected
                    ? 'bg-primary/10 border-primary text-primary'
                    : 'hover:bg-muted border-border',
                )}
                aria-label={`Select ${label} icon`}
                aria-selected={isSelected}
              >
                <Icon size={20} aria-hidden='true' />
                <span className='text-[10px] mt-1 truncate' aria-hidden='true'>
                  {name}
                </span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export const iconMap: Record<string, Icon> = Object.fromEntries(
  availableIcons.map(({ name, icon }) => [name, icon]),
);

export function getIconComponent(iconName: string): Icon {
  return iconMap[iconName] || IconPlus;
}
