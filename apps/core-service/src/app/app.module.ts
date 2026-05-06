import { Module } from '@nestjs/common';
import { ConfigModule } from '@smart-retail-x/config';
import { PrismaModule } from '@smart-retail-x/database';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AssistantModule } from './assistant/assistant.module';
import { CartModule } from './cart/cart.module';
import { CatalogModule } from './catalog/catalog.module';
import { OrderModule } from './order/order.module';

@Module({
  imports: [ConfigModule, PrismaModule, AssistantModule, CatalogModule, CartModule, OrderModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
