import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@smart-retail-x/config';
import { AuthModule as NestJSBetterAuthModule } from '@thallesp/nestjs-better-auth';

import { createBetterAuthInstance } from '../lib/better-auth';

/**
 * Authentication module
 * Provides Better Auth integration using @thallesp/nestjs-better-auth
 *
 * Features:
 * - Global AuthGuard by default (use @AllowAnonymous for public routes)
 * - Session management via @Session decorator
 * - Automatic body parser and CORS handling
 * - Role-based access control with @Roles and @OrgRoles
 */
@Module({
  imports: [
    ConfigModule,
    NestJSBetterAuthModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const auth = createBetterAuthInstance(configService);
        return {
          auth,
          // Keep the global auth guard enabled - all routes protected by default
          disableGlobalAuthGuard: false,
          // Enable body parser and CORS handling
          disableBodyParser: false,
          disableTrustedOriginsCors: false,
          // Disable raw body parser (not needed for our use case)
          enableRawBodyParser: false,
        };
      },
    }),
  ],
})
export class AuthModule {}
