/**
 * Centralized environment configuration
 * All environment variables are accessed through this module
 */

/**
 * Get environment variable with type safety
 * Throws error if required variable is missing
 */
function getEnv(key: keyof ImportMetaEnv, required = true): string {
  const value = import.meta.env[key];

  if (required && !value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value || '';
}

/**
 * Check if we're in development mode
 */
export const isDev = import.meta.env.DEV;

/**
 * Check if we're in production mode
 */
export const isProd = import.meta.env.PROD;

/**
 * Application configuration
 */
export const app = {
  name: getEnv('PUBLIC_APP_NAME', false) || 'SmartRetailX Portal',
  version: getEnv('PUBLIC_APP_VERSION', false) || '1.0.0',
  env: (getEnv('PUBLIC_APP_ENV', false) || 'development') as
    | 'development'
    | 'staging'
    | 'production',
} as const;

/**
 * API configuration
 */
export const api = {
  baseUrl: getEnv('PUBLIC_API_BASE_URL', false) || 'http://localhost:8000/api',
  timeout: parseInt(getEnv('PUBLIC_API_TIMEOUT', false) || '30000', 10),
} as const;

/**
 * Authentication configuration
 *
 * NOTE: Better Auth uses HttpOnly session cookies.
 * There are no client-side auth tokens stored in env variables or localStorage.
 */
export const auth = {} as const;

/**
 * Feature flags
 */
export const features = {
  devtools: getEnv('PUBLIC_ENABLE_DEVTOOLS', false) !== 'false' && isDev,
  analytics: getEnv('PUBLIC_ENABLE_ANALYTICS', false) === 'true',
} as const;

/**
 * Export all configuration as a single object
 */
export const env = {
  isDev,
  isProd,
  app,
  api,
  auth,
  features,
} as const;

// Default export
export default env;
