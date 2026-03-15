// Pagination and search parameters for API requests
export interface PaginationParams {
  limit?: number;
  offset?: number;
}

export interface DateRangeParams {
  from?: Date | undefined | null;
  to?: Date | undefined | null;
}

export interface SearchParams {
  search?: string;
}

export interface SeasonRangeParams {
  fromSeason?: string | null;
  toSeason?: string | null;
}

export interface DefaultQueryParams
  extends PaginationParams, SearchParams, DateRangeParams, SeasonRangeParams {}

export interface SeasonBoundaryQueryParams
  extends PaginationParams, SearchParams, SeasonRangeParams {}

// Sorting and filtering parameters for royalty uploads
export interface RoyaltyUploadQueryParams extends PaginationParams, SearchParams {
  status?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

// PaginationApiResponse interface for consistent API responses
export interface PaginationApiResponse<T> {
  data: T[];
  total: number;
}

// Default values for consistency
export const DEFAULT_PAGINATION = {
  limit: 10,
  offset: 0,
} as const;

export const DEFAULT_DATE_RANGE = {
  from: new Date(new Date().setFullYear(new Date().getFullYear() - 1)), // Default to one year ago
  to: new Date(), // Default to today
} as const;

export const DEFAULT_SEARCH = {
  search: '',
} as const;

// Default query parameters for API requests
export const DEFAULT_QUERY_PARAMS: DefaultQueryParams = {
  ...DEFAULT_PAGINATION,
  ...DEFAULT_SEARCH,
} as const;
