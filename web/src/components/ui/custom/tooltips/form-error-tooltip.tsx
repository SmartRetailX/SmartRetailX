import { IconAlertSquareRounded } from '@tabler/icons-react';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export function FormErrorTooltip({ message }: { message: string | undefined }) {
  if (!message) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className='inline-flex'>
            <IconAlertSquareRounded className='ml-1 text-red-500' size={16} />
          </span>
        </TooltipTrigger>
        <TooltipContent hideArrow className='bg-accent text-red-600'>
          <p>{message}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
