import { IconHelp } from '@tabler/icons-react';

interface PlatformInfo {
  id: string;
  name: string;
  path: string;
  icon: string;
}

interface PlatformIndicatorProps {
  platformInfo: PlatformInfo | undefined;
  className?: string;
}

export function PlatformIndicator({ platformInfo }: PlatformIndicatorProps) {
  if (!platformInfo) return null;

  return (
    <div className='flex items-center gap-2 py-1.5 cursor-default'>
      <img
        src={platformInfo.icon}
        alt={platformInfo.name}
        className='w-5 h-5 object-contain rounded-full'
        onError={(e) => {
          // Fallback to a default icon if image fails to load
          e.currentTarget.style.display = 'none';
          const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
          if (nextElement) {
            nextElement.classList.remove('hidden');
          }
        }}
      />
      <IconHelp className='w-4 h-4 text-muted-foreground hidden' />
      <div className='text-xs font-medium'>{platformInfo.name}</div>
    </div>
  );
}
