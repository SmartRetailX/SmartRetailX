/**
 * TypeScript type definitions for environment variables
 * This file provides autocomplete and type safety for EXPO_PUBLIC_* variables
 */

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      /**
       * Backend API base URL (without /api/auth suffix)
       * @example 'http://192.168.8.8:3000'
       */
      EXPO_PUBLIC_API_URL: string;

      /**
       * Application name
       * @default 'SmartRetailX'
       */
      EXPO_PUBLIC_APP_NAME?: string;

      /**
       * Application version
       * @default '1.0.0'
       */
      EXPO_PUBLIC_APP_VERSION?: string;

      /**
       * Application environment
       * @default 'development'
       */
      EXPO_PUBLIC_APP_ENV?: 'development' | 'production';
    }
  }
}

export {};
