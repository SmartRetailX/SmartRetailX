import { Module } from '@nestjs/common';
import { ConfigModule } from '@smart-retail-x/config';

import { AuthModule } from '../auth/auth.module';
import { DocsModule } from '../docs/docs.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BiDashboardModule } from './bi-dashboard/bi-dashboard.module';
import { CoreModule } from './core/app.module';
import { HealthModule } from './health/health.module';
import { PromotionEngineModule } from './promotion-engine/promotion-engine.module';
import { VoiceModule } from './voice/voice.module';

@Module({
  imports: [
    ConfigModule,
    HealthModule,
    AuthModule,
    CoreModule,
    BiDashboardModule,
    DocsModule,
    VoiceModule,
    PromotionEngineModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
