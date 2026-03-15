import React from 'react';

import { cn } from '@/lib/utils';

interface DynamicPageContainerProps {
  children: React.ReactNode;
  className?: string;
  noMaxHeight?: boolean;
}

/**
 * A container component for pages that automatically adapts to the layout configuration
 * Uses CSS variables from the layout to properly size the content area
 */
export function DynamicPageContainer({
  children,
  className,
  noMaxHeight = false,
}: DynamicPageContainerProps) {
  return (
    <div
      className={cn(
        'mx-auto',
        'flex flex-col gap-4 w-full',
        {
          'overflow-auto h-[calc(100vh-var(--header-height))]': !noMaxHeight,
        },
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * A container for the main content area of a page
 * Automatically handles overflow and flex behavior
 */
export function DynamicPageContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex-1 overflow-hidden flex flex-col min-h-0', className)}>{children}</div>
  );
}

/**
 * A header component for the page with standard styling and spacing
 */
export function DynamicPageHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn('flex items-center justify-between', className)}>{children}</div>;
}
