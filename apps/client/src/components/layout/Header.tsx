import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { 
  Menu, 
  Search, 
  Bell, 
  Moon, 
  Sun, 
  User,
  LogOut,
  Settings as SettingsIcon,
  Globe,
  Loader2
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useThemeStore, useLanguageStore } from '@/stores/appStore'
import { useNotificationStore } from '@/stores/notificationStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface HeaderProps {
  onMenuClick: () => void
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { t, i18n } = useTranslation()
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useThemeStore()
  const { language, setLanguage } = useLanguageStore()
  const { unreadCount } = useNotificationStore()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  const handleLanguageToggle = () => {
    const newLang = language === 'en' ? 'si' : 'en'
    setLanguage(newLang)
    i18n.changeLanguage(newLang)
  }

  const handleLogout = async () => {
    setLoggingOut(true)
    await logout()
  }

  return (
    <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 md:px-6">
      {/* Left side */}
      <div className="flex items-center gap-4 flex-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Search */}
        <div className="relative flex-1 max-w-md hidden md:block">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="search"
            placeholder={t('common.search') + '...'}
            className="pl-10 w-full"
          />
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Language toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleLanguageToggle}
          title={t('common.language')}
        >
          <Globe className="h-5 w-5" />
        </Button>

        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          title={theme === 'light' ? t('common.darkMode') : t('common.lightMode')}
        >
          {theme === 'light' ? (
            <Moon className="h-5 w-5" />
          ) : (
            <Sun className="h-5 w-5" />
          )}
        </Button>

        {/* Notifications */}
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Button>

          {/* Notifications dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold">Notifications</h3>
              </div>
              <div className="p-4 max-h-96 overflow-y-auto">
                <p className="text-sm text-gray-500 text-center">
                  {t('common.noData')}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-semibold">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="hidden md:block text-left">
              <div className="text-sm font-medium">{user?.name}</div>
              <div className="text-xs text-gray-500">{user?.role}</div>
            </div>
          </button>

          {/* User dropdown */}
          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
              <div className="p-2">
                <button className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md hover:bg-gray-100 dark:hover:bg-gray-700">
                  <User className="h-4 w-4" />
                  {t('nav.profile')}
                </button>
                <button className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md hover:bg-gray-100 dark:hover:bg-gray-700">
                  <SettingsIcon className="h-4 w-4" />
                  {t('nav.settings')}
                </button>
                <div className="my-1 border-t border-gray-200 dark:border-gray-700" />
                <button
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 disabled:opacity-50"
                >
                  {loggingOut ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <LogOut className="h-4 w-4" />
                  )}
                  {loggingOut ? t('common.loading') : t('auth.logout')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
