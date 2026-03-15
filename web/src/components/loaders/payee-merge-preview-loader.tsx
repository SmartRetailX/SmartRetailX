import { IconArchive, IconFileDiff, IconShieldCheck } from '@tabler/icons-react';
import { useEffect, useState } from 'react';

export function MergePreviewLoader({
  sourceName = 'Source',
  masterName = 'Master',
}: {
  sourceName?: string;
  masterName?: string;
}) {
  const [loadingText, setLoadingText] = useState('Analyzing data');

  // Cycle through loading states
  useEffect(() => {
    const states = ['Analyzing data', 'Comparing history', 'Preparing preview'];
    let i = 0;
    const interval = setInterval(() => {
      i = (i + 1) % states.length;
      setLoadingText(states[i]);
    }, 800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className='flex flex-col items-center justify-center py-10 px-4 w-full animate-in fade-in duration-300 h-full'>
      {/* --- VISUAL LAYER --- */}
      {/* Use a specific height container (h-20) to ensure vertical centering is based ONLY on icons, not text */}
      <div className='relative flex items-center justify-center gap-8 mb-4 w-full max-w-[320px] h-20'>
        {/* The Connection Line - Strictly centered in this h-20 container */}
        <div className='absolute top-1/2 left-12 right-12 h-0.5 -translate-y-1/2 bg-gradient-to-r from-amber-500/20 via-primary/20 to-blue-500/20 dark:from-amber-500/40 dark:via-primary/40 dark:to-blue-500/40' />

        {/* 1. SOURCE ICON */}
        <div className='relative z-10 h-16 w-16 flex items-center justify-center bg-background rounded-2xl border-2 border-amber-100 dark:border-amber-900/50 shadow-sm'>
          <IconArchive className='h-7 w-7 text-amber-600 dark:text-amber-500' />
          {/* Pulsing effect behind */}
          <div className='absolute inset-0 bg-amber-500/10 rounded-2xl animate-pulse' />
        </div>

        {/* 2. CENTER ANALYSIS ENGINE */}
        <div className='relative z-20 h-20 w-20 shrink-0 flex items-center justify-center bg-background rounded-full border shadow-xl'>
          {/* Spinner Ring */}
          <div className='absolute inset-1 rounded-full border-4 border-muted/20 border-t-primary animate-spin' />
          {/* Icon */}
          <IconFileDiff className='h-8 w-8 text-primary animate-pulse' />
        </div>

        {/* 3. MASTER ICON */}
        <div className='relative z-10 h-16 w-16 flex items-center justify-center bg-background rounded-2xl border-2 border-blue-100 dark:border-blue-900/50 shadow-sm'>
          <IconShieldCheck className='h-7 w-7 text-blue-600 dark:text-blue-500' />
        </div>
      </div>

      {/* --- LABEL LAYER --- */}
      {/* Separated from visual layer to prevent alignment skew */}
      <div className='flex justify-between w-full max-w-[320px] px-2 mb-6'>
        <span className='text-[10px] font-bold tracking-widest uppercase text-amber-600 dark:text-amber-500 w-16 text-center'>
          {sourceName}
        </span>
        {/* Spacer for center */}
        <div className='w-20' />
        <span className='text-[10px] font-bold tracking-widest uppercase text-blue-600 dark:text-blue-500 w-16 text-center'>
          {masterName}
        </span>
      </div>

      {/* --- STATUS TEXT --- */}
      <h3 className='text-lg font-medium text-foreground'>
        {loadingText}
        <span className='animate-pulse'>...</span>
      </h3>
      <p className='text-sm text-muted-foreground text-center mt-2 max-w-xs'>
        We are calculating what will change. No data is being moved yet.
      </p>
    </div>
  );
}
