import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AlertsModule } from '../alerts/alerts.module';
import { ForecastsModule } from '../forecasts/forecasts.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ProductsModule } from '../products/products.module';
import { PromotionsModule } from '../promotions/promotions.module';
import { SalesModule } from '../sales/sales.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    ProductsModule,
    SalesModule,
    PromotionsModule,
    AlertsModule,
    ForecastsModule,
  ],
})
export class AppModule {}
