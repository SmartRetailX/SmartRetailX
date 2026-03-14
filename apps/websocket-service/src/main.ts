import { Logger } from '@nestjs/common';
import { createHybridAppWithConfig } from '@smart-retail-x/messaging';

import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await createHybridAppWithConfig(
    AppModule,
    (config) => config.websocketServiceQueue
  );

  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);
  
  // Need port for the HTTP server to attach websockets to
  const port = process.env.WEBSOCKET_SERVICE_PORT || 3004;

  // Start microservice listeners ( RabbitMQ )
  await app.startAllMicroservices();
  Logger.log('WebSocket Service microservice is listening');

  // Start HTTP server for WebSocket clients to connect to
  await app.listen(port);
  Logger.log(`🚀 WebSocket Server is running on: http://localhost:${port}/${globalPrefix}`);
}

bootstrap();
