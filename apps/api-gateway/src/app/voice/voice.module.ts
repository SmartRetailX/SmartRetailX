import { Module } from '@nestjs/common';
import { ConfigModule } from '@smart-retail-x/config';

import { CoreModule } from '../core/app.module';
import { VoiceChatRepository } from './voice-chat.repository';
import { VoiceController } from './voice.controller';
import { VoiceService } from './voice.service';

@Module({
  imports: [ConfigModule, CoreModule],
  controllers: [VoiceController],
  providers: [VoiceService, VoiceChatRepository],
})
export class VoiceModule {}
