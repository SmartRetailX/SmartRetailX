import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';

import { ConfigModule, ConfigService } from '../../config';
import { BiDashboardController } from './bi-dashboard.controller';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: 'BI_DASHBOARD_SERVICE',
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [configService.rabbitmqUri],
            queue: configService.biDashboardServiceQueue,
            queueOptions: {
              durable: true,
            },
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [BiDashboardController],
})
export class BiDashboardModule {}
