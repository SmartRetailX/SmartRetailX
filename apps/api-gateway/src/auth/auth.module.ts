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
 * - Better Auth admin plugin with built-in admin/user roles
 * - Email/Password authentication with session management
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
          disableGlobalAuthGuard: false,
          disableBodyParser: false,
          disableTrustedOriginsCors: false,
          enableRawBodyParser: false,
        };
      },
    }),
  ],
})
export class AuthModule {}
