import { Body, Controller, Get, Inject, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { FileInterceptor } from '@nestjs/platform-express';
import { catchError, defaultIfEmpty, firstValueFrom, timeout } from 'rxjs';

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
        this.assistantClient.send({ cmd: 'health' }, {}).pipe(
          timeout(5000), // 5 second timeout for health checks
          defaultIfEmpty({ status: 'unavailable', message: 'No response from service' }),
          catchError((error) => {
            throw error;
          }),
        ),
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
    try {
      return await firstValueFrom(
        this.assistantClient.send({ cmd: 'text_query' }, body).pipe(
          timeout(30000), // 30 second timeout
          defaultIfEmpty({ success: false, error: 'No response from assistant service' }),
          catchError((error) => {
            throw error;
          }),
        ),
      );
    } catch (error) {
      return {
        success: false,
        error: 'Assistant service unavailable',
        message: error.message || 'Failed to process text query',
      };
    }
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
        this.assistantClient
          .send({ cmd: 'speech_to_text' }, { audioBase64, language: language || 'si' })
          .pipe(
            timeout(60000), // 60 second timeout for speech processing
            defaultIfEmpty({ text: '', error: 'No response from assistant service' }),
            catchError((error) => {
              throw error;
            }),
          ),
      );

      console.log('Speech-to-text result:', result);

      // Check if result indicates an error from the service
      if (!result || result.success === false || result.error) {
        console.error('Assistant service returned an error:', result?.error || 'No result');
        return {
          success: false,
          error: result?.error || 'Failed to transcribe audio',
          message: 'Speech-to-text service encountered an error',
          text: '',
          details: result,
        };
      }

      // Validate transcription text exists
      if (!result.text || result.text.trim().length === 0) {
        return {
          success: false,
          error: 'No speech detected in audio',
          message: 'The audio file did not contain any detectable speech',
          text: '',
          ...result,
        };
      }

      return {
        success: true,
        ...result,
      };
    } catch (error) {
      console.error('Speech-to-text error:', error);
      return {
        success: false,
        error: 'Failed to process audio',
        message: error.message || 'An unexpected error occurred',
        details: {
          type: error.name,
          message: error.message,
          // Don't send stack trace to client in production
          ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
        },
      };
    }
  }
}
