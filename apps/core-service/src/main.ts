import { Logger } from '@nestjs/common';
import { createMicroserviceWithConfig } from '@smart-retail-x/messaging';

import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await createMicroserviceWithConfig(AppModule, (config) => config.coreServiceQueue);

  await app.listen();
  Logger.log('Core Service microservice is listening');
  Logger.log('Listening for core service requests...');
}

bootstrap();
