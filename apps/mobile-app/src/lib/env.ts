/**
 * Environment configuration for mobile app
 * Centralizes all environment variable access
 */

import { Platform } from 'react-native';

/**
 * Get environment variable
 */
function getEnv(key: string, fallback = ''): string {
  return process.env[key] || fallback;
}

/**
 * Check if we're in development mode
 */
export const isDev = __DEV__;

/**
 * Application configuration
 */
export const app = {
  name: getEnv('EXPO_PUBLIC_APP_NAME', 'SmartRetailX'),
  version: getEnv('EXPO_PUBLIC_APP_VERSION', '1.0.0'),
  env: getEnv('EXPO_PUBLIC_APP_ENV', 'development') as 'development' | 'production',
} as const;

/**
 * API configuration with automatic platform detection
 */
export const api = {
  /**
   * Get the base API URL based on environment and platform
   * Returns the base URL without /api/auth suffix (Better Auth client adds it)
   */
  getBaseUrl: (): string => {
    // Use environment variable if set
    const envUrl = getEnv('EXPO_PUBLIC_API_URL');
    if (envUrl) {
      console.log('[ENV] Using API URL from EXPO_PUBLIC_API_URL:', envUrl);
      return envUrl;
    }

    // Fallback to platform-specific defaults for development
    if (isDev) {
      const devUrl = Platform.select({
        ios: 'http://localhost:3000',
        android: 'http://10.0.2.2:3000', // Android emulator
        default: 'http://localhost:3000',
      }) as string;

      console.log('[ENV] Using default dev URL for platform:', Platform.OS, '->', devUrl);
      return devUrl;
    }

    // Production fallback
    throw new Error(
      'EXPO_PUBLIC_API_URL must be set in production. ' +
        'Create a .env file or set the environment variable.',
    );
  },

  /**
   * Get the full auth API URL (base URL + /api/auth)
   */
  getAuthUrl: (): string => {
    const baseUrl = api.getBaseUrl();
    return `${baseUrl}/api/auth`;
  },
} as const;

/**
 * Log configuration on startup (development only)
 */
if (isDev) {
  console.log('=== Mobile App Configuration ===');
  console.log('App Name:', app.name);
  console.log('App Version:', app.version);
  console.log('Environment:', app.env);
  console.log('Platform:', Platform.OS);
  console.log('API Base URL:', api.getBaseUrl());
  console.log('Auth URL:', api.getAuthUrl());
  console.log('================================');
}
