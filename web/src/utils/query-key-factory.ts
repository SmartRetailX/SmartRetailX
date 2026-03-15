import { DefaultQueryParams } from '@/types/api';
import { normalizeParams } from '@/utils/query-param-utils';

type Params = DefaultQueryParams;
type Id = string | number;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Options = Record<string, any>;

export const createQueryKeys = <T extends string>(root: T) => {
  const base = [root] as const;

  return {
    // ['resource']
    all: base,

    // ['resource', 'list'] or ['resource', 'list', normalizedParams]
    list: (params?: Params) => {
      if (params && Object.keys(params).length > 0) {
        return [root, 'list', normalizeParams(params)] as const;
      }
      return [root, 'list'] as const;
    },

    // ['resource', 'listByIds', ids] or ['resource', 'listByIds', ids, normalizedParams]
    listByIds: (ids: Id[], params?: Params) => {
      if (params && Object.keys(params).length > 0) {
        return [root, 'listByIds', ids, normalizeParams(params)] as const;
      }
      return [root, 'listByIds', ids] as const;
    },

    // ['resource', 'detail', id]
    detail: (id: Id, options?: Options) => [root, 'detail', id, options] as const,

    // ['resource', 'items', id] or ['resource', 'items', id, normalizedParams]
    items: (id: Id, params?: Params) => {
      if (params && Object.keys(params).length > 0) {
        return [root, 'items', id, normalizeParams(params)] as const;
      }
      return [root, 'items', id] as const;
    },

    // For infinite queries: ['resource', 'infinite', normalizedParams?]
    infinite: (params?: Params) => {
      if (params && Object.keys(params).length > 0) {
        return [root, 'infinite', normalizeParams(params)] as const;
      }
      return [root, 'infinite'] as const;
    },

    // convenience: details key without id (for invalidation of all details)
    details: () => [root, 'detail'] as const,
  };
};
