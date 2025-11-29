import { Module } from '@nestjs/common';

import { ConfigModule, ConfigService } from '../config';
import { createBetterAuthInstance } from '../lib/better-auth';
import { AuthController } from './auth.controller';

/**
 * Authentication module
 * Provides Better Auth integration for the application
 */
@Module({
  imports: [ConfigModule],
  controllers: [AuthController],
  providers: [
    {
      provide: 'BETTER_AUTH',
      useFactory: (configService: ConfigService) => {
        return createBetterAuthInstance(configService);
      },
      inject: [ConfigService],
    },
  ],
  exports: ['BETTER_AUTH'],
})
export class AuthModule {}
