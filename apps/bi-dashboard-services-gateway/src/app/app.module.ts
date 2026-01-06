import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ProductsModule } from '../products/products.module';
import { SalesModule } from '../sales/sales.module';
import { PromotionsModule } from '../promotions/promotions.module';
import { AlertsModule } from '../alerts/alerts.module';
import { ForecastsModule } from '../forecasts/forecasts.module';
import { InventoryModule } from '../inventory/inventory.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { XaiModule } from '../xai/xai.module';
import { StoresModule } from '../stores/stores.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
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
  ],
})
export class AppModule {}
