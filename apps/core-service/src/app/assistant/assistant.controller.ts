import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';

import { AssistantService } from './assistant.service';

@Controller('assistant')
export class AssistantController {
  constructor(private readonly assistantService: AssistantService) {}

  /**
   * Voice assistant text query
   */
  @MessagePattern({ cmd: 'text_query' })
  async handleTextQuery(data: { query: string; language?: string }) {
    return this.assistantService.processTextQuery(data.query, data.language);
  }

  /**
   * Process speech-to-text
   */
  @MessagePattern({ cmd: 'speech_to_text' })
  async speechToText(data: { audioBase64: string; language?: string }) {
    // Convert base64 back to Buffer
    const audioBuffer = Buffer.from(data.audioBase64, 'base64');
    return this.assistantService.speechToText(audioBuffer, data.language);
  }
}
