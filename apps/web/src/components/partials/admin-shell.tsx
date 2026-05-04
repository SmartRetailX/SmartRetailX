import { Link, useRouterState } from '@tanstack/react-router';
import {
  Bell,
  Boxes,
  BarChart3,
  FolderTree,
  LayoutDashboard,
  LogOut,
  Package,
  ShoppingBag,
  Store,
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
    label: 'BI Dashboard',
    path: '/admin/bi-dashboard',
    href: '/admin/bi-dashboard',
    icon: BarChart3,
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

  return (
    <TooltipProvider>
      <SidebarProvider>
        <Sidebar>
          <SidebarHeader className="border-b border-sidebar-border p-3">
            <div className="flex min-w-0 items-center gap-2 rounded-lg px-1 py-1.5">
              <div className="flex size-9 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <Store />
              </div>
              <div className="min-w-0 leading-tight group-data-[state=collapsed]/sidebar:sr-only">
                <div className="truncate text-sm font-semibold">SmartRetailX</div>
                <div className="truncate text-xs text-sidebar-foreground/65">Admin Console</div>
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

        <SidebarInset className="min-h-svh bg-background">
          <header className="sticky top-0 z-30 border-b border-border/60 bg-background/95 backdrop-blur">
            <div className="flex items-center justify-between gap-4 px-4 py-3 md:px-6 lg:px-8">
              <div className="flex min-w-0 items-center gap-3">
                <SidebarTrigger />
                <div className="min-w-0">
                  <div className="text-xs font-medium uppercase text-muted-foreground">
                    Admin Workspace
                  </div>
                  <div className="truncate text-lg font-semibold">Operations Dashboard</div>
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

          <div className="min-h-0 flex-1 overflow-hidden px-4 py-4 md:px-6 lg:px-8">
            <div className="h-[calc(100svh-6rem)] min-h-0">{children}</div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
