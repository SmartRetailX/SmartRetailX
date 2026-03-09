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
  private readonly secondOpinionModels = new Set([
    'db-offers-empty',
    'offer-fallback',
  ]);

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
      const capabilityTranscript = this.resolveCapabilityTranscript(channel, payload.transcriptText, result.transcription);
      const capabilityLanguage = result.language || payload.language;
      const capabilitySessionId = result.sessionId || sessionId;

      const primaryCapabilityResult = await this.voiceCapabilityDispatcherService.dispatch(
        this.buildCapabilityContext(
          capabilityTranscript,
          capabilityLanguage,
          capabilitySessionId,
          userId,
        ),
        'primary',
      );

      if (primaryCapabilityResult) {
        const rechecked = this.tryAgentSecondOpinion(primaryCapabilityResult, result, payload, sessionId);
        return await this.persistAndReturn(rechecked || primaryCapabilityResult, channel, payload, userId);
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
    const recoveryTranscript = this.resolveCapabilityTranscript(channel, payload.transcriptText, result.transcription);

    const recoveryResult = await this.voiceCapabilityDispatcherService.dispatch(
      this.buildCapabilityContext(
        recoveryTranscript,
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

  private resolveCapabilityTranscript(
    channel: VoiceChatInputMode,
    originalText: string | undefined,
    agentTranscription: string | undefined,
  ): string | undefined {
    const sourceText = originalText?.trim();
    const transcribedText = agentTranscription?.trim();

    // For text requests, keep capability matching anchored to the exact user text.
    if (channel === 'text') {
      return sourceText || transcribedText;
    }

    return transcribedText || sourceText;
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

  private tryAgentSecondOpinion(
    capabilityResult: VoiceChatResponseDto,
    agentResult: VoiceChatResponseDto,
    payload: VoiceChatTcpPayload,
    sessionId: string,
  ): VoiceChatResponseDto | null {
    const capabilityModel = (capabilityResult.model || '').trim();
    if (!this.secondOpinionModels.has(capabilityModel)) {
      return null;
    }

    const agentText = (agentResult.response || '').trim();
    if (!agentResult.success || !agentText) {
      return null;
    }

    if (this.isWeakSecondOpinion(agentText, capabilityResult.response || '', payload.transcriptText || '')) {
      return null;
    }

    this.logger.log(`AI second-opinion override applied for model: ${capabilityModel}`);

    return {
      ...agentResult,
      transcription: agentResult.transcription || capabilityResult.transcription || payload.transcriptText || '',
      language: agentResult.language || capabilityResult.language,
      sessionId: agentResult.sessionId || capabilityResult.sessionId || sessionId,
      model: `${agentResult.model || 'agent'}-second-opinion`,
    };
  }

  private isWeakSecondOpinion(agentText: string, capabilityText: string, sourceText: string): boolean {
    const normalizedAgent = agentText.toLowerCase().replace(/\s+/g, ' ').trim();
    const normalizedCapability = (capabilityText || '').toLowerCase().replace(/\s+/g, ' ').trim();
    const normalizedSource = (sourceText || '').toLowerCase().replace(/\s+/g, ' ').trim();

    if (!normalizedAgent) {
      return true;
    }

    if (normalizedAgent === normalizedCapability) {
      return true;
    }

    if (normalizedAgent.endsWith('?') || /\?|\u061f/u.test(normalizedAgent)) {
      return true;
    }

    if (this.isLikelyParaphrase(normalizedAgent, normalizedSource)) {
      return true;
    }

    const weakPhrases = [
      'agent service unavailable',
      'i do not have access',
      'cannot access',
      'දැනට offers සේවාවට සම්බන්ධතාවයේ ගැටලුවක්',
      'ඔබ සෙවූ භාණ්ඩය දැනට',
    ];

    return weakPhrases.some((phrase) => normalizedAgent.includes(phrase.toLowerCase()));
  }

  private isLikelyParaphrase(candidate: string, source: string): boolean {
    if (!candidate || !source) {
      return false;
    }

    const candidateTokens = this.tokenizeText(candidate);
    const sourceTokens = this.tokenizeText(source);
    if (candidateTokens.length < 3 || sourceTokens.length < 3) {
      return false;
    }

    const sourceSet = new Set(sourceTokens);
    const overlap = candidateTokens.filter((token) => sourceSet.has(token)).length;
    return overlap / candidateTokens.length >= 0.7;
  }

  private tokenizeText(text: string): string[] {
    return Array.from(
      new Set(
        text
          .split(/\s+/)
          .map((token) => token.replace(/^[^\p{L}\p{N}\p{M}]+|[^\p{L}\p{N}\p{M}]+$/gu, ''))
          .filter((token) => token.length >= 2),
      ),
    );
  }
}
