import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

import { AppModule } from './app/app.module';
import { ConfigService } from './config';

async function bootstrap() {
  // Create HTTP app for Better Auth endpoints
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Enable CORS
  app.enableCors({
    origin: configService.corsOrigin,
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

  // Connect RabbitMQ microservice
  const rabbitMqUrl = process.env.RABBITMQ_URI || 'amqp://localhost:5672';
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [rabbitMqUrl],
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

  Logger.log(`🚀 Auth Service (HTTP) running on: http://${host}:${port}/${globalPrefix}`);
  Logger.log(`📡 Auth Service (RabbitMQ) connected to: ${rabbitMqUrl}`);
  Logger.log(`   Queue: auth_queue`);
  Logger.log(`🔐 Auth endpoints available at: http://${host}:${port}/${globalPrefix}/auth`);
}

bootstrap();
