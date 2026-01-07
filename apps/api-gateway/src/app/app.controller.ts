import { Body, Controller, Get, Inject, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { FileInterceptor } from '@nestjs/platform-express';
import { firstValueFrom } from 'rxjs';

import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    @Inject('ASSISTANT_SERVICE') private assistantClient: ClientProxy,
  ) {}

  // Health check endpoint
  @Get('health')
  async getHealth() {
    // Check API Gateway health
    const gatewayHealth = this.appService.getHealth();

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
  @Post('assistant/text-query')
  async textQuery(@Body() body: { query: string; language?: string }) {
    return firstValueFrom(this.assistantClient.send({ cmd: 'text_query' }, body));
  }

  @Post('assistant/speech-to-text')
  @UseInterceptors(FileInterceptor('audio'))
  async speechToText(
    @UploadedFile() file: { buffer: Buffer; originalname: string; mimetype: string } | undefined,
    @Body('language') language?: string,
  ) {
    if (!file) {
      return { error: 'No audio file provided' };
    }

    try {
      console.log('Received audio file:', {
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.buffer.length,
        language: language || 'si',
      });

      // Convert Buffer to base64 for RabbitMQ transmission
      const audioBase64 = file.buffer.toString('base64');
      console.log('Converted to base64, length:', audioBase64.length);

      const result = await firstValueFrom(
        this.assistantClient.send(
          { cmd: 'speech_to_text' },
          { audioBase64, language: language || 'si' },
        ),
      );

      console.log('Speech-to-text result:', result);
      return result;
    } catch (error) {
      console.error('Speech-to-text error:', error);
      return {
        error: 'Failed to process audio',
        details: error.message,
        stack: error.stack,
      };
    }
  }
}
