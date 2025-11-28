/**
 * API Gateway - HTTP entry point with RabbitMQ microservices communication
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { createProxyMiddleware } from 'http-proxy-middleware';

import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for the client
  app.enableCors({
    origin: 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  });

  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);

  // Proxy Auth endpoints to auth-service (HTTP) for Better Auth compatibility
  app.use(
    '/api/auth',
    createProxyMiddleware({
      target: 'http://localhost:3001',
      changeOrigin: true,
    }),
  );

  const port = process.env.PORT || 3000;
  await app.listen(port);

  Logger.log(`🚀 API Gateway running on: http://localhost:${port}/${globalPrefix}`);
  Logger.log(`📡 Communication:`);
  Logger.log(`   → /api/auth/* → Auth Service (HTTP Proxy to 3001)`);
  Logger.log(`   → /api/assistant/* → Assistant Service (RabbitMQ)`);
  Logger.log(`🐰 RabbitMQ: ${process.env.RABBITMQ_URI || 'amqp://localhost:5672'}`);
  Logger.log(`🤖 Voice Assistant Ready`);
}

bootstrap();
