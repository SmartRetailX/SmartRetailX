import { Link, useRouterState } from '@tanstack/react-router';
import {
  Bell,
  Boxes,
  BarChart3,
  FolderTree,
  Gift,
  Layers,
  LayoutDashboard,
  LogOut,
  Package,
  ShoppingBag,
  Store,
  Users,
} from 'lucide-react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
import { User } from '@/types/auth';

type AdminShellProps = {
  children: React.ReactNode;
  user?: User | null;
  signOut: () => void;
};

const adminNavItems = [
  { label: 'Overview', path: '/admin', href: '/admin', icon: LayoutDashboard },
  {
    label: 'Products',
    path: '/admin/products',
    href: '/admin/products?page=1&limit=12',
    icon: Package,
  },
  {
    label: 'Categories',
    path: '/admin/categories',
    href: '/admin/categories?page=1&limit=12',
    icon: FolderTree,
  },
  { label: 'Stock', path: '/admin/stock', href: '/admin/stock?page=1&limit=10', icon: Boxes },
  {
    label: 'Orders',
    path: '/admin/orders',
    href: '/admin/orders?page=1&limit=10',
    icon: ShoppingBag,
  },
  {
    label: 'Static Segmentation',
    path: '/admin/customers',
    href: '/admin/customers',
    icon: Users,
  },
  {
    label: 'Dynamic Segmentation',
    path: '/admin/tiers',
    href: '/admin/tiers',
    icon: Layers,
  },
  {
    label: 'Loyalty Tiers',
    path: '/admin/loyalty',
    href: '/admin/loyalty',
    icon: Gift,
  },
];

function getInitials(name?: string | null, email?: string | null) {
  const source = name?.trim() || email?.trim() || 'Admin';
  const parts = source.split(/\s+/).filter(Boolean);

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export function AdminShell({ children, user, signOut }: AdminShellProps) {
  const location = useRouterState({ select: (state) => state.location });
  const pathname = location.pathname;
  const currentNavItem = adminNavItems.find((item) => item.path === pathname);
  const pageLabel = currentNavItem?.label ?? 'Admin';

  return (
    <TooltipProvider>
      <SidebarProvider>
        <Sidebar>
          <SidebarHeader className="h-16 justify-center border-b border-sidebar-border px-3 py-0">
            <div className="flex h-full min-w-0 items-center gap-2 rounded-lg px-1">
              <div className="flex size-9 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <Store />
              </div>
              <div className="min-w-0 leading-tight group-data-[state=collapsed]/sidebar:sr-only">
                <div className="truncate text-sm font-semibold">SmartRetailX</div>
                <div className="truncate text-xs text-sidebar-foreground/65">Admin Portal</div>
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Workspace</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {adminNavItems.map(({ label, path, href, icon: Icon }) => (
                    <SidebarMenuItem key={path}>
                      <SidebarMenuButton href={href} isActive={pathname === path} tooltip={label}>
                        <Icon />
                        <span>{label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="border-t border-sidebar-border p-3">
            <div className="flex min-w-0 items-center gap-2 rounded-lg border border-sidebar-border bg-background/70 p-2 group-data-[state=collapsed]/sidebar:justify-center">
              <Avatar size="sm">
                <AvatarFallback>{getInitials(user?.name, user?.email)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1 group-data-[state=collapsed]/sidebar:sr-only">
                <div className="truncate text-sm font-medium">{user?.name || 'Admin'}</div>
                <div className="truncate text-xs text-muted-foreground">{user?.email}</div>
              </div>
            </div>
            <Button variant="outline" className="justify-start" onClick={() => signOut()}>
              <LogOut data-icon="inline-start" />
              <span className="group-data-[state=collapsed]/sidebar:sr-only">Sign Out</span>
            </Button>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="flex h-dvh min-h-0 flex-col bg-background">
          <header className="sticky top-0 z-30 h-16 shrink-0 border-b border-border/60 bg-background/95 backdrop-blur">
            <div className="flex h-full items-center justify-between gap-3 px-3 md:px-4 lg:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <SidebarTrigger />
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <span className="truncate">{pageLabel}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Link to="/admin/orders" search={{ page: 1, limit: 10 }}>
                  <Button variant="outline" size="icon" aria-label="Open order notifications">
                    <Bell />
                  </Button>
                </Link>
                <Avatar>
                  <AvatarFallback>{getInitials(user?.name, user?.email)}</AvatarFallback>
                </Avatar>
              </div>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 md:px-4 md:py-4 lg:px-6">
            <div className="min-h-0">{children}</div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
