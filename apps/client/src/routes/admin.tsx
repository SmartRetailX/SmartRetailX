import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from '@tanstack/react-router';
import {
  BarChart3,
  Box,
  ChevronRight,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  ShoppingBag,
  Users,
  X,
} from 'lucide-react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { requireRole } from '@/lib/auth-guards';

// ---------------------------------------------------------------------------
// Route definition
// ---------------------------------------------------------------------------

export const Route = createFileRoute('/admin')({
  beforeLoad: requireRole('admin'),
  component: AdminLayout,
});

// ---------------------------------------------------------------------------
// Sidebar nav items
// ---------------------------------------------------------------------------

const NAV_ITEMS = [
  {
    label: 'Dashboard',
    to: '/admin',
    icon: LayoutDashboard,
    exact: true,
  },
  {
    label: 'Products',
    to: '/admin/products',
    icon: Box,
    exact: false,
  },
  {
    label: 'Orders',
    to: '/admin/orders',
    icon: ClipboardList,
    exact: false,
  },
  {
    label: 'Users',
    to: '/admin/users',
    icon: Users,
    exact: false,
  },
  {
    label: 'Analytics',
    to: '/admin/analytics',
    icon: BarChart3,
    exact: false,
  },
] as const;

// ---------------------------------------------------------------------------
// Helper to resolve user initials
// ---------------------------------------------------------------------------

