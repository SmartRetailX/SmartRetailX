import { Body, Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { AssistantService } from './assistant.service';

@ApiTags('Assistant')
@Controller('assistant')
export class AssistantController {
  constructor(private readonly assistantService: AssistantService) {}

  /**
   * Process text-based assistant query
   * @param body - Query text and optional language
   */
  @Post('text-query')
  @ApiOperation({
    summary: 'Process text query',
    description: 'Process a text-based assistant query in Sinhala or English',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['query'],
      properties: {
        query: { type: 'string', example: 'මගේ අවසන් මිලදී ගැනීම කුමක්ද?' },
        language: { type: 'string', example: 'si', default: 'si' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Query processed successfully' })
  async textQuery(@Body() body: { query: string; language?: string }) {
    return this.assistantService.processTextQuery(body.query, body.language);
  }

  /**
   * Convert speech to text
   * @param file - Audio file buffer
   * @param language - Optional language code (default: 'si')
   */
  @Post('speech-to-text')
  @ApiOperation({
    summary: 'Convert speech to text',
    description: 'Convert audio file to text using AssemblyAI (supports Sinhala)',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['audio'],
      properties: {
        audio: { type: 'string', format: 'binary', description: 'Audio file (WAV, MP3, etc.)' },
        language: { type: 'string', example: 'si', default: 'si' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Speech converted to text successfully' })
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
