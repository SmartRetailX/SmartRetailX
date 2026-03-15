import { Skeleton } from '@/components/ui/skeleton';

interface RoyaltiesTableSkeletonProps {
  rows?: number;
}

export function RoyaltiesTableSkeleton({ rows = 3 }: RoyaltiesTableSkeletonProps) {
  return (
    <div className='rounded-md border'>
      <div className='p-4 space-y-4'>
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className='space-y-3'>
            {/* Table header skeleton */}
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-3'>
                <Skeleton className='h-4 w-4' />
                <Skeleton className='h-8 w-8 rounded-md' />
                <div className='space-y-1'>
                  <Skeleton className='h-4 w-32' />
                  <Skeleton className='h-3 w-20' />
                </div>
              </div>
              <div className='flex items-center gap-4'>
                <Skeleton className='h-4 w-12' />
                <Skeleton className='h-4 w-16' />
                <Skeleton className='h-4 w-16' />
                <Skeleton className='h-4 w-16' />
                <Skeleton className='h-4 w-20' />
                <Skeleton className='h-4 w-16' />
                <Skeleton className='h-4 w-20' />
              </div>
            </div>

            {/* Divider */}
            {index < rows - 1 && <div className='border-t' />}
          </div>
        ))}
      </div>
    </div>
  );
}
