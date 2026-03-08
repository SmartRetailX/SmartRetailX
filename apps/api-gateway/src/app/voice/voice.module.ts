import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@smart-retail-x/config';

import { CoreModule } from '../core/app.module';
import { VoiceController } from './voice.controller';
import { VoiceChatRepository } from './voice-chat.repository';
import { VoiceService } from './voice.service';

@Module({
  imports: [
    ConfigModule,
    CoreModule,
    ClientsModule.registerAsync([
      {
        name: 'AGENT_SERVICE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: config.get<string>('AGENT_TCP_HOST', '127.0.0.1'),
            port: Number(config.get<string | number>('AGENT_TCP_PORT', 8877)),
          },
        }),
      },
    ]),
  ],
  controllers: [VoiceController],
  providers: [VoiceService, VoiceChatRepository],
})
export class VoiceModule {}
