import { Module } from '@nestjs/common';
import { ConfigModule } from '@smart-retail-x/config';
import { RabbitMQModule } from '@smart-retail-x/messaging';

import { BiDashboardController } from './bi-dashboard.controller';

@Module({
  imports: [
    ConfigModule,
    RabbitMQModule.register({
      name: 'BI_DASHBOARD_SERVICE',
      queueGetter: (config) => config.biDashboardServiceQueue,
    }),
  ],
  controllers: [BiDashboardController],
})
export class BiDashboardModule {}
