import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ConfigService } from '@smart-retail-x/config';
import {
  VOICE_CHAT_PATTERN,
  type VoiceChatResponseDto,
  type VoiceChatTcpPayload,
} from '@smart-retail-x/shared-types';
import { catchError, defaultIfEmpty, firstValueFrom, timeout } from 'rxjs';

@Injectable()
export class VoiceAgentTransportService {
  private readonly logger = new Logger(VoiceAgentTransportService.name);

  constructor(
    @Inject('AGENT_SERVICE') private readonly agentClient: ClientProxy,
    private readonly configService: ConfigService,
  ) {}

  async request(
    audioFile: { buffer: Buffer; mimetype?: string } | undefined,
    payload: VoiceChatTcpPayload,
  ): Promise<VoiceChatResponseDto> {
    const transportMode = (this.configService.get<string>('AGENT_VOICE_TRANSPORT', 'http-first') ||
      'http-first') as 'http-only' | 'http-first' | 'tcp-first';
    this.logger.log(
      `Voice transport request: mode=${transportMode} session=${payload.sessionId} audioBytes=${audioFile?.buffer?.length ?? 0} transcriptChars=${payload.transcriptText?.length ?? 0}`,
    );

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
        return await this.forwardViaTcp(payload);
      }
    }

    try {
      return await this.forwardViaTcp(payload);
    } catch (tcpError) {
      this.logger.warn(
        `TCP agent request failed (${tcpError?.message ?? tcpError}). Trying HTTP fallback...`,
      );
      return await this.forwardViaHttp(audioFile, payload);
    }
  }

  private async forwardViaTcp(payload: VoiceChatTcpPayload): Promise<VoiceChatResponseDto> {
    const tcpTimeoutMs = Number(this.configService.get<string | number>('AGENT_TCP_TIMEOUT_MS', 10_000));
    this.logger.log(`Voice transport via TCP: session=${payload.sessionId} timeoutMs=${tcpTimeoutMs}`);

    return await firstValueFrom(
      this.agentClient.send(VOICE_CHAT_PATTERN, payload).pipe(
        timeout(tcpTimeoutMs),
        defaultIfEmpty({
          success: false,
          transcription: '',
          response: '',
          language: payload.language,
          sessionId: payload.sessionId,
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
    audioFile: { buffer: Buffer; mimetype?: string } | undefined,
    payload: VoiceChatTcpPayload,
  ): Promise<VoiceChatResponseDto> {
    const primaryEndpoint = this.configService.get<string>(
      'AGENT_HTTP_VOICE_URL',
      'http://127.0.0.1:8010/api/v1/voice/chat',
    );
    const endpoints = this.buildHttpEndpoints(primaryEndpoint);

    const formData = new FormData();
    if (audioFile?.buffer?.length) {
      const mimeType = audioFile.mimetype || payload.mimeType || 'audio/webm';
      const arrayBuffer = new ArrayBuffer(audioFile.buffer.byteLength);
      new Uint8Array(arrayBuffer).set(audioFile.buffer);
      const blob = new Blob([arrayBuffer], { type: mimeType });
      formData.append('audio', blob, `voice-${Date.now()}.webm`);
    }

    formData.append('language', payload.language);
    formData.append('sessionId', payload.sessionId);
    if (payload.userId) formData.append('userId', payload.userId);
    if (payload.userContext?.role) formData.append('userRole', payload.userContext.role);
    if (payload.intents?.length) formData.append('intents', payload.intents.join(','));
    if (payload.transcriptText?.trim()) formData.append('transcriptText', payload.transcriptText.trim());

    const httpTimeoutMs = Number(this.configService.get<string | number>('AGENT_HTTP_TIMEOUT_MS', 180_000));
    const abortController = new AbortController();
    const timeoutHandle = setTimeout(() => abortController.abort(), httpTimeoutMs);

    let lastError: unknown;
    for (const endpoint of endpoints) {
      this.logger.log(
        `Voice transport via HTTP: endpoint=${endpoint} session=${payload.sessionId} audioBytes=${audioFile?.buffer?.length ?? 0}`,
      );
      let response: Response;
      try {
        response = await fetch(endpoint, {
          method: 'POST',
          body: formData,
          signal: abortController.signal,
        });
      } catch (error) {
        lastError = error;
        continue;
      }

      if (!response.ok) {
        const body = await response.text();
        this.logger.warn(`Voice HTTP endpoint failed: endpoint=${endpoint} status=${response.status}`);
        lastError = new Error(`HTTP fallback failed (${response.status}) via ${endpoint}: ${body}`);
        continue;
      }

      this.logger.log(`Voice HTTP endpoint succeeded: endpoint=${endpoint} status=${response.status}`);
      clearTimeout(timeoutHandle);
      return (await response.json()) as VoiceChatResponseDto;
    }

    clearTimeout(timeoutHandle);
    throw lastError instanceof Error
      ? lastError
      : new Error('HTTP fallback failed: no reachable agent endpoint');
  }

  private buildHttpEndpoints(primaryEndpoint: string): string[] {
    const endpoints = [primaryEndpoint];

    if (primaryEndpoint.includes('127.0.0.1') || primaryEndpoint.includes('localhost')) {
      endpoints.push(primaryEndpoint.replace('127.0.0.1', 'agent-service').replace('localhost', 'agent-service'));
    } else if (primaryEndpoint.includes('agent-service')) {
      endpoints.push(primaryEndpoint.replace('agent-service', '127.0.0.1'));
    }

    return Array.from(new Set(endpoints));
  }
}
