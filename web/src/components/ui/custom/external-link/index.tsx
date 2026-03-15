import { IconExternalLink } from '@tabler/icons-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { openInBrowserTab } from '@/utils/browser-navigation';

export function ExternalLink({ to, className }: { to: string; className?: string }) {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    openInBrowserTab(to);
  };

  return (
    <Button
      size={'icon'}
      variant='link'
      asChild
      onClick={handleClick}
      className={cn('size-4 text-muted-foreground hover:text-primary', className)}
    >
      <IconExternalLink />
    </Button>
  );
}
