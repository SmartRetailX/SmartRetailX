import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { Award, LogOut, Package, Settings, ShoppingBag, ShoppingCart } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import AgentChatWidget from '@/components/chat/AgentChatWidget'
import { useAuth } from '@/contexts/AuthContext'
import { useCart } from '@/hooks/useCart'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useLanguageStore, useThemeStore } from '@/stores/appStore'

import Sidebar from './Sidebar'
import Header from './Header'

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const { isCustomer, logout, user } = useAuth()
  const { data: cart } = useCart()
  const { theme } = useThemeStore()
  const { i18n } = useTranslation()
  const { language, setLanguage } = useLanguageStore()

  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark')
    document.documentElement.classList.add(isCustomer ? 'light' : theme)
  }, [isCustomer, theme])

  useEffect(() => {
    const nextLanguage = language === 'si' ? 'si' : 'en'
    if (i18n.language !== nextLanguage) {
      void i18n.changeLanguage(nextLanguage)
    }
  }, [i18n, language])

  const handleLanguageChange = (nextLanguage: 'en' | 'si') => {
    setLanguage(nextLanguage)
    void i18n.changeLanguage(nextLanguage)
  }

  if (isCustomer) {
    const customerNavItems = [
      {
        href: '/',
        label: 'Shop',
      },
      {
        href: '/orders',
        label: 'Orders',
        icon: Package,
      },
      {
        href: '/customer-settings',
        label: 'Account',
      },
    ]

    const cartItemCount = cart?.itemCount || 0

    return (
      <div className="min-h-screen bg-background text-foreground">
        <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-6">
            <Link to="/" className="inline-flex items-center gap-2 text-lg font-bold text-primary">
              <ShoppingBag className="h-5 w-5" />
              Smart RetailX Shop
            </Link>

            <nav className="hidden items-center gap-2 md:flex">
              {customerNavItems.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    'rounded-full px-4 py-2 text-sm font-medium transition-colors',
                    location.pathname === item.href
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              <div className="inline-flex items-center rounded-full border border-border bg-muted p-0.5">
                <button
                  type="button"
                  onClick={() => handleLanguageChange('en')}
                  className={cn(
                    'rounded-full px-2.5 py-1 text-xs font-semibold transition-colors',
                    language === 'en'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                  aria-label="Switch language to English"
                >
                  EN
                </button>
                <button
                  type="button"
                  onClick={() => handleLanguageChange('si')}
                  className={cn(
                    'rounded-full px-2.5 py-1 text-xs font-semibold transition-colors',
                    language === 'si'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                  aria-label="Switch language to Sinhala"
                >
                  SI
                </button>
              </div>

              <p className="hidden text-sm text-muted-foreground md:block">{user?.name || 'Customer'}</p>

              {/* Cart button */}
              <Button variant="ghost" size="icon" asChild className="relative">
                <Link to="/cart">
                  <ShoppingCart className="h-5 w-5" />
                  {cartItemCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                      {cartItemCount > 9 ? '9+' : cartItemCount}
                    </span>
                  )}
                </Link>
              </Button>

              <Button variant="ghost" size="icon" asChild className="relative">
                <Link to="/customer-loyalty">
                  <Award className="h-5 w-5" />
                </Link>
              </Button>

              <Button variant="ghost" size="icon" asChild>
                <Link to="/customer-settings" className="inline-flex items-center gap-1.5">
                  <Settings />
                </Link>
              </Button>

              <Button variant="ghost" size="icon" onClick={() => void logout()}>
                <LogOut />
              </Button>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 lg:px-8">
          <Outlet />
        </main>

        <AgentChatWidget />
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}