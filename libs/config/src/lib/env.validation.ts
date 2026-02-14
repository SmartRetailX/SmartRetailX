/**
 * Environment variable validation and type definitions
 * Ensures all required environment variables are present at startup
 */

import { z } from 'zod';

const envSchema = z.object({
  // Global Configuration
  NODE_ENV: z.enum(['development', 'production', 'test', 'staging']).default('development'),

  // API Gateway Configuration
  API_GATEWAY_PORT: z.string().default('3000').transform(Number).pipe(z.number().min(1).max(65535)),
  API_GATEWAY_HOST: z.string().default('localhost'),

  // Backward compatibility - fallback to old PORT/HOST if new ones not set
  PORT: z.string().optional(),
  HOST: z.string().optional(),

  // Database Configuration
  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL is required')
    .refine(
      (url) => url.startsWith('postgres://') || url.startsWith('postgresql://'),
      'DATABASE_URL must be a valid PostgreSQL connection string',
    ),
  DATABASE_POOL_MIN: z.string().default('2').transform(Number).pipe(z.number().min(1)),
  DATABASE_POOL_MAX: z.string().default('10').transform(Number).pipe(z.number().min(1)),

  // JWT Configuration
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // CORS Configuration
  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  // Rate Limiting
  RATE_LIMIT_TTL: z.string().default('60').transform(Number).pipe(z.number().min(1)),
  RATE_LIMIT_MAX: z.string().default('100').transform(Number).pipe(z.number().min(1)),

  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  // RabbitMQ Configuration
  RABBITMQ_URI: z
    .string()
    .default('amqp://localhost:5672')
    .refine(
      (url) => url.startsWith('amqp://') || url.startsWith('amqps://'),
      'RABBITMQ_URI must be a valid AMQP URL',
    ),

  // Service Queue Configurations
  ASSISTANT_SERVICE_QUEUE: z.string().default('assistant_queue'),
  BI_DASHBOARD_SERVICE_QUEUE: z.string().default('bi_dashboard_queue'),

  // Base URL (for production)
  BASE_URL: z.string().url().optional(),

  // Core Service Configuration (optional for services that need it)
  CORE_SERVICE_URL: z.string().url().optional(),
  CORE_SERVICE_PORT: z
    .string()
    .optional()
    .transform((val) => (val ? Number(val) : undefined)),

  // Redis Configuration (optional for services that need it)
  REDIS_HOST: z.string().optional(),
  REDIS_PORT: z
    .string()
    .optional()
    .transform((val) => (val ? Number(val) : undefined)),
  REDIS_PASSWORD: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Validate and parse environment variables
 * Throws an error if validation fails with detailed error messages
 */
export function validateEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error('❌ Environment validation failed:');
    parsed.error.issues.forEach((issue) => {
      console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
    });
    throw new Error('Invalid environment configuration');
  }

  return parsed.data;
}
