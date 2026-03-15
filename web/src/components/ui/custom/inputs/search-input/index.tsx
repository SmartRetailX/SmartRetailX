import { IconLoader, IconSearch } from '@tabler/icons-react';
import React, { ChangeEvent, useEffect, useState } from 'react';

import { Input } from '@/components/ui/input';
import { useDebounce } from '@/hooks/use-debounce';

interface SearchInputProps {
  onSearch?: (value: string) => void;
  placeholder?: string;
  delay?: number;
  className?: string;
  initialValue?: string;
  isLoading?: boolean;
}

export function SearchInput({
  onSearch,
  placeholder = 'Search...',
  delay = 500,
  className = 'w-full max-w-sm',
  initialValue = '',
  isLoading = false,
}: SearchInputProps) {
  const [inputValue, setInputValue] = useState(initialValue);
  const debouncedValue = useDebounce(inputValue, delay);

  // Store previous value to avoid unnecessary callbacks
  const prevValueRef = React.useRef(debouncedValue);

  // Handle input change
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  // Call onSearch callback whenever debounced value changes
  useEffect(() => {
    // Only trigger the onSearch callback if the value has actually changed
    if (debouncedValue !== prevValueRef.current) {
      prevValueRef.current = debouncedValue;
      onSearch?.(debouncedValue);
    }
  }, [debouncedValue, onSearch]);

  return (
    <div className={`relative ${className}`}>
      <IconSearch className='absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground' />

      <Input
        type='search'
        placeholder={placeholder}
        className={`pl-8 h-8 ${isLoading && inputValue ? 'pr-8' : ''}`}
        value={inputValue}
        onChange={handleChange}
      />

      {isLoading && inputValue && (
        <div className='absolute right-2.5 top-2.5'>
          <div className='h-4 w-4'>
            <IconLoader className='h-4 w-4 animate-spin text-muted-foreground' />
          </div>
        </div>
      )}
    </div>
  );
}
