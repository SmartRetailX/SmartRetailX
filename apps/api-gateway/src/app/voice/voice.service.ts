import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import {
  type VoiceAssistantIntent,
  type VoiceChatInputMode,
  type VoiceChatDto,
  type VoiceChatResponseDto,
  type VoiceChatSessionDto,
  type VoiceChatTcpPayload,
  type VoiceUserContext,
} from '@smart-retail-x/shared-types';

import { VoiceAgentTransportService } from './voice-agent-transport.service';
import { type VoiceCapabilityContext } from './voice-capability.interface';
import { VoiceCapabilityDispatcherService } from './voice-capability-dispatcher.service';
import { VoiceChatRepository } from './voice-chat.repository';

@Injectable()
export class VoiceService {
  private readonly logger = new Logger(VoiceService.name);

  constructor(
    private readonly voiceAgentTransportService: VoiceAgentTransportService,
    private readonly voiceCapabilityDispatcherService: VoiceCapabilityDispatcherService,
    private readonly voiceChatRepository: VoiceChatRepository,
  ) {}

  async chatWithAudio(
    audioFile: { buffer: Buffer; mimetype?: string } | undefined,
    dto: Partial<VoiceChatDto>,
    userId: string,
    userContext?: VoiceUserContext,
    intents?: VoiceAssistantIntent[],
  ): Promise<VoiceChatResponseDto> {
    return this.chatInternal('voice', audioFile, dto, userId, userContext, intents);
  }

  async chatWithText(
    text: string,
    dto: Partial<VoiceChatDto>,
    userId: string,
    userContext?: VoiceUserContext,
    intents?: VoiceAssistantIntent[],
  ): Promise<VoiceChatResponseDto> {
    const textPayload = {
      ...dto,
      transcriptText: text.trim(),
    };

    return this.chatInternal('text', undefined, textPayload, userId, userContext, intents);
  }

  async getSession(userId: string, limit?: number): Promise<VoiceChatSessionDto> {
    return this.voiceChatRepository.getSessionWithMessages(userId, limit);
  }

  private async chatInternal(
    channel: VoiceChatInputMode,
    audioFile: { buffer: Buffer; mimetype?: string } | undefined,
    dto: Partial<VoiceChatDto>,
    userId: string,
    userContext?: VoiceUserContext,
    intents?: VoiceAssistantIntent[],
  ): Promise<VoiceChatResponseDto> {
    const language = dto.language ?? 'si-LK';
    const session = await this.voiceChatRepository.getOrCreateSession(userId);
    const sessionId = session.agentSessionId;

    const payload: VoiceChatTcpPayload = {
      audioBase64: audioFile?.buffer?.length ? audioFile.buffer.toString('base64') : '',
      mimeType: audioFile?.mimetype ?? 'audio/webm',
      language,
      sessionId,
      userId,
      userContext,
      intents,
      transcriptText: dto.transcriptText,
    };

    try {
      const result = await this.voiceAgentTransportService.request(audioFile, payload);

      const primaryCapabilityResult = await this.voiceCapabilityDispatcherService.dispatch(
        this.buildCapabilityContext(
          result.transcription || payload.transcriptText,
          result.language || payload.language,
          result.sessionId || sessionId,
          userId,
        ),
        'primary',
      );

      if (primaryCapabilityResult) {
        return await this.persistAndReturn(primaryCapabilityResult, channel, payload, userId);
      }

      if (result.success && result.response?.trim()) {
        return await this.persistAndReturn(result, channel, payload, userId);
      }

      return await this.persistWithCapabilityRecovery(result, channel, payload, userId, sessionId);
    } catch (error) {
      this.logger.error(`Voice chat failed: ${error?.message ?? error}`, error?.stack);

      const fallbackResult = await this.voiceCapabilityDispatcherService.dispatch(
        this.buildCapabilityContext(dto.transcriptText, language, sessionId, userId),
        'fallback',
      );
      if (fallbackResult) {
        this.logger.log('Agent unavailable - serving capability fallback response');
        return await this.persistAndReturn(fallbackResult, channel, payload, userId);
      }

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

  private async persistWithCapabilityRecovery(
    result: VoiceChatResponseDto,
    channel: VoiceChatInputMode,
    payload: VoiceChatTcpPayload,
    userId: string,
    sessionId: string,
  ): Promise<VoiceChatResponseDto> {
    const recoveryResult = await this.voiceCapabilityDispatcherService.dispatch(
      this.buildCapabilityContext(
        result.transcription || payload.transcriptText,
        result.language || payload.language,
        result.sessionId || sessionId,
        userId,
      ),
      'recovery',
    );

    if (recoveryResult) {
      return await this.persistAndReturn(
        {
          ...recoveryResult,
          transcription: result.transcription || recoveryResult.transcription,
          language: result.language || recoveryResult.language,
          sessionId: result.sessionId || sessionId,
        },
        channel,
        payload,
        userId,
      );
    }

    return await this.persistAndReturn(result, channel, payload, userId);
  }

  private buildCapabilityContext(
    transcriptText: string | undefined,
    language: VoiceChatTcpPayload['language'],
    sessionId: string,
    userId: string,
  ): VoiceCapabilityContext {
    return {
      transcriptText,
      language,
      sessionId,
      userId,
    };
  }

  private async persistAndReturn(
    result: VoiceChatResponseDto,
    channel: VoiceChatInputMode,
    payload: VoiceChatTcpPayload,
    userId: string,
  ): Promise<VoiceChatResponseDto> {
    await this.voiceChatRepository.appendExchange({
      userId,
      channel,
      language: result.language,
      userText: result.transcription || payload.transcriptText || '',
      assistantText: result.response || '',
      transcription: result.transcription || payload.transcriptText || '',
    });

    return result;
  }
}
