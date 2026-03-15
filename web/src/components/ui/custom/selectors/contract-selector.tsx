import { IconCheck, IconChevronDown, IconLoader2, IconX } from '@tabler/icons-react';
import { useState } from 'react';

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
import { useInfiniteContracts } from '@/queries/contract';
import { Contract } from '@/types';
import { DEFAULT_PLACEHOLDER_IMAGE } from '@/utils/image-utils';

interface ContractSelectorProps {
  selectedContracts: Contract[];
  onSelectionChange: (contracts: Contract[]) => void;
  multiSelect?: boolean;
  allowDuplicate?: boolean;
  showClearButton?: boolean;
  resultLimit?: number;
  trigger?: React.ReactNode;
}

export function ContractSelector({
  selectedContracts = [],
  onSelectionChange,
  multiSelect = false,
  allowDuplicate = false,
  showClearButton = true,
  resultLimit = 50,
  trigger,
}: ContractSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const {
    data: contractsResponse,
    isLoading,
    isPending,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteContracts({
    params: { search: searchTerm, limit: resultLimit },
    populate: ['payees'],
  });

  const { ref } = useInfiniteScroll({
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  });

  const contracts = contractsResponse?.pages.flat() || [];

  const handleContractSelect = (contract: Contract) => {
    // If duplicates are allowed, we ALWAYS append.
    // If not, we perform the standard toggle logic.

    if (allowDuplicate) {
      onSelectionChange([...selectedContracts, contract]);
      return;
    }

    const isSelected = selectedContracts.some((c) => c._id === contract._id);
    if (isSelected) {
      onSelectionChange(selectedContracts.filter((c) => c._id !== contract._id));
    } else {
      onSelectionChange(multiSelect ? [...selectedContracts, contract] : [contract]);
      if (!multiSelect) {
        setIsOpen(false);
        setSearchTerm('');
      }
    }
  };

  return (
    <div className='w-full'>
      <div className='flex items-center gap-2'>
        <Popover
          open={isOpen}
          onOpenChange={(open) => {
            // When in multiSelect/allowDuplicate mode, don't let Radix auto-close on item selection.
            // Closing is handled explicitly via onInteractOutside / onEscapeKeyDown on PopoverContent.
            if (multiSelect || allowDuplicate) {
              if (open) setIsOpen(true);
            } else {
              setIsOpen(open);
            }
          }}
        >
          <PopoverTrigger asChild>
            {trigger ? (
              trigger
            ) : (
              <Button
                variant='outline'
                role='combobox'
                className='w-full justify-between px-3' // Added justify-between
                disabled={isLoading || isPending}
              >
                {/* 1. Added min-w-0 to allow the container to shrink below its content size */}
                <div className='flex items-center gap-1 min-w-0 overflow-hidden'>
                  {selectedContracts.length === 0 ? (
                    <span className='text-muted-foreground'>Select contracts...</span>
                  ) : multiSelect ? (
                    // 2. Used a single flex container with truncate on the text element
                    <div className='flex items-center gap-2 min-w-0'>
                      <span className='truncate text-sm'>Select more...</span>
                      <Badge variant='default' className='text-[10px] h-4 px-1 shrink-0 uppercase'>
                        {selectedContracts.length}
                      </Badge>
                    </div>
                  ) : (
                    <span className='truncate font-medium'>{selectedContracts[0].title}</span>
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
            onFocusOutside={(e) => {
              // Prevent focus changes (e.g. caused by parent re-renders) from
              // closing the popover. Only actual outside pointer clicks should close.
              e.preventDefault();
            }}
            onEscapeKeyDown={() => setIsOpen(false)}
          >
            <Command shouldFilter={false}>
              {/* Let the API handle filtering */}
              <CommandInput
                placeholder='Search contracts...'
                value={searchTerm}
                onValueChange={setSearchTerm}
              />
              <CommandList className='max-h-75'>
                <CommandEmpty>{isLoading ? 'Searching...' : 'No contracts found.'}</CommandEmpty>
                <CommandGroup>
                  {contracts.map((contract) => {
                    // Calculate how many times this specific contract appears in the selection
                    const occurrenceCount = selectedContracts.filter(
                      (c) => c._id === contract._id,
                    ).length;

                    return (
                      <CommandItem
                        key={contract._id}
                        value={contract._id}
                        onSelect={() => handleContractSelect(contract)}
                        onPointerDown={(e) => e.preventDefault()}
                        className='p-0 aria-selected:bg-transparent'
                      >
                        <ContractListItem
                          contract={contract}
                          selectedCount={occurrenceCount}
                          allowDuplicate={allowDuplicate}
                        />
                      </CommandItem>
                    );
                  })}
                </CommandGroup>

                {/* Infinite Scroll Trigger */}
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

        {selectedContracts.length > 0 && showClearButton && (
          <Button
            title='Remove all selected contracts'
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

// Sub-component for the Individual Items
const ContractListItem = ({
  contract,
  selectedCount,
  allowDuplicate = false,
}: {
  contract: Contract;
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
      {/* Thumbnail with Overlay Check */}
      <div className='relative h-10 w-10 shrink-0'>
        <img
          src={typeof contract.image === 'string' ? contract.image : DEFAULT_PLACEHOLDER_IMAGE}
          alt=''
          className='h-full w-full rounded object-cover border'
        />
        {/* Visual indicator for duplicates */}
        {isSelected && (
          <div className='absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground ring-2 ring-background'>
            {allowDuplicate ? selectedCount : <IconCheck className='h-3 w-3' />}
          </div>
        )}
      </div>

      {/* Details */}
      <div className='flex-1 overflow-hidden'>
        <div className='flex items-center justify-between gap-2'>
          <p className='text-sm font-medium truncate'>{contract.title || 'Untitled'}</p>
          <Badge variant='outline' className='text-[10px] h-4 px-1 shrink-0 uppercase'>
            {contract.label?.name || 'No Label'}
          </Badge>
        </div>

        <div className='flex items-center gap-2 text-[11px] text-muted-foreground'>
          <span className='truncate'>{contract.upc || 'No UPC'}</span>
          {contract.payees && contract.payees.length > 0 && (
            <>
              <span>•</span>
              <span className='truncate italic'>
                {contract.payees[0].id?.name}
                {contract.payees.length > 1 && ` +${contract.payees.length - 1}`}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
