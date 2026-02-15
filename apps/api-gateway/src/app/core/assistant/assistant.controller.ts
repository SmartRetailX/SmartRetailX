import { Body, Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { AssistantService } from './assistant.service';

@Controller('assistant')
export class AssistantController {
  constructor(private readonly assistantService: AssistantService) {}

  /**
   * Process text-based assistant query
   * @param body - Query text and optional language
   */
  @Post('text-query')
  async textQuery(@Body() body: { query: string; language?: string }) {
    return this.assistantService.processTextQuery(body.query, body.language);
  }

  /**
   * Convert speech to text
   * @param file - Audio file buffer
   * @param language - Optional language code (default: 'si')
   */
  @Post('speech-to-text')
  @UseInterceptors(FileInterceptor('audio'))
  async speechToText(
    @UploadedFile() file: { buffer: Buffer; originalname: string; mimetype: string } | undefined,
    @Body('language') language?: string,
  ) {
    if (!file) {
      return {
        success: false,
        error: 'No audio file provided',
        message: 'Please provide an audio file in the request',
      };
    }

    return this.assistantService.processSpeechToText(file.buffer, language);
  }
}
