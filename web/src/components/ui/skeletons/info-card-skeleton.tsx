import { Card } from '@/components/ui/card';

export function InfoCardSkeleton() {
  return (
    <Card className='relative w-full p-4 h-full overflow-hidden rounded-lg flex flex-col md:flex-row items-center gap-4 drop-shadow-lg animate-pulse'>
      {/* Gradient overlay */}
      <div className='absolute bottom-0 left-0 w-full h-2/3 bg-gradient-to-t from-black/5 to-transparent pointer-events-none z-10' />

      {/* Image placeholder */}
      <div className='w-[190px] h-[190px] flex-shrink-0 bg-gray-300 dark:bg-gray-700 rounded-md' />

      {/* Content section */}
      <div className='flex flex-col justify-between flex-1 min-w-0 overflow-hidden h-full py-1 relative z-20'>
        {/* Top section */}
        <div>
          <div className='flex items-center justify-between mb-0.5'>
            <div className='h-4 w-24 bg-gray-300 dark:bg-gray-700 rounded' />
            <div className='h-4 w-12 bg-gray-300 dark:bg-gray-700 rounded' />
          </div>
          <div className='h-6 w-48 bg-gray-300 dark:bg-gray-700 rounded mb-1' />
          <div className='h-4 w-32 bg-gray-300 dark:bg-gray-700 rounded mb-1' />
          <div className='h-4 w-40 bg-gray-300 dark:bg-gray-700 rounded' />
        </div>

        {/* Middle section */}
        <div className='flex flex-col gap-2 mt-3'>
          <div className='h-3 w-32 bg-gray-300 dark:bg-gray-700 rounded' />
          <div className='h-3 w-40 bg-gray-300 dark:bg-gray-700 rounded' />
          <div className='h-3 w-36 bg-gray-300 dark:bg-gray-700 rounded' />
        </div>

        {/* Bottom section */}
        <div className='flex items-center justify-between mt-auto pt-2'>
          <div className='h-3 w-28 bg-gray-300 dark:bg-gray-700 rounded' />
          <div className='h-5 w-5 bg-gray-300 dark:bg-gray-700 rounded-full' />
        </div>
      </div>
    </Card>
  );
}
