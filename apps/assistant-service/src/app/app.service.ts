import { Injectable, Logger } from '@nestjs/common';
import { AssemblyAI } from 'assemblyai';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);
  private readonly assemblyAI: AssemblyAI;

  constructor() {
    // Initialize AssemblyAI client
    const apiKey = process.env.ASSEMBLYAI_API_KEY;
    if (!apiKey) {
      this.logger.warn('ASSEMBLYAI_API_KEY not found. Speech-to-text will not work.');
    }
    this.assemblyAI = new AssemblyAI({ apiKey: apiKey });
  }

  /**
   * Process text-based query directly
   */
  async processTextQuery(query: string, language = 'en') {
    this.logger.log(`Processing text query: "${query}" in language: ${language}`);
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
      if (!process.env.ASSEMBLYAI_API_KEY) {
        throw new Error('ASSEMBLYAI_API_KEY is not configured');
      }

      // Validate audio buffer
      if (!audioBuffer || audioBuffer.length === 0) {
        throw new Error('Audio buffer is empty or invalid');
      }

      this.logger.log(`Valid audio buffer received: ${audioBuffer.length} bytes`);

      // AssemblyAI accepts Buffer directly (no need to convert to Uint8Array)
      const params = {
        audio: audioBuffer, // Pass Buffer directly
        language_detection: true, // Auto-detect language including code-switching
        speech_model: 'best' as const, // Use best quality model
      };

      this.logger.log('Sending audio to AssemblyAI...');
      const transcript = await this.assemblyAI.transcripts.transcribe(params);

      if (transcript.status === 'error') {
        throw new Error(`Transcription failed: ${transcript.error}`);
      }

      this.logger.log(`Transcription successful: "${transcript.text}"`);
      this.logger.log(`Detected language: ${transcript.language_code}`);

      return {
        text: transcript.text || '',
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
        },
      };
    } catch (error) {
      this.logger.error(`Speech-to-text error: ${error.message}`, error.stack);
      throw error;
    }
  }
}
