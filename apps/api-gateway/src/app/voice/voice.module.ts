import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@smart-retail-x/config';

import { CoreModule } from '../core/app.module';
import { VoiceAgentTransportService } from './voice-agent-transport.service';
import { VoiceCapabilityDispatcherService } from './voice-capability-dispatcher.service';
import { VOICE_CAPABILITIES } from './voice-capability.interface';
import { VoiceController } from './voice.controller';
import { VoiceChatRepository } from './voice-chat.repository';
import { VoiceOfferService } from './voice-offer.service';
import { VoiceRecommendationService } from './voice-recommendation.service';
import { VoiceOrderService } from './voice-order.service';
import { VoiceProductService } from './voice-product.service';
import { VoiceService } from './voice.service';
import { VoiceTranscriptRefinerService } from './voice-transcript-refiner.service';

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
  providers: [
    VoiceService,
    VoiceChatRepository,
    VoiceAgentTransportService,
    VoiceProductService,
    VoiceOrderService,
    VoiceRecommendationService,
    VoiceOfferService,
    VoiceTranscriptRefinerService,
    VoiceCapabilityDispatcherService,
    {
      provide: VOICE_CAPABILITIES,
      inject: [VoiceRecommendationService, VoiceOrderService, VoiceOfferService, VoiceProductService],
      useFactory: (
        recommendation: VoiceRecommendationService,
        order: VoiceOrderService,
        offer: VoiceOfferService,
        product: VoiceProductService,
      ) => [recommendation, order, offer, product],
    },
  ],
})
export class VoiceModule {}
