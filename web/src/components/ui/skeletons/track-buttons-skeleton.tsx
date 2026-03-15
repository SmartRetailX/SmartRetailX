import { Skeleton } from '@/components/ui/skeleton';

export function TrackButtonsSkeleton() {
  return (
    <div className='flex flex-wrap items-center gap-2'>
      {/* All tracks skeleton */}
      <Skeleton className='h-8 w-24' />

      {/* Track buttons skeleton */}
      {Array.from({ length: 0 }).map((_, index) => (
        <Skeleton key={index} className='h-8 w-32' />
      ))}

      {/* Plus button skeleton */}
      <Skeleton className='h-8 w-8' />
    </div>
  );
}
