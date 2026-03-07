import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Theme, Language } from '@/types/api'

interface ThemeState {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'light',
      setTheme: (theme) => {
        set({ theme })
        // Apply theme to document
        document.documentElement.classList.remove('light', 'dark')
        document.documentElement.classList.add(theme)
      },
      toggleTheme: () =>
        set((state) => {
          const newTheme = state.theme === 'light' ? 'dark' : 'light'
          document.documentElement.classList.remove('light', 'dark')
          document.documentElement.classList.add(newTheme)
          return { theme: newTheme }
        }),
    }),
    {
      name: 'theme-storage',
    }
  )
)

interface LanguageState {
  language: Language
  setLanguage: (language: Language) => void
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: 'en',
      setLanguage: (language) => set({ language }),
    }),
    {
      name: 'language-storage',
    }
  )
)

interface SidebarState {
  collapsed: boolean
  setCollapsed: (collapsed: boolean) => void
  toggle: () => void
}

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set) => ({
      collapsed: false,
      setCollapsed: (collapsed) => set({ collapsed }),
      toggle: () => set((state) => ({ collapsed: !state.collapsed })),
    }),
    {
      name: 'sidebar-storage',
    }
  )
)
