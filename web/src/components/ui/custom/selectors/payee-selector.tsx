import { IconCheck, IconChevronDown, IconLoader2, IconX } from '@tabler/icons-react';
import { useMemo, useState } from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useInfiniteScroll } from '@/hooks';
import { cn } from '@/lib/utils';
import { useInfinitePayees, useInfinitePayeesForSplits } from '@/queries/payee';
import { Payee } from '@/types/payee';

interface PayeeSelectorProps {
  selectedPayees: Payee[];
  onSelectionChange: (payees: Payee[]) => void;
  multiSelect?: boolean;
  allowDuplicate?: boolean;
  showClearButton?: boolean;
  resultLimit?: number;
  className?: string;
  placeholder?: string;
  trigger?: React.ReactNode;
  dataSource?: 'default' | 'for-splits';
}
export function PayeeSelector({
  selectedPayees = [],
  onSelectionChange,
  multiSelect = false,
  allowDuplicate = false,
  showClearButton = true,
  resultLimit = 50,
  className,
  placeholder = 'Select payees...',
  trigger,
  dataSource = 'default',
}: PayeeSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const defaultQuery = useInfinitePayees(
    {
      search: searchTerm,
      limit: resultLimit,
    },
    { enabled: dataSource === 'default' },
  );

  const splitsQuery = useInfinitePayeesForSplits(
    {
      search: searchTerm,
      limit: resultLimit,
    },
    { enabled: dataSource === 'for-splits' },
  );

  const {
    data: infiniteData,
    isLoading,
    isPending,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = dataSource === 'for-splits' ? splitsQuery : defaultQuery;

  const payees = useMemo(
    () => infiniteData?.pages.flatMap((page) => page.data) || [],
    [infiniteData],
  );

  const { ref } = useInfiniteScroll({
    hasNextPage: !!hasNextPage,
    isFetchingNextPage,
    fetchNextPage: () => {
      void fetchNextPage();
    },
  });

  const handlePayeeSelect = (payee: Payee) => {
    if (allowDuplicate) {
      onSelectionChange([...selectedPayees, payee]);
      return;
    }

    const isSelected = selectedPayees.some((selectedPayee) => selectedPayee._id === payee._id);

    if (isSelected) {
      onSelectionChange(selectedPayees.filter((selectedPayee) => selectedPayee._id !== payee._id));
    } else {
      onSelectionChange(multiSelect ? [...selectedPayees, payee] : [payee]);
      if (!multiSelect) {
        setIsOpen(false);
        setSearchTerm('');
      }
    }
  };

  return (
    <div className={cn('w-full', className)}>
      <div className='flex items-center gap-2'>
        <Popover
          open={isOpen}
          onOpenChange={(open) => {
            if (multiSelect || allowDuplicate) {
              if (open) setIsOpen(true);
            } else {
              setIsOpen(open);
            }
          }}
          modal
        >
          <PopoverTrigger asChild>
            {trigger ? (
              trigger
            ) : (
              <Button
                variant='outline'
                role='combobox'
                aria-expanded={isOpen}
                className='w-full justify-between h-auto min-h-12.5 px-3 py-2 bg-background hover:bg-accent/50 group'
                disabled={isLoading && !payees.length}
              >
                <div className='flex items-center gap-1 min-w-0 overflow-hidden'>
                  {selectedPayees.length === 0 ? (
                    <span className='text-muted-foreground'>{placeholder}</span>
                  ) : multiSelect ? (
                    <div className='flex items-center gap-2 min-w-0'>
                      <span className='truncate text-sm'>Select more...</span>
                      <Badge variant='default' className='text-[10px] h-4 px-1 shrink-0 uppercase'>
                        {selectedPayees.length}
                      </Badge>
                    </div>
                  ) : (
                    <div className='flex items-center gap-2 min-w-0'>
                      <Avatar className='h-6 w-6 border shrink-0'>
                        <AvatarImage src={selectedPayees[0].image} alt={selectedPayees[0].name} />
                        <AvatarFallback>
                          {selectedPayees[0].name?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className='truncate font-medium'>{selectedPayees[0].name}</span>
                    </div>
                  )}

                  {(isLoading || isPending) && selectedPayees.length === 0 && (
                    <IconLoader2 className='ml-2 h-4 w-4 animate-spin text-muted-foreground' />
                  )}
                </div>

                <IconChevronDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
              </Button>
            )}
          </PopoverTrigger>
          <PopoverContent
            className='w-100 p-0'
            align='start'
            onPointerDownOutside={() => setIsOpen(false)}
            onFocusOutside={(event) => {
              event.preventDefault();
            }}
            onEscapeKeyDown={() => setIsOpen(false)}
          >
            <Command shouldFilter={false}>
              <CommandInput
                placeholder='Search by name or email...'
                value={searchTerm}
                onValueChange={setSearchTerm}
              />
              <CommandList className='max-h-75 overflow-y-auto'>
                <CommandEmpty>
                  {isLoading || isPending ? (
                    <div className='flex items-center justify-center py-6 text-sm text-muted-foreground'>
                      <IconLoader2 className='h-4 w-4 animate-spin mr-2' />
                      Searching...
                    </div>
                  ) : (
                    <div className='py-6 text-center text-sm text-muted-foreground'>
                      No payees found.
                    </div>
                  )}
                </CommandEmpty>
                <CommandGroup>
                  {payees.map((payee) => {
                    const selectedCount = selectedPayees.filter(
                      (selectedPayee) => selectedPayee._id === payee._id,
                    ).length;

                    return (
                      <CommandItem
                        key={payee._id}
                        value={payee._id}
                        onSelect={() => handlePayeeSelect(payee)}
                        onPointerDown={(event) => event.preventDefault()}
                        className='p-0 aria-selected:bg-transparent'
                      >
                        <PayeeListItem
                          payee={payee}
                          selectedCount={selectedCount}
                          allowDuplicate={allowDuplicate}
                        />
                      </CommandItem>
                    );
                  })}
                </CommandGroup>

                {hasNextPage && (
                  <CommandGroup>
                    <CommandItem
                      ref={ref}
                      disabled
                      className='justify-center text-xs font-medium aria-selected:bg-transparent'
                    >
                      <div className='flex items-center justify-center gap-2'>
                        <IconLoader2 className='h-3 w-3 animate-spin' />
                        Loading more...
                      </div>
                    </CommandItem>
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {showClearButton && selectedPayees.length > 0 && (
          <Button
            title='Remove all selected payees'
            variant='ghost'
            size='icon'
            onClick={() => onSelectionChange([])}
            className='shrink-0 hover:bg-destructive/10 hover:text-destructive'
          >
            <IconX className='h-4 w-4' />
          </Button>
        )}
      </div>
    </div>
  );
}

const PayeeListItem = ({
  payee,
  selectedCount,
  allowDuplicate = false,
}: {
  payee: Payee;
  selectedCount: number;
  allowDuplicate?: boolean;
}) => {
  const isSelected = selectedCount > 0;

  return (
    <div
      className={cn(
        'flex items-center gap-3 w-full p-2 transition-colors rounded-md',
        isSelected ? 'bg-primary/5' : 'hover:bg-accent',
      )}
    >
      <div className='relative h-10 w-10 shrink-0'>
        <Avatar className='h-10 w-10 border'>
          <AvatarImage src={payee.image} alt={payee.name} />
          <AvatarFallback>{payee.name?.[0]?.toUpperCase()}</AvatarFallback>
        </Avatar>

        {isSelected && (
          <div className='absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground ring-2 ring-background'>
            {allowDuplicate ? selectedCount : <IconCheck className='h-3 w-3' />}
          </div>
        )}
      </div>

      <div className='flex-1 overflow-hidden'>
        <div className='flex items-center justify-between gap-2'>
          <p className='text-sm font-medium truncate'>{payee.name || 'Unknown payee'}</p>
          {payee.type && (
            <Badge variant='outline' className='text-[10px] h-4 px-1 shrink-0 uppercase'>
              {payee.type}
            </Badge>
          )}
        </div>

        <div className='flex items-center gap-2 text-[11px] text-muted-foreground'>
          <span className='truncate'>{payee.email || 'No email'}</span>
        </div>
      </div>
    </div>
  );
};
