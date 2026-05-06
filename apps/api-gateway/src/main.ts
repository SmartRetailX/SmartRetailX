import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import { ConfigService } from '@smart-retail-x/config';

import { AppModule } from './app/app.module';
import { SwaggerDocumentService } from './docs/swagger-document.service';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { createCorsMatcher, parseCorsOrigins } from './lib/cors';

async function bootstrap() {
  // Disable body parser to allow Better Auth to handle request bodies
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
  });
  const configService = app.get(ConfigService);

  // Enable global request logging
  app.useGlobalInterceptors(new LoggingInterceptor());

  const allowedOrigins = parseCorsOrigins(configService.corsOrigin);
  const isOriginAllowed = createCorsMatcher(allowedOrigins);

  // Enable CORS for the client
  app.enableCors({
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
        return callback(null, true);
      }

      Logger.warn(`CORS: Rejected origin: ${origin ?? 'unknown'}`);
      // Return "false" instead of throwing an error so disallowed origins don't surface as server 500s.
      callback(null, false);
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

  // Setup Swagger for automatic API documentation
  const config = new DocumentBuilder()
    .setTitle('Smart RetailX API Gateway')
    .setDescription(
      'Complete API reference for Smart RetailX platform - automatically generated from controllers',
    )
    .setVersion('1.0.0')
    .addServer(`http://localhost:${configService.port}/${globalPrefix}`, 'Development server')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // Store the document in the service for the docs controller to access
  const swaggerDocService = app.get(SwaggerDocumentService);
  swaggerDocService.setDocument(document);

  app.use(
    `/${globalPrefix}/reference`,
    apiReference({
      url: `/${globalPrefix}/openapi/combined.json`,
      theme: 'saturn',
      hideClientButton: true,
      hideModels: true,
    }),
  );

  const port = configService.port;
  const host = configService.host;

  await app.listen(port, host);

  Logger.log(`🚀 API Gateway running on: http://${host}:${port}/${globalPrefix}`);
  Logger.log(`📚 API docs available at: http://${host}:${port}/${globalPrefix}/reference`);
  Logger.log(`🐰 RabbitMQ: ${configService.rabbitmqUri}`);
}

bootstrap();
