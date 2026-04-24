import { Module } from '@nestjs/common';
import { ConfigModule } from '@smart-retail-x/config';
import { RabbitMQModule } from '@smart-retail-x/messaging';

import { AuthModule } from '../../auth/auth.module';
import { CoreController } from './app.controller';
import { CoreService } from './app.service';
import { AssistantController } from './assistant/assistant.controller';
import { AssistantService } from './assistant/assistant.service';

@Module({
  imports: [
    ConfigModule,
    AuthModule,
    RabbitMQModule.register({
      name: 'CORE_SERVICE',
      queueGetter: (config) => config.coreServiceQueue,
    }),
    RabbitMQModule.register({
      name: 'WEBSOCKET_SERVICE',
      queueGetter: (config) => config.websocketServiceQueue,
    }),
  ],
  controllers: [CoreController, AssistantController],
  providers: [CoreService, AssistantService],
  exports: [
    CoreService,
    RabbitMQModule, // Export RabbitMQ client for other modules to use
  ],
})
export class CoreModule {}
