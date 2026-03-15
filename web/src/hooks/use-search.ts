import { useNavigate, useSearch as useRouterSearch } from '@tanstack/react-router';
import { useCallback, useEffect, useState } from 'react';

import { useDebounce } from './use-debounce';

export interface UseSearchOptions {
  /**
   * Whether to add/update search params in the URL
   * @default true
   */
  addParam?: boolean;
  /**
   * Debounce delay in milliseconds
   * @default 300
   */
  delay?: number;
  /**
   * Search parameter key in URL
   * @default 'search'
   */
  searchKey?: string;
  /**
   * Initial search value
   */
  initialValue?: string;
  /**
   * Callback fired when search value changes (debounced)
   */
  onSearchChange?: (value: string, previousValue?: string) => void;
  /**
   * Whether to clear search params when value is empty
   * @default true
   */
  clearOnEmpty?: boolean;
}

export interface UseSearchReturn {
  /**
   * Current search value
   */
  searchValue: string;
  /**
   * Debounced search value
   */
  debouncedSearchValue: string;
  /**
   * Function to update search value
   */
  setSearchValue: (value: string) => void;
  /**
   * Function to clear search value
   */
  clearSearch: () => void;
  /**
   * Whether search is currently active (has value)
   */
  isSearching: boolean;
}

/**
 * Hook for managing search functionality with URL search params integration
 *
 * @param options Configuration options for the search hook
 * @returns Search state and control functions
 *
 * @example
 * ```typescript
 * // Basic usage with URL params
 * const { searchValue, debouncedSearchValue, setSearchValue, clearSearch } = useSearch({
 *   addParam: true,
 *   onSearchChange: (value) => fetchData(value)
 * });
 *
 * // Usage without URL params
 * const { searchValue, debouncedSearchValue, setSearchValue } = useSearch({
 *   addParam: false,
 *   onSearchChange: (value) => filterLocalData(value)
 * });
 * ```
 */
export function useSearch(options: UseSearchOptions = {}): UseSearchReturn {
  const {
    addParam = true,
    delay = 300,
    searchKey = 'search',
    initialValue = '',
    onSearchChange,
    clearOnEmpty = true,
  } = options;

  const navigate = useNavigate();
  // Use strict: false to allow params not defined in the route
  const search = useRouterSearch({ strict: false });

  // Read search params with optional chaining and type casting
  const searchObj = search as Record<string, unknown>;

  // Get initial value from URL params or provided initial value
  const urlSearchValue = addParam ? (searchObj?.[searchKey] as string) || '' : '';
  const initialSearchValue = urlSearchValue || initialValue;

  // Local search state
  const [searchValue, setSearchValueState] = useState<string>(initialSearchValue);
  const [previousDebouncedValue, setPreviousDebouncedValue] = useState<string>(initialSearchValue);

  // Debounced search value
  const debouncedSearchValue = useDebounce(searchValue, delay);

  // Whether search is currently active
  const isSearching = searchValue.length > 0;

  /**
   * Update search value and optionally URL params
   */
  const setSearchValue = useCallback(
    (value: string) => {
      setSearchValueState(value);

      if (addParam) {
        // Using string-based navigation, which bypasses the type checking
        // This is a workaround for the TanStack Router typing limitations
        const params = new URLSearchParams(window.location.search);

        if (value.trim() === '' && clearOnEmpty) {
          // Remove search param when empty
          params.delete(searchKey);
        } else {
          // Update search param
          params.set(searchKey, value);
        }

        const path = window.location.pathname + '?' + params.toString();

        // Type assertion to string is safer than using 'any'
        navigate({ to: path as string, replace: true });
      }
    },
    [addParam, searchKey, clearOnEmpty, navigate],
  );

  /**
   * Clear search value
   */
  const clearSearch = useCallback(() => {
    setSearchValue('');
  }, [setSearchValue]);

  // Effect to handle debounced search changes
  useEffect(() => {
    // Only call onSearchChange if we have a callback
    if (onSearchChange) {
      onSearchChange(debouncedSearchValue, previousDebouncedValue);
      setPreviousDebouncedValue(debouncedSearchValue);
    }
  }, [debouncedSearchValue, onSearchChange, previousDebouncedValue]);

  // Effect to sync with URL params when they change externally
  useEffect(() => {
    if (addParam) {
      const currentUrlValue = (searchObj?.[searchKey] as string) || '';
      if (currentUrlValue !== searchValue) {
        setSearchValueState(currentUrlValue);
      }
    }
  }, [addParam, searchObj, searchKey, searchValue]);

  return {
    searchValue,
    debouncedSearchValue,
    setSearchValue,
    clearSearch,
    isSearching,
  };
}
