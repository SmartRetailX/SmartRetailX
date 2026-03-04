import { useEffect } from 'react'
import { useRoutes } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AuthProvider } from './contexts/AuthContext'
import { useThemeStore } from './stores/appStore'
import { appRoutes } from './routes'

function AppRoutes() {
  return useRoutes(appRoutes)
}

function App() {
  const { theme } = useThemeStore()
  const { i18n } = useTranslation()

  // Apply theme on mount
  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark')
    document.documentElement.classList.add(theme)
  }, [theme])

  // Apply language direction
  useEffect(() => {
    document.documentElement.dir = i18n.language === 'ar' ? 'rtl' : 'ltr'
  }, [i18n.language])

  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}

export default App
