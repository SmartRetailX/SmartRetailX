import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@smart-retail-x/config';

import { AppModule } from './app/app.module';
import { LoggingInterceptor } from './interceptors/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Enable global request logging
  app.useGlobalInterceptors(new LoggingInterceptor());

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

  const port = configService.port;
  const host = configService.host;

  await app.listen(port, host);

  Logger.log(`API Gateway running on: http://${host}:${port}/${globalPrefix}`);
  Logger.log(`RabbitMQ: ${configService.rabbitmqUri}`);
}

bootstrap();
