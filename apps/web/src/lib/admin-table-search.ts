export type AdminTableSearch = {
  search?: string;
  page: number;
  limit: number;
};

type SearchInput = Record<string, unknown> | null | undefined;

const MAX_TABLE_LIMIT = 200;

function toInteger(value: unknown) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return undefined;
  }

  return Math.trunc(parsed);
}

export function normalizeSearchText(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

export function normalizeAdminTableSearch(
  search: SearchInput,
  defaultLimit: number,
): AdminTableSearch {
  const page = toInteger(search?.page);
  const limit = toInteger(search?.limit);

  return {
    search: normalizeSearchText(search?.search),
    page: page && page > 0 ? page : 1,
    limit: limit && limit > 0 ? Math.min(limit, MAX_TABLE_LIMIT) : defaultLimit,
  };
}

export function buildAdminTableSearch(search: AdminTableSearch): AdminTableSearch {
  return {
    ...(search.search ? { search: search.search } : {}),
    page: Math.max(1, search.page),
    limit: Math.min(Math.max(1, search.limit), MAX_TABLE_LIMIT),
  };
}
