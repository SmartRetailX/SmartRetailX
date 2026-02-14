import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@smart-retail-x/config';

import { AuthModule } from '../../auth/auth.module';
import { CoreController } from './app.controller';
import { CoreService } from './app.service';

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
            queue: configService.coreServiceQueue,
            queueOptions: {
              durable: true,
            },
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [CoreController],
  providers: [CoreService],
})
export class CoreModule {}
