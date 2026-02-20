import { Module } from '@nestjs/common';
import { ConfigModule } from '@smart-retail-x/config';
import { RabbitMQModule } from '@smart-retail-x/messaging';

import { ProductsController } from './products.controller';

@Module({
  imports: [
    ConfigModule,
    RabbitMQModule.register({
      name: 'CORE_SERVICE',
      queueGetter: (config) => config.coreServiceQueue,
    }),
  ],
  controllers: [ProductsController],
})
export class ProductsModule {}
