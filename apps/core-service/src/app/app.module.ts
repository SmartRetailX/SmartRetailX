import { Module } from '@nestjs/common';
import { ConfigModule } from '@smart-retail-x/config';
import { DatabaseModule } from '@smart-retail-x/database';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AssistantModule } from './assistant/assistant.module';
import { CartModule } from './cart/cart.module';
import { OrderModule } from './order/order.module';
import { ProductModule } from './product/product.module';

@Module({
  imports: [ConfigModule, DatabaseModule, AssistantModule, ProductModule, CartModule, OrderModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
