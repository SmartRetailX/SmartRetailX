import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@smart-retail-x/config';

import { AuthModule } from '../../auth/auth.module';
import { AppController } from './core.controller';
import { AppService } from './core.service';

@Module({
  imports: [
    ConfigModule,
    AuthModule,
    ClientsModule.registerAsync([
      {
        name: 'CORE_SERVICE',
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [configService.rabbitmqUri],
            queue: configService.assistantServiceQueue,
            queueOptions: {
              durable: true,
            },
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class CoreModule {}
