import { Inject, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ConfigService } from '@smart-retail-x/config';
import {
  VOICE_CHAT_PATTERN,
  type VoiceAssistantIntent,
  type VoiceChatDto,
  type VoiceChatResponseDto,
  type VoiceChatTcpPayload,
  type VoiceUserContext,
} from '@smart-retail-x/shared-types';
import { catchError, defaultIfEmpty, firstValueFrom, timeout } from 'rxjs';

@Injectable()
export class VoiceService {
  private readonly logger = new Logger(VoiceService.name);

  constructor(
    @Inject('AGENT_SERVICE') private readonly agentClient: ClientProxy,
    private readonly configService: ConfigService,
  ) {}

  async chatWithAudio(
    audioFile: { buffer: Buffer; mimetype?: string },
    dto: Partial<VoiceChatDto>,
    userContext?: VoiceUserContext,
    intents?: VoiceAssistantIntent[],
  ): Promise<VoiceChatResponseDto> {
    const language = dto.language ?? 'si-LK';
    const sessionId = dto.sessionId ?? `voice-${Date.now()}`;

    const payload: VoiceChatTcpPayload = {
      audioBase64: audioFile.buffer.toString('base64'),
      mimeType: audioFile.mimetype ?? 'audio/webm',
      language,
      sessionId,
      userId: dto.userId,
      userContext,
      intents,
      transcriptText: dto.transcriptText,
    };
    const transportMode = (this.configService.get<string>('AGENT_VOICE_TRANSPORT', 'http-first') ||
      'http-first') as 'http-only' | 'http-first' | 'tcp-first';

    try {
      if (transportMode === 'http-only') {
        return await this.forwardViaHttp(audioFile, payload);
      }

      if (transportMode === 'http-first') {
        try {
          return await this.forwardViaHttp(audioFile, payload);
        } catch (httpError) {
          this.logger.warn(
            `HTTP agent request failed (${httpError?.message ?? httpError}). Trying TCP fallback...`,
          );
          return await this.forwardViaTcp(payload, language, sessionId);
        }
      }

      try {
        return await this.forwardViaTcp(payload, language, sessionId);
      } catch (tcpError) {
        this.logger.warn(
          `TCP agent request failed (${tcpError?.message ?? tcpError}). Trying HTTP fallback...`,
        );
        return await this.forwardViaHttp(audioFile, payload);
      }
    } catch (error) {
      this.logger.error(`Voice chat failed: ${error?.message ?? error}`, error?.stack);
      throw new ServiceUnavailableException({
        success: false,
        transcription: '',
        response: '',
        language,
        sessionId,
        messages: [],
        error: 'Agent service unavailable',
      } satisfies VoiceChatResponseDto);
    }
  }

  private async forwardViaTcp(
    payload: VoiceChatTcpPayload,
    language: VoiceChatTcpPayload['language'],
    sessionId: string,
  ): Promise<VoiceChatResponseDto> {
    const tcpTimeoutMs = Number(this.configService.get<string | number>('AGENT_TCP_TIMEOUT_MS', 10_000));
    return await firstValueFrom(
      this.agentClient.send(VOICE_CHAT_PATTERN, payload).pipe(
        timeout(tcpTimeoutMs),
        defaultIfEmpty({
          success: false,
          transcription: '',
          response: '',
          language,
          sessionId,
          messages: [],
          error: 'No response from agent service',
        } satisfies VoiceChatResponseDto),
        catchError((error) => {
          throw error;
        }),
      ),
    );
  }

  private async forwardViaHttp(
    audioFile: { buffer: Buffer; mimetype?: string },
    payload: VoiceChatTcpPayload,
  ): Promise<VoiceChatResponseDto> {
    const endpoint = this.configService.get<string>(
      'AGENT_HTTP_VOICE_URL',
      'http://127.0.0.1:8010/api/v1/voice/chat',
    );

    const formData = new FormData();
    const mimeType = audioFile.mimetype || payload.mimeType || 'audio/webm';
    const arrayBuffer = new ArrayBuffer(audioFile.buffer.byteLength);
    new Uint8Array(arrayBuffer).set(audioFile.buffer);
    const blob = new Blob([arrayBuffer], { type: mimeType });

    formData.append('audio', blob, `voice-${Date.now()}.webm`);
    formData.append('language', payload.language);
    formData.append('sessionId', payload.sessionId);
    if (payload.userId) formData.append('userId', payload.userId);
    if (payload.userContext?.role) formData.append('userRole', payload.userContext.role);
    if (payload.intents?.length) formData.append('intents', payload.intents.join(','));
    if (payload.transcriptText?.trim()) formData.append('transcriptText', payload.transcriptText.trim());

    const httpTimeoutMs = Number(
      this.configService.get<string | number>('AGENT_HTTP_TIMEOUT_MS', 180_000),
    );
    const abortController = new AbortController();
    const timeoutHandle = setTimeout(() => abortController.abort(), httpTimeoutMs);
    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
        signal: abortController.signal,
      });
    } finally {
      clearTimeout(timeoutHandle);
    }

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`HTTP fallback failed (${response.status}): ${body}`);
    }

    return (await response.json()) as VoiceChatResponseDto;
  }
}
