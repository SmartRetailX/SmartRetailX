import { Module } from '@nestjs/common';
import { ConfigModule } from '@smart-retail-x/config';

import { AuthModule } from '../auth/auth.module';
import { DocsModule } from '../docs/docs.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BiDashboardModule } from './bi-dashboard/bi-dashboard.module';
import { CartModule } from './cart/cart.module';
import { CoreModule } from './core/app.module';
import { HealthModule } from './health/health.module';
import { OrdersModule } from './orders/orders.module';
import { ProductsModule } from './products/products.module';

@Module({
  imports: [
    ConfigModule,
    HealthModule,
    AuthModule,
    CoreModule,
    BiDashboardModule,
    DocsModule,
    ProductsModule,
    CartModule,
    OrdersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
