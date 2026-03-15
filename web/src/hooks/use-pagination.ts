import { useNavigate, useSearch } from '@tanstack/react-router';

import { useTableSettingStore } from '@/store/table-settings.store';

interface UsePaginationOptions {
  defaultOffset?: number;
  defaultLimit?: number;
  tableId?: string;
  paramPrefix?: string; // Add this to create table-specific URL params
}

export function usePagination({
  defaultOffset = 0,
  defaultLimit = 10,
  tableId,
  paramPrefix = '', // Default to empty string for backward compatibility
}: UsePaginationOptions = {}) {
  // Use strict: false to allow params not defined in the route
  const search = useSearch({ strict: false });
  const navigate = useNavigate();
  // Always call hooks unconditionally
  const { getTablePageSize } = useTableSettingStore();

  // Read search params with optional chaining and type casting
  const searchObj = search as Record<string, unknown>;

  // Create parameter names with optional prefix
  const offsetParam = paramPrefix ? `${paramPrefix}_offset` : 'offset';
  const limitParam = paramPrefix ? `${paramPrefix}_limit` : 'limit';

  // Get pagination values, handling undefined and NaN cases
  const offsetStr = searchObj?.[offsetParam] as string | undefined;
  const limitStr = searchObj?.[limitParam] as string | undefined;

  // If we have a tableId, use the stored page size as default
  const storedPageSize = tableId ? getTablePageSize(tableId, defaultLimit) : defaultLimit;

  const offset = offsetStr
    ? isNaN(Number(offsetStr))
      ? defaultOffset
      : Number(offsetStr)
    : defaultOffset;
  const limit = limitStr
    ? isNaN(Number(limitStr))
      ? storedPageSize
      : Number(limitStr)
    : storedPageSize;

  const safeOffset = Number.isFinite(offset) ? Math.max(0, offset) : defaultOffset;
  const safeLimit = Number.isFinite(limit) && limit > 0 ? limit : storedPageSize;

  const pageIndex = Math.max(0, Math.floor(safeOffset / safeLimit));
  const pageSize = safeLimit;

  const handlePaginationChange = ({
    pageIndex,
    pageSize,
  }: {
    pageIndex: number;
    pageSize: number;
  }) => {
    const newOffset = pageIndex * pageSize;

    // Using string-based navigation, which bypasses the type checking
    // This is a workaround for the TanStack Router typing limitations
    const params = new URLSearchParams(window.location.search);
    params.set(offsetParam, newOffset.toString());
    params.set(limitParam, pageSize.toString());

    const path = window.location.pathname + '?' + params.toString();

    // Type assertion to string is safer than using 'any'
    navigate({ to: path as string, replace: true });
  };

  const resetOffset = (newOffset = defaultOffset) => {
    const normalizedOffset = Number.isFinite(newOffset) ? Math.max(0, newOffset) : defaultOffset;

    const params = new URLSearchParams(window.location.search);
    params.set(offsetParam, normalizedOffset.toString());

    if (!params.get(limitParam)) {
      params.set(limitParam, pageSize.toString());
    }

    const path = window.location.pathname + '?' + params.toString();
    navigate({ to: path as string, replace: true });
  };

  return {
    offset: safeOffset,
    limit: safeLimit,
    pageIndex,
    pageSize,
    handlePaginationChange,
    resetOffset,
  };
}
