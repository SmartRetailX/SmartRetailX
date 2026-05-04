import { expo } from '@better-auth/expo';
import { ConfigService } from '@smart-retail-x/config';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { admin as adminPlugin, openAPI } from 'better-auth/plugins';

import { prisma } from './prisma';

/**
 * Initialize Better Auth instance with PostgreSQL
 * This provides a complete authentication solution with:
 * - Email/Password authentication
 * - Session management
 * - Account verification
 * - Password reset
 */
export const createBetterAuthInstance = (configService: ConfigService) => {
  const baseURL = configService.betterAuthUrl;
  const corsOrigins = configService.corsOrigin.split(',').map((o) => o.trim());
  const trustedOrigins = configService.isProduction
    ? [
        ...corsOrigins.filter((o) => o !== '*' && o.startsWith('http')),
        'mobile-app://',
        'mobile-app://*',
      ]
    : [];

  return betterAuth({
    secret: configService.betterAuthSecret,
    database: prismaAdapter(prisma, {
      provider: 'postgresql',
    }),

    plugins: [
      expo(),
      openAPI(),
      adminPlugin({
        adminRoles: ['admin'],
        defaultRole: 'user',
      }),
    ],

    basePath: '/api/auth',
    baseURL,
    hooks: {},
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
      minPasswordLength: 8,
      maxPasswordLength: 128,
    },
    user: {
      additionalFields: {
        age: {
          type: 'number',
          required: false,
        },
        gender: {
          type: 'string',
          required: false,
        },
        City: {
          type: 'string',
          required: false,
        },
        mobileNumber: {
          type: 'string',
          required: false,
        },
        customerSegment: {
          type: 'string',
          required: false,
          input: true,
        },
        role: {
          type: 'string',
          required: true,
          input: false,
          defaultValue: 'user',
        },
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
      cookieCache: {
        enabled: true,
        maxAge: 60 * 5,
      },
    },
    advanced: {
      useSecureCookies: configService.isProduction,
      cookieSameSite: configService.isProduction ? 'none' : 'lax',
      crossSubdomain: false,
      disableCSRFCheck: !configService.isProduction,
      generateSessionToken: () => crypto.randomUUID(),
    },
    trustedOrigins,
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
