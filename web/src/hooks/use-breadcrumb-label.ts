import { useEffect } from 'react';

import { useBreadcrumbStore } from '@/store/breadcrumb.store';

/**
 * Sets a human-readable label for a dynamic URL segment in the breadcrumb.
 *
 * Call this in any detail page to replace the raw ID with a meaningful name.
 * The label is automatically cleared when the component unmounts.
 *
 * @param segmentValue - The raw URL segment value (e.g. the entity ID)
 * @param label - The display label (e.g. entity name/title). Pass `undefined` while loading.
 *
 * @example
 * ```tsx
 * const { contractId } = Route.useParams();
 * const { data: contract } = useGetContract(contractId);
 * useBreadcrumbLabel(contractId, contract?.title);
 * ```
 */
export function useBreadcrumbLabel(segmentValue: string, label: string | undefined) {
  const setLabel = useBreadcrumbStore((s) => s.setLabel);
  const clearLabel = useBreadcrumbStore((s) => s.clearLabel);

  useEffect(() => {
    if (label) {
      setLabel(segmentValue, label);
    }

    return () => {
      clearLabel(segmentValue);
    };
  }, [segmentValue, label, setLabel, clearLabel]);
}
