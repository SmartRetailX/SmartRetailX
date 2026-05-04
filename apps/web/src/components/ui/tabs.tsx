import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';

import { cn } from '@/lib/utils';

function Tabs({ className, children, ...props }: TabsPrimitive.TabsProps) {
  return (
    <TabsPrimitive.Root data-slot="tabs" className={cn('w-full', className)} {...props}>
      {children}
    </TabsPrimitive.Root>
  );
}

function TabsList({ className, ...props }: TabsPrimitive.TabsListProps) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn('inline-flex items-center justify-start gap-1 rounded-lg bg-muted p-1', className)}
      {...props}
    />
  );
}

function TabsTrigger({ className, ...props }: TabsPrimitive.TabsTriggerProps) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium hover:bg-muted/60 data-[state=active]:bg-background data-[state=active]:shadow-sm',
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({ className, children, ...props }: TabsPrimitive.TabsContentProps) {
  return (
    <TabsPrimitive.Content data-slot="tabs-content" className={cn('mt-2', className)} {...props}>
      {children}
    </TabsPrimitive.Content>
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
