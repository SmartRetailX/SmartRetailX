import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@smart-retail-x/config';
import { AssemblyAI } from 'assemblyai';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);
  private readonly assemblyAI: AssemblyAI;
  private readonly apiKey: string;

  constructor(private configService: ConfigService) {
    // Initialize AssemblyAI client with extended timeout
    this.apiKey = this.configService.get<string>('ASSEMBLYAI_API_KEY', '');
    if (!this.apiKey) {
      this.logger.warn('ASSEMBLYAI_API_KEY not found. Speech-to-text will not work.');
    }
    this.assemblyAI = new AssemblyAI({
      apiKey: this.apiKey,
    });
  }

  /**
   * Process text-based query directly
   */
  async processTextQuery(query: string, language = 'en') {
    this.logger.log(`Processing text query: "${query}" in language: ${language}`);

    return {
      success: true,
      query,
      language,
      response: `Processed query: "${query}" in ${language}`,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Convert speech to text using AssemblyAI
   * Supports mixed Sinhala/English (code-switching)
   */
  async speechToText(audioBuffer: Buffer, language = 'si') {
    this.logger.log(`Processing speech-to-text in ${language}`);
    this.logger.log(`Audio buffer size: ${audioBuffer?.length || 0} bytes`);

    try {
      // Check if API key is configured
      if (!this.apiKey) {
        return {
          success: false,
          error: 'ASSEMBLYAI_API_KEY is not configured',
          text: '',
        };
      }

      // Validate audio buffer
      if (!audioBuffer || audioBuffer.length === 0) {
        return {
          success: false,
          error: 'Audio buffer is empty or invalid',
          text: '',
        };
      }

      // Check minimum audio size (at least 1KB)
      if (audioBuffer.length < 1000) {
        this.logger.warn(`Audio buffer too small: ${audioBuffer.length} bytes`);
        return {
          success: false,
          error: 'Audio file too short or corrupted',
          text: '',
        };
      }

      this.logger.log(`Valid audio buffer received: ${audioBuffer.length} bytes`);

      // Retry logic for network issues
      let lastError: Error | null = null;
      const maxRetries = 2;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          if (attempt > 1) {
            this.logger.log(`Retry attempt ${attempt}/${maxRetries}`);
            // Wait before retry (exponential backoff)
            await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
          }

          // AssemblyAI accepts Buffer directly (no need to convert to Uint8Array)
          const params = {
            audio: audioBuffer, // Pass Buffer directly
            language_detection: true, // Auto-detect language including code-switching
            speech_model: 'best' as const, // Use best quality model
          };

          this.logger.log(`Sending audio to AssemblyAI (attempt ${attempt})...`);
          const transcript = await this.assemblyAI.transcripts.transcribe(params);

          if (transcript.status === 'error') {
            throw new Error(`Transcription failed: ${transcript.error}`);
          }

          this.logger.log(`Transcription successful: "${transcript.text}"`);
          this.logger.log(`Detected language: ${transcript.language_code}`);

          // Check if transcription is empty
          if (!transcript.text || transcript.text.trim().length === 0) {
            this.logger.warn('Transcription returned empty text');
            return {
              success: false,
              error: 'No speech detected in audio',
              text: '',
              language: transcript.language_code || language,
              confidence: transcript.confidence || 0,
              duration: transcript.audio_duration || 0,
            };
          }

          return {
            success: true,
            text: transcript.text,
            language: transcript.language_code || language,
            confidence: transcript.confidence || 0,
            duration: transcript.audio_duration || 0,
            detectedLanguage: transcript.language_code,
            words: transcript.words?.map((w) => ({
              text: w.text,
              confidence: w.confidence,
              start: w.start,
              end: w.end,
            })),
            debug: {
              status: transcript.status,
              id: transcript.id,
              attempt,
            },
          };
        } catch (error) {
          lastError = error;
          this.logger.error(`Attempt ${attempt} failed: ${error.message}`);

          // If it's the last attempt, don't retry
          if (attempt === maxRetries) {
            break;
          }

          // Don't retry on certain errors
          if (
            error.message?.includes('API key') ||
            error.message?.includes('authentication') ||
            error.message?.includes('invalid')
          ) {
            break;
          }
        }
      }

      // All retries failed
      this.logger.error(
        `Speech-to-text failed after ${maxRetries} attempts: ${lastError?.message}`,
        lastError?.stack,
      );
      return {
        success: false,
        error: lastError?.message || 'Speech-to-text service unavailable',
        text: '',
        details: {
          type: lastError?.name,
          cause: (lastError as any)?.cause?.toString(),
        },
      };
    } catch (error) {
      this.logger.error(`Speech-to-text error: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.message || 'Unknown error occurred',
        text: '',
      };
    }
  }
}
