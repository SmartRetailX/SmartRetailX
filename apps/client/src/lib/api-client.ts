import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'

// Auth endpoints that bypass 401 redirect logic
const AUTH_ENDPOINTS = ['/api/auth/sign-in', '/api/auth/sign-up', '/api/auth/sign-out']

const isAuthEndpoint = (url?: string): boolean => {
  return !!url && AUTH_ENDPOINTS.some(endpoint => url.includes(endpoint))
}

// Axios instance with auth handling
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
})

// Add auth token and language to requests
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('accessToken')
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`
  }

  const language = localStorage.getItem('language') || 'en'
  config.params = { ...config.params, lang: language }

  return config
})

// Handle 401 errors - redirect to login for expired sessions
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const config = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    if (
      error.response?.status === 401 &&
      !config._retry &&
      !isAuthEndpoint(config?.url)
    ) {
      config._retry = true
      localStorage.removeItem('accessToken')
      localStorage.removeItem('user')

      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login'
      }
    }

    return Promise.reject(error)
  }
)

// Helper to extract error message from API responses
export function handleApiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ message?: string; error?: { message?: string } }>
    return axiosError.response?.data?.message || axiosError.response?.data?.error?.message || axiosError.message || 'An error occurred'
  }
  return 'An unexpected error occurred'
}

export default apiClient