function getInitials(name: string | undefined | null): string {
  if (!name) return 'A';
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

// ---------------------------------------------------------------------------
// Admin Layout component
// ---------------------------------------------------------------------------

function AdminLayout() {
  const { isAuthenticated, isLoading, user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Reactive guard: handles the window where beforeLoad ran during isLoading=true
  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      void navigate({ to: '/login', search: { redirect: window.location.pathname } });
      return;
    }
    const roles = (user?.role ?? 'user').split(',').map((r: string) => r.trim());
    if (!roles.includes('admin')) {
      void navigate({ to: '/' });
    }
  }, [isLoading, isAuthenticated, user, navigate]);

  // Full-screen loading while session check is in progress
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#00A651] border-t-transparent" />
          <p className="text-sm text-slate-400">Loading admin portal…</p>
        </div>
      </div>
    );
  }

  // Guard pass – role is confirmed by useEffect above; render null briefly on mismatch
  if (!isAuthenticated || !user?.role?.includes('admin')) return null;

  const handleLogout = async () => {
    await logout();
    void navigate({ to: '/login' });
  };

  return (
    <TooltipProvider>
      <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden">
        {/* ----------------------------------------------------------------- */}
        {/* Desktop Sidebar                                                    */}
        {/* ----------------------------------------------------------------- */}
        <aside
          className={`hidden md:flex flex-col transition-all duration-300 ease-in-out border-r border-slate-800 bg-slate-900 ${
            sidebarOpen ? 'w-64' : 'w-16'
          }`}
        >
          {/* Brand */}
          <div className="flex h-16 items-center border-b border-slate-800 px-4 shrink-0">
            {sidebarOpen ? (
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#00A651]">
                  <ShoppingBag className="h-4 w-4 text-white" />
                </div>
                <span className="font-bold text-slate-100 truncate">
                  Smart<span className="text-[#00A651]">Retail</span> Admin
                </span>
              </div>
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#00A651] mx-auto">
                <ShoppingBag className="h-4 w-4 text-white" />
              </div>
            )}
          </div>

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
            {NAV_ITEMS.map((item) => (
              <NavItem key={item.to} item={item} collapsed={!sidebarOpen} />
            ))}

            <Separator className="my-3 bg-slate-800" />

            <NavItem
              item={{ label: 'Settings', to: '/admin/settings', icon: Settings, exact: false }}
              collapsed={!sidebarOpen}
            />
          </nav>

          {/* User card */}
          <div className="border-t border-slate-800 p-3 shrink-0">
            {sidebarOpen ? (
              <div className="flex items-center gap-3 rounded-lg p-2 hover:bg-slate-800 transition-colors">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="bg-[#00A651]/20 text-[#00A651] text-xs font-bold">
                    {getInitials(user?.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-100 truncate">
                    {user?.name ?? 'Admin'}
                  </p>
                  <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-slate-400 hover:text-red-400 hover:bg-red-500/10 shrink-0"
                      onClick={handleLogout}
                    >
                      <LogOut className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">Sign out</TooltipContent>
                </Tooltip>
              </div>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleLogout}
                    className="flex items-center justify-center w-full h-10 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">Sign out</TooltipContent>
              </Tooltip>
            )}
          </div>

          {/* Collapse toggle */}
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="absolute left-0 top-1/2 -translate-y-1/2 translate-x-full z-10 hidden md:flex h-6 w-4 items-center justify-center rounded-r-md bg-slate-800 border border-l-0 border-slate-700 text-slate-400 hover:text-slate-100 transition-colors"
          >
            <ChevronRight
              className={`h-3 w-3 transition-transform duration-300 ${sidebarOpen ? 'rotate-180' : ''}`}
            />
          </button>
        </aside>

        {/* ----------------------------------------------------------------- */}
        {/* Mobile Sidebar Overlay                                             */}
        {/* ----------------------------------------------------------------- */}
        {mobileSidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/60 md:hidden"
            onClick={() => setMobileSidebarOpen(false)}
          />
        )}
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-64 flex flex-col bg-slate-900 border-r border-slate-800 md:hidden transition-transform duration-300 ${
            mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex h-16 items-center justify-between border-b border-slate-800 px-4 shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#00A651]">
                <ShoppingBag className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold text-slate-100">
                Smart<span className="text-[#00A651]">Retail</span>
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-slate-400 hover:text-slate-100"
              onClick={() => setMobileSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
            {NAV_ITEMS.map((item) => (
              <NavItem
                key={item.to}
                item={item}
                collapsed={false}
                onClick={() => setMobileSidebarOpen(false)}
              />
            ))}
          </nav>
        </aside>

        {/* ----------------------------------------------------------------- */}
        {/* Main area                                                          */}
        {/* ----------------------------------------------------------------- */}
        <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
          {/* Top bar */}
          <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-800 bg-slate-900 px-4 md:px-6">
            <div className="flex items-center gap-3">
              {/* Mobile menu trigger */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden text-slate-400 hover:text-slate-100"
                onClick={() => setMobileSidebarOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
              <BreadcrumbPath />
            </div>

            <div className="flex items-center gap-3">
              <Badge
                variant="secondary"
                className="bg-[#00A651]/15 text-[#00A651] border-[#00A651]/30 font-semibold"
              >
                Administrator
              </Badge>
              {/* Visit Store */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link to="/">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-slate-700 text-slate-300 hover:border-[#00A651] hover:text-[#00A651] bg-transparent"
                    >
                      <ShoppingBag className="h-4 w-4 mr-2" />
                      Visit Store
                    </Button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent>Go to customer storefront</TooltipContent>
              </Tooltip>
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 overflow-y-auto bg-slate-950 p-4 md:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}

// ---------------------------------------------------------------------------
// NavItem – works collapsed + expanded + mobile
// ---------------------------------------------------------------------------

interface NavItemDef {
  label: string;
  to: string;
  icon: React.ElementType;
  exact: boolean;
}

function NavItem({
  item,
  collapsed,
  onClick,
}: {
  item: NavItemDef;
  collapsed: boolean;
  onClick?: () => void;
}) {
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;
  const isActive = item.exact ? currentPath === item.to : currentPath.startsWith(item.to);

  const content = (
    <Link
      to={item.to}
      onClick={onClick}
      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 group ${
        isActive
          ? 'bg-[#00A651]/15 text-[#00A651]'
          : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
      } ${collapsed ? 'justify-center px-2' : ''}`}
    >
      <item.icon
        className={`h-4 w-4 shrink-0 ${isActive ? 'text-[#00A651]' : 'text-slate-500 group-hover:text-slate-300'}`}
      />
      {!collapsed && <span className="truncate">{item.label}</span>}
      {!collapsed && isActive && <div className="ml-auto h-1.5 w-1.5 rounded-full bg-[#00A651]" />}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="right">{item.label}</TooltipContent>
      </Tooltip>
    );
  }

  return content;
}

// ---------------------------------------------------------------------------
// BreadcrumbPath – shows current section name in the top bar
// ---------------------------------------------------------------------------

const BREADCRUMB_MAP: Record<string, string> = {
  '/admin': 'Dashboard',
  '/admin/products': 'Products',
  '/admin/orders': 'Orders',
  '/admin/users': 'Users',
  '/admin/analytics': 'Analytics',
  '/admin/settings': 'Settings',
};

function BreadcrumbPath() {
  const routerState = useRouterState();
  const path = routerState.location.pathname;
  const label = BREADCRUMB_MAP[path] ?? 'Admin';

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-slate-500">Admin</span>
      <ChevronRight className="h-3.5 w-3.5 text-slate-600" />
      <span className="font-semibold text-slate-100">{label}</span>
    </div>
  );
}
