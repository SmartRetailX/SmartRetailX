import { IconSearch, IconX } from '@tabler/icons-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSearch } from '@/hooks/use-search';
import { cn } from '@/lib/utils';

export function GlobalSearchBox() {
  const [isExpanded, setIsExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Search hook for consistent URL parameter handling
  const { searchValue, setSearchValue, clearSearch } = useSearch({
    addParam: false,
    onSearchChange: (value) => {},
  });

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
  };

  const handleClose = useCallback(() => {
    setIsExpanded(false);
    clearSearch();
  }, [clearSearch]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
  };

  // Focus input when expanded
  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isExpanded]);

  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    if (isExpanded) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isExpanded, handleClose]);

  return (
    <div className='relative flex items-center'>
      {/* Search Icon Button */}
      <Button
        variant='ghost'
        size='icon'
        onClick={handleToggle}
        className={cn(
          'h-9 w-9 transition-all duration-300 ease-in-out rounded-full',
          isExpanded && 'opacity-0 pointer-events-none',
        )}
        aria-label='Search'
      >
        <IconSearch className='h-4 w-4' />
      </Button>

      {/* Expandable Search Input */}
      <div
        className={cn(
          'absolute right-0 top-0 flex items-center transition-all duration-300 ease-in-out',
          isExpanded
            ? 'w-64 opacity-100 translate-x-0'
            : 'w-0 opacity-0 translate-x-2 pointer-events-none',
        )}
      >
        <form onSubmit={handleSearch} className='relative w-full'>
          <Input
            ref={inputRef}
            type='text'
            placeholder='Search...'
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className={cn(
              'w-full pl-4 h-9 text-sm rounded-full',
              // Remove all hover and active effects
              'hover:bg-transparent focus:ring-0 focus-visible:ring-0',
            )}
          />
          <div className='absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1'>
            <Button
              type='button'
              variant='ghost'
              size='icon'
              onClick={handleClose}
              className='h-7 w-7 hover:bg-muted rounded-full'
              aria-label='Close search'
            >
              <IconX className='h-3 w-3' />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
