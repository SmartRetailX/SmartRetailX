import { lazy, Suspense, type ComponentType } from 'react'
import { Navigate, type RouteObject } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { ProtectedRoute, RoleGuard, GuestRoute } from '@/components/auth/ProtectedRoute'
import { useAuth } from '@/contexts/AuthContext'
import MainLayout from '@/components/layout/MainLayout'

// ── Roles ─────────────────────────────────────────────────────────────

export const ADMIN_ROLES: string[]    = ['ADMIN', 'OWNER', 'admin', 'owner']
export const CUSTOMER_ROLES: string[] = ['CUSTOMER', 'USER', 'customer', 'user']

// ── Paths ─────────────────────────────────────────────────────────────

export const PATHS = {
  LOGIN:       '/login',
  REGISTER:    '/register',
  DASHBOARD:   '/',
  REVENUE:     '/revenue',
  INVENTORY:   '/inventory',
  FORECASTING: '/forecasting',
  CUSTOMERS:   '/customers',
  TIERS:       '/tiers',
  LOYALTY:       '/loyalty',
  PROMOTIONS:  '/promotions',
  VOICE:              '/voice',
  ADMIN_SETTINGS:     '/admin-settings',
  CUSTOMER_SETTINGS:  '/customer-settings',
} as const

// ── Pages (lazy-loaded) ───────────────────────────────────────────────

const LoginPage         = lazy(() => import('@/pages/LoginPage'))
const RegisterPage      = lazy(() => import('@/pages/RegisterPage'))
const AdminDashboard    = lazy(() => import('@/pages/admin/AdminDashboard'))
const CustomerDashboard = lazy(() => import('@/pages/customer/CustomerDashboard'))
const CustomerSettings  = lazy(() => import('@/pages/customer/CustomerSettingsPage'))
const RevenuePage       = lazy(() => import('@/pages/admin/RevenuePage'))
const InventoryPage     = lazy(() => import('@/pages/admin/InventoryPage'))
const ForecastingPage   = lazy(() => import('@/pages/admin/ForecastingPage'))
const CustomersPage     = lazy(() => import('@/pages/admin/CustomersPage'))
const TiersPage         = lazy(() => import('@/pages/admin/TiersPage'))
const TierDetailsPage   = lazy(() => import('@/pages/admin/TierDetailsPage'))
const LoyaltyPage       = lazy(() => import('@/pages/admin/LoyaltyPage'))
const VoicePage         = lazy(() => import('@/pages/admin/VoicePage'))
const SettingsPage      = lazy(() => import('@/pages/admin/SettingsPage'))
const PromotionsPage    = lazy(() => import('@/pages/admin/PromotionsPage'))

// ── Helpers ───────────────────────────────────────────────────────────

function Loading() {
  return (
    <div className="flex h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  )
}

function page(C: ComponentType) {
  return <Suspense fallback={<Loading />}><C /></Suspense>
}

function adminOnly(C: ComponentType) {
  return (
    <RoleGuard allowedRoles={ADMIN_ROLES}>
      <Suspense fallback={<Loading />}><C /></Suspense>
    </RoleGuard>
  )
}

function customerOnly(C: ComponentType) {
  return (
    <RoleGuard allowedRoles={CUSTOMER_ROLES}>
      <Suspense fallback={<Loading />}><C /></Suspense>
    </RoleGuard>
  )
}

// ── Role-aware dashboard index ────────────────────────────────────────

function DashboardIndex() {
  const { hasRole } = useAuth()
  return hasRole(ADMIN_ROLES) ? page(AdminDashboard) : page(CustomerDashboard)
}

// ── Route tree ────────────────────────────────────────────────────────

export const appRoutes: RouteObject[] = [
  // Public (guests only – logged-in users are redirected to dashboard)
  { path: PATHS.LOGIN,    element: <GuestRoute>{page(LoginPage)}</GuestRoute> },
  { path: PATHS.REGISTER, element: <GuestRoute>{page(RegisterPage)}</GuestRoute> },

  // Protected (requires auth)
  {
    element: <ProtectedRoute />,
    children: [{
      path: PATHS.DASHBOARD,
      element: <MainLayout />,
      children: [
        { index: true, element: <DashboardIndex /> },

        // Admin
        { path: 'revenue',     element: adminOnly(RevenuePage) },
        { path: 'inventory',   element: adminOnly(InventoryPage) },
        { path: 'forecasting', element: adminOnly(ForecastingPage) },
        { path: 'customers',   element: adminOnly(CustomersPage) },
        { path: 'tiers',       element: adminOnly(TiersPage) },
        { path: 'tiers/:id',   element: adminOnly(TierDetailsPage) },
        { path: 'loyalty',   element: adminOnly(LoyaltyPage) },
        { path: 'promotions',  element: adminOnly(PromotionsPage) },
        { path: 'voice',             element: adminOnly(VoicePage) },
        { path: 'admin-settings',    element: adminOnly(SettingsPage) },

        // Customer
        { path: 'customer-settings', element: customerOnly(CustomerSettings) },
      ],
    }],
  },

  // Fallback
  { path: '*', element: <Navigate to={PATHS.DASHBOARD} replace /> },
]
