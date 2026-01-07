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
  @MessagePattern({ cmd: 'text_query' })
  async handleTextQuery(data: { query: string; language?: string }) {
    return this.appService.processTextQuery(data.query, data.language);
  }

  /**
   * Process speech-to-text
   */
  @MessagePattern({ cmd: 'speech_to_text' })
  async speechToText(data: { audioBase64: string; language?: string }) {
    // Convert base64 back to Buffer
    const audioBuffer = Buffer.from(data.audioBase64, 'base64');
    return this.appService.speechToText(audioBuffer, data.language);
  }
}
