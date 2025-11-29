/**
 * API Gateway - Unified HTTP entry point with Authentication and RabbitMQ microservices communication
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

import { AppModule } from './app/app.module';
import { ConfigService } from './config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Enable CORS for the client
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, curl)
      if (!origin) {
        return callback(null, true);
      }

      const allowedOrigins = configService.corsOrigin.split(',').map((o) => o.trim());

      // Check if origin is allowed
      if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        callback(null, true);
      } else {
        // Log rejected origin for debugging
        Logger.warn(`CORS: Rejected origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Cookie',
      'X-Requested-With',
      'Accept',
      'Origin',
      'Access-Control-Request-Method',
      'Access-Control-Request-Headers',
    ],
    exposedHeaders: ['Set-Cookie'],
  });

  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);

  // Connect RabbitMQ microservice for auth events
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [configService.rabbitmqUri],
      queue: 'auth_queue',
      queueOptions: {
        durable: true,
      },
    },
  });

  await app.startAllMicroservices();

  const port = configService.port;
  const host = configService.host;

  await app.listen(port, host);

  Logger.log(`🚀 API Gateway running on: http://${host}:${port}/${globalPrefix}`);
  Logger.log(`📡 Communication:`);
  Logger.log(`   → /api/auth/* → Better Auth (integrated)`);
  Logger.log(`   → /api/assistant/* → Assistant Service (RabbitMQ)`);
  Logger.log(`🐰 RabbitMQ: ${configService.rabbitmqUri}`);
  Logger.log(`🔐 Authentication Ready`);
  Logger.log(`🤖 Voice Assistant Ready`);
}

bootstrap();
