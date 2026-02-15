import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { catchError, defaultIfEmpty, firstValueFrom, timeout } from 'rxjs';

@Injectable()
export class AssistantService {
  private readonly logger = new Logger(AssistantService.name);

  constructor(@Inject('CORE_SERVICE') private coreClient: ClientProxy) {}

  /**
   * Process text query through core service
   */
  async processTextQuery(query: string, language?: string) {
    try {
      return await firstValueFrom(
        this.coreClient.send({ cmd: 'text_query' }, { query, language }).pipe(
          timeout(30000), // 30 second timeout
          defaultIfEmpty({ success: false, error: 'No response from core service' }),
          catchError((error) => {
            throw error;
          }),
        ),
      );
    } catch (error) {
      this.logger.error(`Text query failed: ${error.message}`, error.stack);
      return {
        success: false,
        error: 'Core service unavailable',
        message: error.message || 'Failed to process text query',
      };
    }
  }

  /**
   * Process speech-to-text through core service
   */
  async processSpeechToText(audioBuffer: Buffer, language?: string) {
    try {
      this.logger.log('Processing speech-to-text request', {
        bufferSize: audioBuffer.length,
        language: language || 'si',
      });

      // Convert Buffer to base64 for RabbitMQ transmission
      const audioBase64 = audioBuffer.toString('base64');

      const result = await firstValueFrom(
        this.coreClient
          .send({ cmd: 'speech_to_text' }, { audioBase64, language: language || 'si' })
          .pipe(
            timeout(60000), // 60 second timeout for speech processing
            defaultIfEmpty({ text: '', error: 'No response from core service' }),
            catchError((error) => {
              throw error;
            }),
          ),
      );

      this.logger.log('Speech-to-text result received', {
        success: result.success,
        hasText: !!result.text,
      });

      // Check if result indicates an error from the service
      if (!result || result.success === false || result.error) {
        this.logger.error('Core service returned an error', result?.error || 'No result');
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
      this.logger.error(`Speech-to-text failed: ${error.message}`, error.stack);
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
