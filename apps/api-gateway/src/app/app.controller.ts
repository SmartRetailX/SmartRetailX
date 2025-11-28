import { Body, Controller, Get, Inject, Post } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    @Inject('ASSISTANT_SERVICE') private assistantClient: ClientProxy,
  ) {}

  @Get()
  getData() {
    return this.appService.getData();
  }

  @Get('health')
  async getHealth() {
    // Check API Gateway health
    const gatewayHealth = {
      status: 'healthy',
      service: 'api-gateway',
      timestamp: new Date().toISOString(),
    };

    // Check Assistant Service health
    try {
      const assistantHealth = await firstValueFrom(
        this.assistantClient.send({ cmd: 'health' }, {}),
      );
      return {
        gateway: gatewayHealth,
        services: {
          assistant: assistantHealth,
        },
      };
    } catch (error) {
      return {
        gateway: gatewayHealth,
        services: {
          assistant: { status: 'unhealthy', error: error.message },
        },
      };
    }
  }

  // Voice Assistant Endpoints
  @Post('assistant/query')
  async voiceQuery(@Body() body: { query: string; language?: string }) {
    return firstValueFrom(this.assistantClient.send({ cmd: 'voice_query' }, body));
  }

  @Get('assistant/capabilities')
  async getCapabilities() {
    return firstValueFrom(this.assistantClient.send({ cmd: 'get_capabilities' }, {}));
  }

  @Post('assistant/speech-to-text')
  async speechToText(@Body() body: { audio: string; language?: string }) {
    return firstValueFrom(this.assistantClient.send({ cmd: 'speech_to_text' }, body));
  }

  @Post('assistant/text-to-speech')
  async textToSpeech(@Body() body: { text: string; language?: string }) {
    return firstValueFrom(this.assistantClient.send({ cmd: 'text_to_speech' }, body));
  }

  @Get('assistant/health')
  async getAssistantHealth() {
    return firstValueFrom(this.assistantClient.send({ cmd: 'health' }, {}));
  }
}
