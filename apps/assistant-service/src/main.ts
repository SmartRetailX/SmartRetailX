import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

import { AppModule } from './app/app.module';

async function bootstrap() {
  const rabbitMqUrl = process.env.RABBITMQ_URI;
  const queueName = process.env.ASSISTANT_SERVICE_QUEUE || 'assistant_queue';

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

  Logger.log(`Assistant Service started`);
  Logger.log(`Connected to: ${rabbitMqUrl}`);
  Logger.log(`Queue: ${queueName}`);
  Logger.log(`Listening for voice assistant requests...`);
}

bootstrap();
