import * as React from 'react';
import { ChevronLeftIcon, ChevronRightIcon, MoreHorizontalIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function Pagination({ className, ...props }: React.ComponentProps<'nav'>) {
  return (
    <nav
      role="navigation"
      aria-label="pagination"
      data-slot="pagination"
      className={cn('flex w-full justify-center', className)}
      {...props}
    />
  );
}

function PaginationContent({ className, ...props }: React.ComponentProps<'ul'>) {
  return (
    <ul
      data-slot="pagination-content"
      className={cn('flex items-center gap-1', className)}
      {...props}
    />
  );
}

function PaginationItem({ ...props }: React.ComponentProps<'li'>) {
  return <li data-slot="pagination-item" {...props} />;
}

type PaginationLinkProps = React.ComponentProps<typeof Button> & {
  isActive?: boolean;
};

function PaginationLink({
  className,
  isActive,
  size = 'icon-sm',
  variant,
  ...props
}: PaginationLinkProps) {
  return (
    <Button
      aria-current={isActive ? 'page' : undefined}
      data-slot="pagination-link"
      data-active={isActive}
      variant={variant ?? (isActive ? 'default' : 'outline')}
      size={size}
      className={cn('min-w-7', className)}
      {...props}
    />
  );
}

function PaginationPrevious({ className, children, ...props }: PaginationLinkProps) {
  return (
    <PaginationLink
      aria-label="Go to previous page"
      size="sm"
      className={cn('pl-2', className)}
      {...props}
    >
      <ChevronLeftIcon data-icon="inline-start" />
      <span className="hidden sm:block">{children ?? 'Previous'}</span>
    </PaginationLink>
  );
}

function PaginationNext({ className, children, ...props }: PaginationLinkProps) {
  return (
    <PaginationLink
      aria-label="Go to next page"
      size="sm"
      className={cn('pr-2', className)}
      {...props}
    >
      <span className="hidden sm:block">{children ?? 'Next'}</span>
      <ChevronRightIcon data-icon="inline-end" />
    </PaginationLink>
  );
}

function PaginationEllipsis({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      aria-hidden
      data-slot="pagination-ellipsis"
      className={cn('flex size-7 items-center justify-center text-muted-foreground', className)}
      {...props}
    >
      <MoreHorizontalIcon />
      <span className="sr-only">More pages</span>
    </span>
  );
}

export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
};
