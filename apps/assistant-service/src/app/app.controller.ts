import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';

import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /**
   * Health check endpoint
   */
  @MessagePattern({ cmd: 'health' })
  getHealth() {
    return {
      status: 'healthy',
      service: 'assistant-service',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };
  }

  /**
   * Voice assistant query
   */
  @MessagePattern({ cmd: 'voice_query' })
  async handleVoiceQuery(data: { query: string; language?: string }) {
    return this.appService.processVoiceQuery(data.query, data.language);
  }

  /**
   * Get assistant capabilities
   */
  @MessagePattern({ cmd: 'get_capabilities' })
  getCapabilities() {
    return {
      languages: ['en', 'si'], // English, Sinhala
      features: ['product_search', 'order_tracking', 'recommendations', 'customer_support'],
      model: 'SinLlama',
    };
  }

  /**
   * Process speech-to-text
   */
  @MessagePattern({ cmd: 'speech_to_text' })
  async speechToText(data: { audio: string; language?: string }) {
    return this.appService.speechToText(data.audio, data.language);
  }

  /**
   * Process text-to-speech
   */
  @MessagePattern({ cmd: 'text_to_speech' })
  async textToSpeech(data: { text: string; language?: string }) {
    return this.appService.textToSpeech(data.text, data.language);
  }
}
