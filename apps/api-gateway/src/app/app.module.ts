import { Module } from '@nestjs/common';
import { ConfigModule } from '@smart-retail-x/config';

import { AuthModule } from '../auth/auth.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BiDashboardModule } from './bi-dashboard/bi-dashboard.module';
import { CoreModule } from './core/app.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [ConfigModule, HealthModule, AuthModule, CoreModule, BiDashboardModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
