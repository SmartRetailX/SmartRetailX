import { Module } from '@nestjs/common';
import { ConfigModule } from '@smart-retail-x/config';
import { DatabaseModule } from '@smart-retail-x/database';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AssistantModule } from './assistant/assistant.module';
import { CatalogModule } from './catalog/catalog.module';

@Module({
  imports: [ConfigModule, DatabaseModule, AssistantModule, CatalogModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
