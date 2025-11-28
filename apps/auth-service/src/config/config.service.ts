import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';

/**
 * Type-safe configuration service for auth-service
 */
@Injectable()
export class ConfigService {
  constructor(private configService: NestConfigService) {}

  // Server Configuration
  get nodeEnv(): string {
    return this.configService.get<string>('NODE_ENV', 'development');
  }

  get port(): number {
    return this.configService.get<number>('PORT', 3000);
  }

  get host(): string {
    return this.configService.get<string>('HOST', 'localhost');
  }

  get isDevelopment(): boolean {
    return this.nodeEnv === 'development';
  }

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  // Database Configuration
  get databaseUrl(): string {
    return this.configService.getOrThrow<string>('DATABASE_URL');
  }

  get databasePoolMin(): number {
    return this.configService.get<number>('DATABASE_POOL_MIN', 2);
  }

  get databasePoolMax(): number {
    return this.configService.get<number>('DATABASE_POOL_MAX', 10);
  }

  // JWT Configuration
  get jwtSecret(): string {
    return this.configService.getOrThrow<string>('JWT_SECRET');
  }

  get jwtExpiresIn(): string {
    return this.configService.get<string>('JWT_EXPIRES_IN', '15m');
  }

  get jwtRefreshSecret(): string {
    return this.configService.getOrThrow<string>('JWT_REFRESH_SECRET');
  }

  get jwtRefreshExpiresIn(): string {
    return this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');
  }

  // CORS Configuration
  get corsOrigin(): string {
    return this.configService.get<string>('CORS_ORIGIN', 'http://localhost:4200');
  }

  get corsCredentials(): boolean {
    return this.configService.get<string>('CORS_CREDENTIALS', 'true') === 'true';
  }

  // Rate Limiting
  get rateLimitTtl(): number {
    return this.configService.get<number>('RATE_LIMIT_TTL', 60);
  }

  get rateLimitMax(): number {
    return this.configService.get<number>('RATE_LIMIT_MAX', 100);
  }

  // Logging
  get logLevel(): string {
    return this.configService.get<string>('LOG_LEVEL', 'info');
  }

  // Redis Configuration
  get redisHost(): string {
    return this.configService.get<string>('REDIS_HOST', 'localhost');
  }

  get redisPort(): number {
    return this.configService.get<number>('REDIS_PORT', 6379);
  }

  get redisPassword(): string {
    return this.configService.get<string>('REDIS_PASSWORD', '');
  }
}
