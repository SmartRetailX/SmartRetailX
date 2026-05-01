// API Types

export type UserRole = 'ADMIN' | 'OWNER' | 'USER' | 'CUSTOMER' | 'admin' | 'owner' | 'user' | 'customer'
export type Language = 'en' | 'si'
export type Theme = 'light' | 'dark'
export type StockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'
export type PaymentMethod = 'CASH' | 'CARD' | 'MOBILE'

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  emailVerified?: boolean
  image?: string | null
  createdAt?: string
  updatedAt?: string
  phone?: string
  language?: Language
  theme?: Theme
  active?: boolean
}

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  redirect: boolean
  token: string
  user: User
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresIn: number
}


export interface SignupRequest {
  email: string;
  password: string;
  name: string;
}

export interface SignupResponse {
  token: string;
  user: User;
}

export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
}

export interface ApiError {
  success: false
  error: {
    code: string
    message: string
  }
}

export interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface Product {
  id: string
  name: string
  nameSi: string
  sku: string
  barcode?: string
  category: string
  categorySi?: string
  price: number
  cost?: number
  costPrice?: number
  currentStock: number
  stock?: number // Legacy field
  storeId?: string
  reorderLevel?: number
  maxStock?: number
  status: StockStatus | 'in_stock' | 'low_stock' | 'out_of_stock'
  unit?: string
  description?: string
  descriptionSi?: string
  image?: string
  imageUrl?: string
  isActive?: boolean
  supplier?: string
  lastRestocked?: string
  expiryDate?: string
  createdAt?: string
  updatedAt?: string
}

export interface SaleItem {
  productId: string
  productName: string
  quantity: number
  price: number
}

export interface Sale {
  id: string
  transactionId: string
  totalAmount: number
  finalAmount: number
  discount: number
  paymentMethod: PaymentMethod
  timestamp: string
  items: SaleItem[]
}

export interface SalesAggregate {
  totalRevenue?: number
  totalOrders?: number
  averageOrderValue?: number
  topProducts: {
    productId: string
    productName: string
    productNameSi?: string
    quantity?: number
    totalQuantity?: number
    revenue?: number
    totalRevenue?: number
    profit?: number
  }[]
  dailyTrends?: {
    date: string
    revenue: number
    orders: number
  }[]
  timeSeries?: {
    date: string
    revenue: number
    profit: number
    orders: number
    avgOrderValue: number
  }[]
}

export interface ForecastDriver {
  name: string
  nameSi: string
  impact: number
  description: string
  descriptionSi: string
}

export interface Forecast {
  date: string
  predictedSales: number
  confidenceLower: number
  confidenceUpper: number
  revenue: number
}

export interface ForecastResponse {
  productId: string
  modelType: string
  confidence: number
  generatedAt: string
  forecasts: Forecast[]
  drivers: ForecastDriver[]
}

export interface XAIFeature {
  name: string
  nameSi: string
  value: string | number
  contribution: string
  impact: number
  direction: 'increase' | 'decrease'
  importance: number
  description: string
  descriptionSi: string
}

export interface XAIExplanation {
  predictedValue: number
  confidence: number
  baseValue: number
  modelType: string
  features: XAIFeature[]
}

export interface RestockMetrics {
  predictedDailyDemand: number
  baselineDemand: number
  currentStock: number
  reorderLevel: number
  daysUntilStockout: number
  recommendedQuantity: number
}

export interface RestockExplanation {
  alertId: string
  productId: string
  productName: string
  modelType: string
  explanation: {
    en: string
    si: string
  }
  features: XAIFeature[]
  metrics: RestockMetrics
  confidence: number
  generatedAt: string
}

export interface Alert {
  id: string
  type: 'restock' | 'expiring' | 'price_optimization' | 'promotion' | 'RESTOCK' | 'LOW_STOCK' | 'HIGH_DEMAND' | 'PRICE_CHANGE'
  urgency: 'high' | 'medium' | 'low' | 'HIGH' | 'MEDIUM' | 'LOW'
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  productId: string
  productName: string
  productNameSi?: string
  currentStock?: number
  recommendedQuantity?: number
  reason: string
  reasonSi: string
  message?: string
  messageSi?: string
  recommendedAction?: string
  confidence?: number
  estimatedStockoutDate?: string
  status: 'pending' | 'accepted' | 'rejected' | 'PENDING' | 'ACCEPTED' | 'REJECTED'
  createdAt: string
  read?: boolean
}

export interface Customer {
  id: string
  name: string
  email?: string
  phone?: string
  segment: string
  rfmScore: {
    recency: number
    frequency: number
    monetary: number
    total?: number
  }
  metrics: {
    lastPurchase: string
    totalOrders: number
    totalSpent: number
    averageOrderValue: number
    lifetimeValue: number
  }
  createdAt?: string
  // Legacy fields for backward compatibility
  totalSpent?: number
  totalOrders?: number
  lastPurchase?: string
  frequency?: number
  rfmSegment?: string
}

export interface DashboardKPI {
  value: number
  change: number
  trend: 'up' | 'down' | 'stable'
}

export interface DashboardMetrics {
  kpis: {
    totalRevenue: DashboardKPI
    totalOrders: DashboardKPI
    activeAlerts: DashboardKPI
    criticalAlerts: DashboardKPI
    forecastAccuracy: DashboardKPI
    totalProducts: DashboardKPI
    lowStockProducts: DashboardKPI
  }
  topProducts: {
    id: string
    name: string
    revenue: number
    quantity: number
  }[]
  salesTrend: {
    date: string
    revenue: number
    orders: number
  }[]
}

export interface Promotion {
  id: string
  name: string
  nameSi: string
  description?: string
  descriptionSi?: string
  type: 'PERCENTAGE' | 'FIXED' | string
  discountValue: number
  startDate: string
  endDate: string
  status: 'ACTIVE' | 'SCHEDULED' | 'EXPIRED' | string
  applicableProducts?: string[]
  minPurchaseAmount?: number
  usageCount?: number
  totalRevenue?: number
  createdAt?: string
  analytics?: {
    usageCount: number
    totalRevenue: number
    averageOrderValue: number
    conversionRate: number
  }
  // Legacy fields
  active?: boolean
  discount?: number
  productsAffected?: number
  lift?: number
}

export interface AuditLog {
  id: string
  userId: string
  userName: string
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | string
  resource: string
  resourceId: string
  description?: string
  ipAddress?: string
  userAgent?: string
  timestamp: string
  // Legacy fields for backward compatibility
  entity?: string
  entityId?: string
  changes?: Record<string, any>
}

export interface Notification {
  id: string
  type: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS'
  title: string
  titleSi: string
  message: string
  messageSi: string
  read: boolean
  createdAt: string
  actionUrl?: string
}

export interface InventoryStatus {
  totalProducts: number
  lowStockCount: number
  outOfStockCount: number
  totalValue: number
  categories: {
    name: string
    count: number
    value: number
  }[]
}

export interface VoiceQueryResponse {
  query: string
  response: string
  responseSi: string
  data?: any
  suggestedActions?: string[]
}
