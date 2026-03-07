import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, LoginResponse, SignupResponse } from '@/types/api'
import apiClient from '@/lib/api-client'
import { API_ENDPOINTS } from '@/lib/constants'
import { ADMIN_ROLES, CUSTOMER_ROLES } from '@/routes'

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>
  register: (email: string, password: string, name: string) => Promise<void>
  logout: () => Promise<void>
  isAuthenticated: boolean
  isAdmin: boolean
  isCustomer: boolean
  hasRole: (role: string | string[]) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  // Initialize auth state from localStorage on mount
  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    const storedUser = localStorage.getItem('user')

    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser))
      } catch {
        clearAuthData()
      }
    }
    setLoading(false)
  }, [])

  const clearAuthData = () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('user')
    setUser(null)
  }

  const login = async (email: string, password: string, _rememberMe?: boolean) => {
    const response = await apiClient.post<LoginResponse>(
      API_ENDPOINTS.AUTH.LOGIN,
      { email, password }
    )

    const { user: userData, token } = response.data

    localStorage.setItem('accessToken', token)
    localStorage.setItem('user', JSON.stringify(userData))
    setUser(userData)

    navigate('/', { replace: true })
  }

  const register = async (email: string, password: string, name: string) => {
    const response = await apiClient.post<SignupResponse>(
      API_ENDPOINTS.AUTH.REGISTER,
      { email, password, name }
    )

    const { user: userData, token } = response.data

    localStorage.setItem('accessToken', token)
    localStorage.setItem('user', JSON.stringify(userData))
    setUser(userData)

    navigate('/', { replace: true })
  }

  const logout = async () => {
    try {
      await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT)
    } catch (error) {
      console.error('Logout API call failed:', error)
    } finally {
      clearAuthData()
      navigate('/login')
    }
  }

  const hasRole = (role: string | string[]): boolean => {
    if (!user) return false
    const userRole = user.role.toUpperCase()
    if (Array.isArray(role)) {
      return role.some(r => r.toUpperCase() === userRole)
    }
    return role.toUpperCase() === userRole
  }

  const isAdmin = !!user && ADMIN_ROLES.includes(user.role.toUpperCase())
  const isCustomer = !!user && CUSTOMER_ROLES.includes(user.role.toUpperCase())

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        isAuthenticated: !!user,
        isAdmin,
        isCustomer,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
