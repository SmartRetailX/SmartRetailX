import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { ConfigModule } from '@smart-retail-x/config';
import { MessagingHealthModule, RabbitMQModule } from '@smart-retail-x/messaging';

import { HealthController } from './health.controller';
import { MessagingHealthController } from './messaging-health.controller';

@Module({
  imports: [
    ConfigModule,
    TerminusModule,
    MessagingHealthModule,
    RabbitMQModule.registerMany([
      {
        name: 'CORE_SERVICE',
        queueGetter: (config) => config.coreServiceQueue,
      },
      {
        name: 'BI_DASHBOARD_SERVICE',
        queueGetter: (config) => config.biDashboardServiceQueue,
      },
    ]),
  ],
  controllers: [HealthController, MessagingHealthController],
})
export class HealthModule {}
