import { betterAuth } from 'better-auth';
import { Pool } from 'pg';

import { ConfigService } from '../config';

/**
 * Initialize Better Auth instance with PostgreSQL
 * This provides a complete authentication solution with:
 * - Email/Password authentication
 * - Session management
 * - Account verification
 * - Password reset
 */
export const createBetterAuthInstance = (configService: ConfigService) => {
  // Create PostgreSQL connection pool
  const pool = new Pool({
    connectionString: configService.databaseUrl,
    min: configService.databasePoolMin,
    max: configService.databasePoolMax,
  });

  const baseURL = configService.isProduction
    ? process.env.BASE_URL || `http://${configService.host}:${configService.port}`
    : `http://${configService.host}:${configService.port}`;

  return betterAuth({
    database: pool,

    // Base path for auth endpoints (they will be under /api/auth/*)
    basePath: '/api/auth',

    // Base URL for the application
    baseURL,

    // Email and password authentication
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false, // Set to true in production with email service
      minPasswordLength: 8,
      maxPasswordLength: 128,
    },

    // Session configuration
    session: {
      expiresIn: 60 * 60 * 24 * 7, // 7 days
      updateAge: 60 * 60 * 24, // 1 day
      cookieCache: {
        enabled: true,
        maxAge: 60 * 5, // 5 minutes
      },
    },

    // User schema customization
    user: {
      additionalFields: {
        role: {
          type: 'string',
          defaultValue: 'user',
          required: false,
        },
        emailVerified: {
          type: 'boolean',
          defaultValue: false,
          required: false,
        },
      },
    },

    // Trust proxy for production (when behind nginx/load balancer)
    advanced: {
      useSecureCookies: false, // Force false for localhost
      cookieSameSite: 'lax', // Force lax for localhost
      crossSubdomain: false, // Disable for localhost
    },

    // Trusted origins (Client URL)
    trustedOrigins: [configService.corsOrigin],

    // Enable debug logging
    logger: {
      level: 'debug',
      disabled: false,
    },
  });
};

/**
 * Type helper for Better Auth instance
 */
export type BetterAuthInstance = ReturnType<typeof createBetterAuthInstance>;
