import * as React from 'react';
import { cn } from '@/lib/utils';

// ── Context ──────────────────────────────────────────────────
interface TabsContextValue {
  value: string;
  onValueChange: (value: string) => void;
}
const TabsContext = React.createContext<TabsContextValue>({
  value: '',
  onValueChange: () => {},
});

// ── Tabs (root) ───────────────────────────────────────────────
interface TabsProps {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  children: React.ReactNode;
}

function Tabs({ defaultValue = '', value, onValueChange, className, children }: TabsProps) {
  const [internal, setInternal] = React.useState(defaultValue);
  const controlled = value !== undefined;
  const current = controlled ? value! : internal;
  const handleChange = (v: string) => {
    if (!controlled) setInternal(v);
    onValueChange?.(v);
  };
  return (
    <TabsContext.Provider value={{ value: current, onValueChange: handleChange }}>
      <div className={cn('w-full', className)}>{children}</div>
    </TabsContext.Provider>
  );
}

// ── TabsList ──────────────────────────────────────────────────
function TabsList({ className, children }: React.ComponentProps<'div'>) {
  return (
    <div
      role="tablist"
      className={cn(
        'inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground',
        className,
      )}
    >
      {children}
    </div>
  );
}

// ── TabsTrigger ───────────────────────────────────────────────
interface TabsTriggerProps extends React.ComponentProps<'button'> {
  value: string;
}

function TabsTrigger({ value, className, children, ...props }: TabsTriggerProps) {
  const ctx = React.useContext(TabsContext);
  const isActive = ctx.value === value;
  return (
    <button
      role="tab"
      type="button"
      aria-selected={isActive}
      onClick={() => ctx.onValueChange(value)}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        isActive
          ? 'bg-background text-foreground shadow'
          : 'hover:bg-background/50 hover:text-foreground',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

// ── TabsContent ───────────────────────────────────────────────
interface TabsContentProps extends React.ComponentProps<'div'> {
  value: string;
}

function TabsContent({ value, className, children, ...props }: TabsContentProps) {
  const ctx = React.useContext(TabsContext);
  if (ctx.value !== value) return null;
  return (
    <div
      role="tabpanel"
      className={cn(
        'mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
