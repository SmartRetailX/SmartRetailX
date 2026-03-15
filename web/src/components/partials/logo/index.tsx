import { cn } from '@/lib/utils';
import { DEFAULT_PLACEHOLDER_IMAGE } from '@/utils/image-utils';

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center bg-amber-50 rounded-full', 'h-20 w-20', className)}>
      <img src={DEFAULT_PLACEHOLDER_IMAGE} alt='Logo' />
    </div>
  );
}
