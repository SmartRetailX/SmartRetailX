import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { ValidationPipe } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
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

  // RabbitMQ Microservice
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URI || 'amqp://guest:guest@localhost:5672'],
      queue: 'bi_dashboard_queue',
      queueOptions: { durable: true },
    },
  });

  await app.startAllMicroservices();
  
  const port = process.env.BI_DASHBOARD_PORT || 3001;
  await app.listen(port);
  
  console.log(`🛒 BI Dashboard Services running on http://localhost:${port}`);
  console.log(`📚 Swagger docs available at http://localhost:${port}/docs`);
}

bootstrap();