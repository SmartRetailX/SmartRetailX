// API endpoint constants
export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: '/api/auth/sign-in/email',
    REGISTER: '/api/auth/sign-up/email',
    LOGOUT: '/api/auth/sign-out',
  },

  // Users
  USERS: {
    LIST: '/api/bi/users',
    GET: (id: string) => `/api/bi/users/${id}`,
    CREATE: '/api/bi/users',
    UPDATE: (id: string) => `/api/bi/users/${id}`,
    DELETE: (id: string) => `/api/bi/users/${id}`,
  },

  // Products
  PRODUCTS: {
    LIST: '/api/bi/products',
    GET: (id: string) => `/api/bi/products/${id}`,
    CREATE: '/api/bi/products',
    UPDATE: (id: string) => `/api/bi/products/${id}`,
    DELETE: (id: string) => `/api/bi/products/${id}`,
  },

  // Sales
  SALES: {
    LIST: '/api/bi/sales',
    CREATE: '/api/bi/sales',
    AGGREGATE: '/api/bi/sales/aggregate',
  },

  // Inventory
  INVENTORY: {
    STATUS: '/api/bi/inventory/status',
    RESTOCK: '/api/bi/inventory/restock',
  },

  // Forecasts
  FORECASTS: {
    GET: '/api/bi/forecasts',
  },

  // Customers
  CUSTOMERS: {
    LIST: '/api/bi/customers',
    GET: (id: string) => `/api/bi/customers/${id}`,
  },

  // Alerts
  ALERTS: {
    LIST: '/api/bi/alerts',
    ACCEPT: (id: string) => `/api/bi/alerts/${id}/accept`,
  },

  // XAI
  XAI: {
    EXPLAIN_FORECAST: '/api/bi/xai/explain/forecast',
    EXPLAIN_RESTOCK: '/api/bi/xai/explain/restock',
  },

  // Analytics
  ANALYTICS: {
    DASHBOARD: '/api/bi/analytics/dashboard',
  },

  // Promotions
  PROMOTIONS: {
    LIST: '/api/bi/promotions',
  },

  // Promotion Engine (ML Service)
  PROMOTION_ENGINE: {
    PRODUCTS: '/api/promotion-engine/products',
    CATEGORIES: '/api/promotion-engine/products/categories',
    GENERATE: '/api/promotion-engine/campaigns/generate',
    HEALTH: '/api/promotion-engine/health',
  },

  // Audit Logs
  AUDIT: {
    LIST: '/api/bi/audit-logs',
  },

  // Notifications
  NOTIFICATIONS: {
    LIST: '/api/bi/notifications',
  },

  // Voice
  VOICE: {
    TEXT_QUERY: '/api/bi/voice/text-query',
    CHAT: '/api/v1/voice/chat',
    TEXT_CHAT: '/api/v1/voice/chat/text',
    SESSION: '/api/v1/voice/chat/session',
  },

  // Health
  HEALTH: {
    CHECK: '/api/bi/health',
  },
} as const
