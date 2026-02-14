import { Module } from '@nestjs/common';
import { ConfigModule } from '@smart-retail-x/config';

import { AlertsModule } from '../alerts/alerts.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { ForecastsModule } from '../forecasts/forecasts.module';
import { InventoryModule } from '../inventory/inventory.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ProductsModule } from '../products/products.module';
import { PromotionsModule } from '../promotions/promotions.module';
import { RmqModule } from '../rmq/rmq.module';
import { SalesModule } from '../sales/sales.module';
import { StoresModule } from '../stores/stores.module';
import { XaiModule } from '../xai/xai.module';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    ProductsModule,
    SalesModule,
    PromotionsModule,
    AlertsModule,
    ForecastsModule,
    InventoryModule,
    AnalyticsModule,
    XaiModule,
    StoresModule,
    RmqModule, // RabbitMQ message handlers for API Gateway communication
  ],
})
export class AppModule {}
