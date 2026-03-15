import { useEffect } from 'react';
import { useInView } from 'react-intersection-observer';

interface UseInfiniteScrollProps {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  enabled?: boolean;
}

export function useInfiniteScroll({
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  enabled = true,
}: UseInfiniteScrollProps) {
  const { ref, inView } = useInView({
    rootMargin: '100px', // Trigger fetch slightly before reaching the element
  });

  useEffect(() => {
    if (enabled && inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [enabled, inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  return { ref, inView };
}
