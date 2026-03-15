import { expo } from '@better-auth/expo';
import { ConfigService } from '@smart-retail-x/config';
import { betterAuth } from 'better-auth';
import { openAPI } from 'better-auth/plugins';
import { Pool } from 'pg';

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
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 30_000,
    keepAlive: true,
  });

  // Prevent hard process crashes on transient network/DB restarts.
  // `pg` emits pool-level errors for idle clients; without a listener
  // Node treats them as uncaught "error" events and exits.
  pool.on('error', (error) => {
    console.error('[better-auth][pg] idle client error:', error.message);
  });

  // Base URL for Better Auth
  // Note: In development, we use the actual host from environment or default to localhost
  // Better Auth needs this for generating callback URLs and validating requests
  const baseURL = configService.isProduction
    ? process.env.BASE_URL || `http://localhost:${configService.port}`
    : process.env.BASE_URL || `http://localhost:${configService.port}`;

  // Parse CORS origins (supports comma-separated list)
  const corsOrigins = configService.corsOrigin.split(',').map((o) => o.trim());

  // Build trusted origins list
  // In development: Don't set trustedOrigins to allow all origins (including mobile apps)
  // In production: Use specific list for security
  const trustedOrigins = configService.isProduction
    ? [
        ...corsOrigins.filter((o) => o !== '*' && o.startsWith('http')),
        'mobile-app://',
        'mobile-app://*',
      ]
    : []; // Empty array in development = allow all

  return betterAuth({
    database: pool,

    // Plugins
    plugins: [expo(), openAPI()],

    // Base URL for the application
    baseURL,

    // Enable hooks for the nestjs-better-auth library
    // This is required to use @Hook, @BeforeHook, @AfterHook decorators
    hooks: {},

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
      useSecureCookies: false, // Force false for localhost/development
      cookieSameSite: 'lax', // Lax for development compatibility
      crossSubdomain: false, // Disable for localhost
      disableCSRFCheck: !configService.isProduction, // Disable CSRF in development for mobile
      generateSessionToken: () => {
        // Use crypto for secure token generation
        return crypto.randomUUID();
      },
    },

    // Trusted origins - empty array in dev allows all origins (including mobile)
    trustedOrigins,

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
export type Auth = ReturnType<typeof createBetterAuthInstance>;
