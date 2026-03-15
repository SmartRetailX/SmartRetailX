/**
 * Environment Configuration
 *
 * Note: Better Auth configuration is handled in src/lib/auth-client.ts
 * This file contains other environment variables used throughout the app
 */
export default {
  // API Configuration
  API_URL: import.meta.env.PUBLIC_BASE_URL || 'http://localhost:3000',

  // WebSocket Configuration
  WS_URL: import.meta.env.PUBLIC_WS_URL || 'ws://localhost:3001',
};
