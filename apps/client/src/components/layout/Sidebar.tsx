import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Layers, 
  Box,
  DollarSign, 
  Package, 
  TrendingUp, 
  Users, 
  Mic,
  Gift, 
  Settings,
  X,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Target,
  Award,
  ShoppingBag,
  Tag,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'
import { useSidebarStore } from '@/stores/appStore'
import { ADMIN_ROLES, PATHS } from '@/routes'

interface SidebarProps {
  open: boolean
  setOpen: (open: boolean) => void
}

export default function Sidebar({ open, setOpen }: SidebarProps) {
  const { t } = useTranslation()
  const location = useLocation()
  const { hasRole } = useAuth()
  const { collapsed, toggle } = useSidebarStore()

  const isAdmin = hasRole(ADMIN_ROLES)

  // Build navigation items based on user role
  const navigation = isAdmin
    ? [
        { name: t('nav.dashboard'), href: PATHS.DASHBOARD, icon: LayoutDashboard },
        { name: t('nav.revenue'), href: PATHS.REVENUE, icon: DollarSign },
        // { name: t('nav.inventory'), href: PATHS.INVENTORY, icon: Package },
        { name: 'Products', href: PATHS.PRODUCTS, icon: Box },
        { name: 'Orders', href: PATHS.ADMIN_ORDERS, icon: ShoppingBag },
        { name: t('nav.forecasting'), href: PATHS.FORECASTING, icon: TrendingUp },
        { name: t('nav.customers'), href: PATHS.CUSTOMERS, icon: Users },
        { name: t('nav.tiers'), href: PATHS.TIERS, icon: Layers },
        { name: t('nav.loyalty'), href: PATHS.LOYALTY, icon: Gift },
        { name: 'Promotions', href: PATHS.PROMOTIONS, icon: Target },
        { name: t('nav.voice'), href: PATHS.VOICE, icon: Mic },
        ...(hasRole('ADMIN')
          ? [{ name: t('nav.settings'), href: PATHS.ADMIN_SETTINGS, icon: Settings }]
          : []),
      ]
    : [
        // Customer navigation
        { name: t('nav.dashboard'), href: PATHS.DASHBOARD, icon: LayoutDashboard },
        { name: t('nav.myloyalty'), href: PATHS.CUSTOMER_LOYALTY, icon: Award },
        { name: 'My Promotions',   href: PATHS.MY_PROMOTIONS, icon: Tag },
        { name: t('nav.settings'), href: PATHS.CUSTOMER_SETTINGS, icon: Settings },
      ]

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transform transition-all duration-300 ease-in-out lg:relative lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-gray-200 dark:border-gray-700">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold">
                SR
              </div>
              <span className="text-lg font-semibold">Smart RetailX</span>
            </div>
          )}
          
          {/* Close button for mobile */}
          <button
            className="lg:hidden p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
            onClick={() => setOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>

          {/* Collapse button for desktop */}
          <button
            className="hidden lg:block p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
            onClick={toggle}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {navigation.map((item) => {
            const isActive = item.href === '/' ? location.pathname === '/' 
                                               : location.pathname.startsWith(item.href);
            const Icon = item.icon

            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-white'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700',
                  collapsed && 'justify-center'
                )}
                title={collapsed ? item.name : undefined}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {!collapsed && <span>{item.name}</span>}
              </Link>
            )
          })}
        </nav>

        {/* User info */}
        {!collapsed && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              v1.0.0 | © 2025 Smart RetailX
            </div>
          </div>
        )}
      </div>
    </>
  )
}
