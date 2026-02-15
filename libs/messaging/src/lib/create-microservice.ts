import { INestMicroservice } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ConfigService } from '@smart-retail-x/config';

/**
 * Queue getter function type
 * Extracts queue name from ConfigService
 */
export type QueueGetter = (config: ConfigService) => string;

/**
 * Creates a NestJS microservice with RabbitMQ transport
 * Uses existing ConfigService for type-safe configuration
 *
 * @param appModule - The root application module
 * @param queueGetter - Function to extract queue name from ConfigService
 * @returns Configured NestJS microservice instance
 *
 * @example
 * ```typescript
 * // Create microservice for core service
 * const app = await createMicroserviceWithConfig(
 *   CoreServiceModule,
 *   (config) => config.coreServiceQueue
 * );
 * await app.listen();
 * ```
 */
export async function createMicroserviceWithConfig(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  appModule: any,
  queueGetter: QueueGetter,
): Promise<INestMicroservice> {
  // Create a temporary application to access ConfigService
  const tempApp = await NestFactory.createApplicationContext(appModule);
  const configService = tempApp.get(ConfigService);

  // Extract configuration using the provided getter
  const queue = queueGetter(configService);
  const uri = configService.rabbitmqUri;

  // Close temporary application
  await tempApp.close();

  // Create the microservice with RabbitMQ transport
  const microservice = await NestFactory.createMicroservice<MicroserviceOptions>(appModule, {
    transport: Transport.RMQ,
    options: {
      urls: [uri],
      queue,
      queueOptions: {
        durable: true,
      },
      // Prefetch configuration for better load distribution
      prefetchCount: 10,
      // Connection reliability settings
      socketOptions: {
        heartbeatIntervalInSeconds: 60,
        reconnectTimeInSeconds: 5,
      },
      // Ensure proper message acknowledgment
      noAck: false,
    },
  });

  return microservice;
}

/**
 * Creates a hybrid application (HTTP + Microservice)
 * Useful when you need both REST API and message handling
 *
 * @param appModule - The root application module
 * @param queueGetter - Function to extract queue name from ConfigService
 * @returns Configured NestJS application with microservice attached
 *
 * @example
 * ```typescript
 * // Create hybrid application
 * const app = await createHybridAppWithConfig(
 *   ApiGatewayModule,
 *   (config) => config.coreServiceQueue
 * );
 * await app.startAllMicroservices();
 * await app.listen(3000);
 * ```
 */
export async function createHybridAppWithConfig(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  appModule: any,
  queueGetter: QueueGetter,
) {
  // Create HTTP application
  const app = await NestFactory.create(appModule);

  // Get ConfigService from the application
  const configService = app.get(ConfigService);

  // Extract configuration
  const queue = queueGetter(configService);
  const uri = configService.rabbitmqUri;

  // Connect microservice to the HTTP application
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [uri],
      queue,
      queueOptions: {
        durable: true,
      },
      prefetchCount: 10,
      socketOptions: {
        heartbeatIntervalInSeconds: 60,
        reconnectTimeInSeconds: 5,
      },
      noAck: false,
    },
  });

  return app;
}
