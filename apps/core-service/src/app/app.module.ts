import { Module } from '@nestjs/common';
import { ConfigModule } from '@smart-retail-x/config';
import { DatabaseModule } from '@smart-retail-x/database';

import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [ConfigModule, DatabaseModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
