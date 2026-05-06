import { Module } from '@nestjs/common';
import { ConfigModule } from '@smart-retail-x/config';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppWebSocketGateway } from './websocket.gateway';

@Module({
  imports: [ConfigModule],
  controllers: [AppController],
  providers: [AppService, AppWebSocketGateway],
})
export class AppModule {}
