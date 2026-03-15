import { Loader } from 'lucide-react';

import { cn } from '@/lib/utils';

export const DefaultLoader = ({ className }: { className?: string }) => {
  return (
    <div className={cn('flex items-center justify-center h-full w-full', className)}>
      <Loader className='animate-spin' />
    </div>
  );
};
