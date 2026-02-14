import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ConfigService } from '@smart-retail-x/config';

import { AppModule } from './app/app.module';

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(AppModule);
  const config = appContext.get<ConfigService>(ConfigService);

  const rabbitMqUrl = config.rabbitmqUri;
  const queueName = 'coreServiceQueue';

  appContext.close(); // Close the application context as we only needed it to get the config

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
    transport: Transport.RMQ,
    options: {
      urls: [rabbitMqUrl],
      queue: queueName,
      queueOptions: {
        durable: true,
      },
    },
  });

  await app.listen();
  Logger.log(`Core Service started`);
  Logger.log(`Connected to: ${rabbitMqUrl}`);
  Logger.log(`Queue: ${queueName}`);
  Logger.log(`Listening for core service requests...`);
}

bootstrap();
