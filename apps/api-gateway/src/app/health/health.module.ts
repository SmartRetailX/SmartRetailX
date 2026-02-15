import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { ConfigModule } from '@smart-retail-x/config';
import { MessagingHealthModule } from '@smart-retail-x/messaging';

import { BiDashboardModule } from '../bi-dashboard/bi-dashboard.module';
import { CoreModule } from '../core/app.module';
import { HealthController } from './health.controller';
import { MessagingHealthController } from './messaging-health.controller';

@Module({
  imports: [
    ConfigModule,
    TerminusModule,
    MessagingHealthModule,
    CoreModule, // Import to reuse CORE_SERVICE client
    BiDashboardModule, // Import to reuse BI_DASHBOARD_SERVICE client
  ],
  controllers: [HealthController, MessagingHealthController],
})
export class HealthModule {}
