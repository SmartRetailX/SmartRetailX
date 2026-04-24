import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { PanelLeftIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

const SIDEBAR_WIDTH = '16rem';
const SIDEBAR_WIDTH_ICON = '3.25rem';

type SidebarContextProps = {
  state: 'expanded' | 'collapsed';
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  openMobile: boolean;
  setOpenMobile: React.Dispatch<React.SetStateAction<boolean>>;
  isMobile: boolean;
  toggleSidebar: () => void;
};

const SidebarContext = React.createContext<SidebarContextProps | null>(null);

function useSidebar() {
  const context = React.useContext(SidebarContext);

  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider.');
  }

  return context;
}

function SidebarProvider({
  defaultOpen = true,
  className,
  style,
  children,
  ...props
}: React.ComponentProps<'div'> & {
  defaultOpen?: boolean;
}) {
  const isMobile = useIsMobile();
  const [open, setOpen] = React.useState(defaultOpen);
  const [openMobile, setOpenMobile] = React.useState(false);
  const state = open ? 'expanded' : 'collapsed';

  const toggleSidebar = React.useCallback(() => {
    if (isMobile) {
      setOpenMobile((current) => !current);
      return;
    }

    setOpen((current) => !current);
  }, [isMobile]);

  const contextValue = React.useMemo(
    () => ({ state, open, setOpen, openMobile, setOpenMobile, isMobile, toggleSidebar }),
    [isMobile, open, openMobile, state, toggleSidebar],
  );

  return (
    <SidebarContext.Provider value={contextValue}>
      <div
        data-slot="sidebar-wrapper"
        style={
          {
            '--sidebar-width': SIDEBAR_WIDTH,
            '--sidebar-width-icon': SIDEBAR_WIDTH_ICON,
            ...style,
          } as React.CSSProperties
        }
        className={cn('group/sidebar-wrapper flex min-h-svh w-full bg-background', className)}
        {...props}
      >
        {children}
      </div>
    </SidebarContext.Provider>
  );
}

function Sidebar({
  className,
  children,
  collapsible = 'icon',
  ...props
}: React.ComponentProps<'div'> & {
  collapsible?: 'icon' | 'none';
}) {
  const { isMobile, openMobile, setOpenMobile, state } = useSidebar();

  if (isMobile) {
    return (
      <Sheet open={openMobile} onOpenChange={setOpenMobile}>
        <SheetContent
          side="left"
          showCloseButton={false}
          className="w-[var(--sidebar-width)] bg-sidebar p-0 text-sidebar-foreground"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Admin sidebar</SheetTitle>
            <SheetDescription>Admin navigation links.</SheetDescription>
          </SheetHeader>
          <div className="flex h-full w-full flex-col">{children}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <aside
      data-slot="sidebar"
      data-state={state}
      data-collapsible={state === 'collapsed' ? collapsible : ''}
      className={cn(
        'group/sidebar hidden h-svh shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 md:flex',
        state === 'collapsed' && collapsible === 'icon'
          ? 'w-[var(--sidebar-width-icon)]'
          : 'w-[var(--sidebar-width)]',
        className,
      )}
      {...props}
    >
      <div className="flex min-h-0 w-full flex-col">{children}</div>
    </aside>
  );
}

function SidebarInset({ className, ...props }: React.ComponentProps<'main'>) {
  return (
    <main
      data-slot="sidebar-inset"
      className={cn('flex min-w-0 flex-1 flex-col', className)}
      {...props}
    />
  );
}

function SidebarTrigger({ className, onClick, ...props }: React.ComponentProps<typeof Button>) {
  const { toggleSidebar } = useSidebar();

  return (
    <Button
      data-sidebar="trigger"
      data-slot="sidebar-trigger"
      variant="ghost"
      size="icon-sm"
      className={cn(className)}
      onClick={(event) => {
        onClick?.(event);
        toggleSidebar();
      }}
      {...props}
    >
      <PanelLeftIcon />
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  );
}

function SidebarHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sidebar-header"
      className={cn('flex flex-col gap-2 p-2', className)}
      {...props}
    />
  );
}

function SidebarContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sidebar-content"
      className={cn('flex min-h-0 flex-1 flex-col gap-2 overflow-auto p-2', className)}
      {...props}
    />
  );
}

function SidebarFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sidebar-footer"
      className={cn('flex flex-col gap-2 p-2', className)}
      {...props}
    />
  );
}

function SidebarGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sidebar-group"
      className={cn('flex w-full min-w-0 flex-col gap-1', className)}
      {...props}
    />
  );
}

function SidebarGroupLabel({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sidebar-group-label"
      className={cn(
        'px-2 py-1 text-xs font-medium text-sidebar-foreground/65 group-has-[[data-collapsible=icon]]/sidebar-wrapper:hidden',
        className,
      )}
      {...props}
    />
  );
}

function SidebarGroupContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="sidebar-group-content" className={cn('w-full', className)} {...props} />;
}

function SidebarMenu({ className, ...props }: React.ComponentProps<'ul'>) {
  return (
    <ul
      data-slot="sidebar-menu"
      className={cn('flex w-full min-w-0 flex-col gap-1', className)}
      {...props}
    />
  );
}

function SidebarMenuItem({ className, ...props }: React.ComponentProps<'li'>) {
  return (
    <li
      data-slot="sidebar-menu-item"
      className={cn('group/menu-item relative', className)}
      {...props}
    />
  );
}

const sidebarMenuButtonVariants = cva(
  'flex h-9 w-full items-center gap-2 overflow-hidden rounded-lg px-2 text-left text-sm outline-none transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-4 [&>span:last-child]:truncate',
  {
    variants: {
      size: {
        default: 'h-9',
        lg: 'h-12',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  },
);

function SidebarMenuButton({
  className,
  isActive = false,
  tooltip,
  size,
  ...props
}: React.ComponentProps<'a'> & {
  isActive?: boolean;
  tooltip?: string;
} & VariantProps<typeof sidebarMenuButtonVariants>) {
  const { state, isMobile } = useSidebar();
  const button = (
    <a
      data-slot="sidebar-menu-button"
      data-active={isActive}
      className={cn(
        sidebarMenuButtonVariants({ size }),
        state === 'collapsed' && 'justify-center px-0 [&>span]:sr-only',
        className,
      )}
      {...props}
    />
  );

  if (!tooltip || state !== 'collapsed' || isMobile) {
    return button;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side="right" align="center">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}

function SidebarMenuBadge({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sidebar-menu-badge"
      className={cn('absolute right-2 top-2 text-xs text-sidebar-foreground/65', className)}
      {...props}
    />
  );
}

function SidebarMenuSkeleton({
  className,
  showIcon = false,
  ...props
}: React.ComponentProps<'div'> & { showIcon?: boolean }) {
  return (
    <div
      data-slot="sidebar-menu-skeleton"
      className={cn('flex h-9 items-center gap-2 rounded-lg px-2', className)}
      {...props}
    >
      {showIcon && <Skeleton className="size-4 rounded-md" />}
      <Skeleton className="h-4 flex-1" />
    </div>
  );
}

function SidebarRail() {
  return null;
}

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
};
