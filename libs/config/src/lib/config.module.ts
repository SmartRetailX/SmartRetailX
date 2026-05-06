import { Global, Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';

import { ConfigService } from './config.service';
import { validateEnv } from './env.validation';

/**
 * Global configuration module for all services
 * Provides type-safe access to environment variables with validation
 *
 * Usage:
 * 1. Import in your app module: `imports: [ConfigModule]`
 * 2. Inject ConfigService: `constructor(private config: ConfigService)`
 * 3. Access config: `this.config.port`, `this.config.databaseUrl`, etc.
 */
@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', `.env.${process.env['NODE_ENV'] || 'development'}`, '.env'],
      cache: true,
      validate: validateEnv,
    }),
  ],
  providers: [ConfigService],
  exports: [ConfigService],
})
export class ConfigModule {}
