import { Card } from '@/components/ui/card';

export function RevenueCardSkeleton() {
  return (
    <Card className='relative w-full p-4 h-full overflow-hidden rounded-lg flex flex-col md:flex-row items-center gap-4 drop-shadow-lg animate-pulse'>
      {/* Gradient overlay */}
      <div className='absolute bottom-0 left-0 w-full h-2/3 bg-gradient-to-t from-black/5 to-transparent pointer-events-none z-10' />

      <div className='flex flex-col justify-between flex-1 min-w-0 overflow-hidden h-full py-1 relative z-20'>
        <div className='flex flex-col flex-grow'>
          {/* Top section */}
          <div className='flex flex-col md:flex-row justify-between items-stretch mb-4'>
            <div className='flex flex-col flex-1'>
              <div className='h-4 w-28 bg-gray-300 dark:bg-gray-700 rounded mb-2' />
              <div className='flex items-baseline gap-2 mb-1'>
                <div className='h-8 w-32 bg-gray-300 dark:bg-gray-700 rounded' />
                <div className='h-4 w-12 bg-gray-300 dark:bg-gray-700 rounded' />
              </div>
              <div className='h-4 w-40 bg-gray-300 dark:bg-gray-700 rounded' />
            </div>
            <div className='flex-[2] mt-4 md:mt-0 md:ml-6 h-[114px] bg-gray-300 dark:bg-gray-700 rounded' />
          </div>

          {/* Bottom stats */}
          <div className='grid grid-cols-3 gap-x-6 gap-y-4 mt-2'>
            <div className='flex flex-col'>
              <div className='h-3 w-20 bg-gray-300 dark:bg-gray-700 rounded mb-1' />
              <div className='h-4 w-16 bg-gray-300 dark:bg-gray-700 rounded' />
            </div>
            <div className='flex flex-col'>
              <div className='h-3 w-24 bg-gray-300 dark:bg-gray-700 rounded mb-1' />
              <div className='h-4 w-20 bg-gray-300 dark:bg-gray-700 rounded' />
            </div>
            <div className='flex flex-col'>
              <div className='h-3 w-28 bg-gray-300 dark:bg-gray-700 rounded mb-1' />
              <div className='h-4 w-20 bg-gray-300 dark:bg-gray-700 rounded' />
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
