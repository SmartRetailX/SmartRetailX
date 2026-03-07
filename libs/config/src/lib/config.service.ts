import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';

/**
 * Type-safe configuration service for all services
 * Provides centralized access to environment variables with proper typing
 */
@Injectable()
export class ConfigService {
  constructor(private configService: NestConfigService) {}

  // Server Configuration
  get nodeEnv(): string {
    return this.configService.get<string>('NODE_ENV', 'development');
  }

  get port(): number {
    // Support both new API_GATEWAY_PORT and old PORT for backward compatibility
    return (
      this.configService.get<number>('API_GATEWAY_PORT') ||
      this.configService.get<number>('PORT', 3000)
    );
  }

  get host(): string {
    // Support both new API_GATEWAY_HOST and old HOST for backward compatibility
    return (
      this.configService.get<string>('API_GATEWAY_HOST') ||
      this.configService.get<string>('HOST', 'localhost')
    );
  }

  get isDevelopment(): boolean {
    return this.nodeEnv === 'development';
  }

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  get isTest(): boolean {
    return this.nodeEnv === 'test';
  }

  get isStaging(): boolean {
    return this.nodeEnv === 'staging';
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
    return this.configService.get<string>('CORS_ORIGIN', 'http://localhost:5173');
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

  // RabbitMQ Configuration
  get rabbitmqUri(): string {
    return this.configService.get<string>('RABBITMQ_URI', 'amqp://localhost:5672');
  }

  // Core Service Configuration
  get coreServiceQueue(): string {
    return this.configService.get<string>('CORE_SERVICE_QUEUE', 'core_queue');
  }

  // BI Dashboard Service Configuration
  get biDashboardServiceQueue(): string {
    return this.configService.get<string>('BI_DASHBOARD_SERVICE_QUEUE', 'bi_dashboard_queue');
  }

  // Base URL Configuration
  get baseUrl(): string | undefined {
    return this.configService.get<string>('BASE_URL');
  }

  // Core Service Configuration
  get coreServiceUrl(): string | undefined {
    return this.configService.get<string>('CORE_SERVICE_URL');
  }

  get coreServicePort(): number | undefined {
    return this.configService.get<number>('CORE_SERVICE_PORT');
  }

  // Redis Configuration
  get redisHost(): string | undefined {
    return this.configService.get<string>('REDIS_HOST');
  }

  get redisPort(): number | undefined {
    return this.configService.get<number>('REDIS_PORT');
  }

  get redisPassword(): string | undefined {
    return this.configService.get<string>('REDIS_PASSWORD');
  }

  /**
   * Get a custom environment variable
   * Useful for service-specific configurations
   */
  get<T = string>(key: string, defaultValue?: T): T | undefined {
    return this.configService.get(key, defaultValue as never) as T | undefined;
  }

  /**
   * Get a required environment variable
   * Throws an error if not found
   */
  getOrThrow<T = string>(key: string): T {
    return this.configService.getOrThrow(key) as T;
  }
}
