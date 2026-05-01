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

  // Core catalog (customer storefront)
  CORE_CATALOG: {
    PRODUCTS: '/api/core/products',
    CATEGORIES: '/api/core/categories',
  },

  // Cart (customer)
  CART: {
    GET: '/api/core/cart',
    ADD_ITEM: '/api/core/cart/items',
    UPDATE_ITEM: (productId: string) => `/api/core/cart/items/${productId}`,
    REMOVE_ITEM: (productId: string) => `/api/core/cart/items/${productId}`,
    CLEAR: '/api/core/cart',
  },

  // Orders (customer)
  ORDERS: {
    LIST: '/api/core/orders',
    CREATE: '/api/core/orders',
    GET: (orderId: string) => `/api/core/orders/${orderId}`,
    CANCEL: (orderId: string) => `/api/core/orders/${orderId}/cancel`,
  },

  // Orders (admin)
  ADMIN_ORDERS: {
    LIST: '/api/core/admin/orders',
    GET: (orderId: string) => `/api/core/admin/orders/${orderId}`,
    UPDATE_STATUS: (orderId: string) => `/api/core/admin/orders/${orderId}/status`,
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
    GENERATE: '/api/bi/alerts/generate',
    AUTO_DISMISS: '/api/bi/alerts/auto-dismiss',
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
    CAMPAIGNS: '/api/promotion-engine/campaigns',
    CAMPAIGN_DETAIL: (id: number) => `/api/promotion-engine/campaigns/${id}`,
    COMPARE: '/api/promotion-engine/campaigns/compare',
    BUNDLES: (productId: string) => `/api/promotion-engine/products/${productId}/bundles`,
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

  // My Promotions (customer inbox — served by promotion engine via email match)
  MY_PROMOTIONS: {
    LIST: '/api/promotion-engine/my-promotions',
    MARK_READ: (id: number) => `/api/promotion-engine/my-promotions/${id}/read`,
    MARK_ALL_READ: '/api/promotion-engine/my-promotions/read-all',
  },

  // Product Suggestions (co-purchase recommendations)
  PRODUCT_SUGGESTIONS: {
    LIST: '/api/promotion-engine/product-suggestions',
  },

  // Cart co-purchase recommendations
  CART_RECOMMENDATIONS: '/api/promotion-engine/cart-recommendations',
} as const

// Core service endpoints
export const CORE_SERVICE_ENDPOINTS = {
  CATALOG: {
    PRODUCTS: '/api/core/products',
    CATEGORIES: '/api/core/categories',
  },

  CART: {
    GET: '/api/core/cart',
    ADD_ITEM: '/api/core/cart/items',
    UPDATE_ITEM: (productId: string) => `/api/core/cart/items/${productId}`,
    REMOVE_ITEM: (productId: string) => `/api/core/cart/items/${productId}`,
    CLEAR: '/api/core/cart',
  },

  ORDERS: {
    LIST: '/api/core/orders',
    CREATE: '/api/core/orders',
    GET: (orderId: string) => `/api/core/orders/${orderId}`,
    CANCEL: (orderId: string) => `/api/core/orders/${orderId}/cancel`,
  },

  ADMIN_ORDERS: {
    LIST: '/api/core/admin/orders',
    GET: (orderId: string) => `/api/core/admin/orders/${orderId}`,
    UPDATE_STATUS: (orderId: string) => `/api/core/admin/orders/${orderId}/status`,
  },

  ADMIN_PRODUCTS: {
    LIST: '/api/core/admin/products',
    GET: (productId: string) => `/api/core/admin/products/${productId}`,
    CREATE: '/api/core/admin/products',
    UPDATE: (productId: string) => `/api/core/admin/products/${productId}`,
    DELETE: (productId: string) => `/api/core/admin/products/${productId}`,
  },
} as const