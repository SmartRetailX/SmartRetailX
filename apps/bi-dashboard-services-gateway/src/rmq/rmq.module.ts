import { Module } from '@nestjs/common';

import { AlertsModule } from '../alerts/alerts.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { ForecastsModule } from '../forecasts/forecasts.module';
import { InventoryModule } from '../inventory/inventory.module';
import { ProductsModule } from '../products/products.module';
import { PromotionsModule } from '../promotions/promotions.module';
import { SalesModule } from '../sales/sales.module';
import { StoresModule } from '../stores/stores.module';
import { VoiceModule } from '../voice/voice.module';
import { XaiModule } from '../xai/xai.module';
import { RmqController } from './rmq.controller';

/**
 * RabbitMQ Module
 *
 * Handles incoming RabbitMQ messages from the API Gateway and routes
 * them to the appropriate service methods.
 */
@Module({
  imports: [
    ProductsModule,
    SalesModule,
    AlertsModule,
    PromotionsModule,
    InventoryModule,
    StoresModule,
    AnalyticsModule,
    ForecastsModule,
    XaiModule,
    VoiceModule,
  ],
  controllers: [RmqController],
})
export class RmqModule {}
