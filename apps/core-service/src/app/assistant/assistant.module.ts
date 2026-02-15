import { Module } from '@nestjs/common';
import { ConfigModule } from '@smart-retail-x/config';

import { AssistantController } from './assistant.controller';
import { AssistantService } from './assistant.service';

@Module({
  imports: [ConfigModule],
  controllers: [AssistantController],
  providers: [AssistantService],
})
export class AssistantModule {}
