import { Module } from '@nestjs/common';
import { ConfigModule } from '@smart-retail-x/config';

import { CartModule } from '../cart/cart.module';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';

@Module({
  imports: [ConfigModule, CartModule],
  controllers: [OrderController],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrderModule {}
