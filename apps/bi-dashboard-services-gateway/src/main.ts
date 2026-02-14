import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ConfigService } from '@smart-retail-x/config';

import { AppModule } from './app/app.module';

const logger = new Logger('BiDashboardService');

async function bootstrap() {
  // Create app context to access ConfigService
  const appContext = await NestFactory.createApplicationContext(AppModule);
  const configService = appContext.get<ConfigService>(ConfigService);

  // Check if we should run in HTTP mode (for local development with Swagger)
  const enableHttpMode = configService.get<string>('BI_DASHBOARD_HTTP_MODE') === 'true';
  const rabbitmqUri = configService.rabbitmqUri;
  const queue = configService.biDashboardServiceQueue;

  appContext.close(); // Close the app context as we only needed it for config

  if (enableHttpMode) {
    // Hybrid mode: HTTP + RabbitMQ (for development with Swagger docs)
    const { DocumentBuilder, SwaggerModule } = await import('@nestjs/swagger');

    const app = await NestFactory.create(AppModule);

    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe());
    app.enableCors();

    // Swagger Configuration
    const config = new DocumentBuilder()
      .setTitle('Smart RetailX BI Dashboard API')
      .setDescription('AI-powered retail analytics and forecasting API')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('Products', 'Product management')
      .addTag('Sales', 'Sales transactions')
      .addTag('Promotions', 'Promotion campaigns')
      .addTag('Alerts', 'Stock alerts and notifications')
      .addTag('Forecasts', 'Sales forecasting')
      .addTag('Inventory', 'Inventory management')
      .addTag('Analytics', 'Business analytics')
      .addTag('XAI', 'Explainable AI')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);

    // Also connect RabbitMQ in hybrid mode
    app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.RMQ,
      options: {
        urls: [rabbitmqUri],
        queue,
        queueOptions: { durable: true },
      },
    });

    await app.startAllMicroservices();

    const port = configService.get<number>('BI_DASHBOARD_PORT', 3001);
    await app.listen(port);

    logger.log(`🛒 BI Dashboard Services running on http://localhost:${port}`);
    logger.log(`📚 Swagger docs available at http://localhost:${port}/docs`);
    logger.log(`🐰 RabbitMQ: ${rabbitmqUri} (queue: ${queue})`);
  } else {
    // Pure microservice mode: RabbitMQ only (production)
    const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
      transport: Transport.RMQ,
      options: {
        urls: [rabbitmqUri],
        queue,
        queueOptions: { durable: true },
      },
    });

    app.useGlobalPipes(new ValidationPipe());

    await app.listen();

    logger.log(`🛒 BI Dashboard Microservice started`);
    logger.log(`🐰 RabbitMQ: ${rabbitmqUri}`);
    logger.log(`📬 Queue: ${queue}`);
    logger.log(`💡 HTTP mode disabled - all requests via API Gateway`);
  }
}

bootstrap();
