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
import { VoiceTranscriptRefinerService } from './voice-transcript-refiner.service';

@Injectable()
export class VoiceService {
  private readonly logger = new Logger(VoiceService.name);

  constructor(
    private readonly voiceAgentTransportService: VoiceAgentTransportService,
    private readonly voiceCapabilityDispatcherService: VoiceCapabilityDispatcherService,
    private readonly voiceChatRepository: VoiceChatRepository,
    private readonly voiceTranscriptRefinerService: VoiceTranscriptRefinerService,
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
      transcriptText: this.refineTranscript(dto.transcriptText),
    };

    try {
      const transportResult = await this.voiceAgentTransportService.request(audioFile, payload);
      const refinedAgentTranscription = this.refineTranscript(transportResult.transcription);
      const result: VoiceChatResponseDto = {
        ...transportResult,
        transcription: refinedAgentTranscription || payload.transcriptText || transportResult.transcription,
      };

      const capabilityTranscript = this.resolveCapabilityTranscript(channel, payload.transcriptText, result.transcription);
      const capabilityLanguage = result.language || payload.language;
      const capabilitySessionId = result.sessionId || sessionId;
      const isDbGroundedQuery = this.isDatabaseGroundedQuery(
        capabilityTranscript || payload.transcriptText || result.transcription,
      );

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
        return await this.persistAndReturn(primaryCapabilityResult, channel, payload, userId);
      }

      if (isDbGroundedQuery) {
        const refinedValidatedResult = await this.tryDbValidatedRefinedCapability(
          capabilityTranscript,
          payload.transcriptText,
          result.transcription,
          capabilityLanguage,
          capabilitySessionId,
          userId,
        );

        if (refinedValidatedResult) {
          return await this.persistAndReturn(refinedValidatedResult, channel, payload, userId);
        }
      }

      if (result.success && result.response?.trim()) {
        // For DB-grounded user questions, avoid returning free-form generated answers.
        if (isDbGroundedQuery) {
          const fallbackCapabilityResult = await this.voiceCapabilityDispatcherService.dispatch(
            this.buildCapabilityContext(
              capabilityTranscript,
              capabilityLanguage,
              capabilitySessionId,
              userId,
            ),
            'fallback',
          );

          if (fallbackCapabilityResult) {
            return await this.persistAndReturn(fallbackCapabilityResult, channel, payload, userId);
          }

          return await this.persistAndReturn(
            this.buildDatabaseSafetyResponse(capabilityTranscript, capabilityLanguage, capabilitySessionId),
            channel,
            payload,
            userId,
          );
        }

        return await this.persistAndReturn(result, channel, payload, userId);
      }

      return await this.persistWithCapabilityRecovery(result, channel, payload, userId, sessionId);
    } catch (error) {
      this.logger.error(`Voice chat failed: ${error?.message ?? error}`, error?.stack);

      const fallbackResult = await this.voiceCapabilityDispatcherService.dispatch(
        this.buildCapabilityContext(this.refineTranscript(dto.transcriptText), language, sessionId, userId),
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
    const sourceText = this.refineTranscript(originalText);
    const transcribedText = this.refineTranscript(agentTranscription);

    // For text requests, keep capability matching anchored to the exact user text.
    if (channel === 'text') {
      return sourceText || transcribedText;
    }

    return transcribedText || sourceText;
  }

  private refineTranscript(text: string | undefined): string | undefined {
    return this.voiceTranscriptRefinerService.refine(text);
  }

  private async tryDbValidatedRefinedCapability(
    alreadyTriedTranscript: string | undefined,
    sourceTranscript: string | undefined,
    agentTranscription: string | undefined,
    language: VoiceChatTcpPayload['language'],
    sessionId: string,
    userId: string,
  ): Promise<VoiceChatResponseDto | null> {
    const candidates = this.buildRefinementCandidates(alreadyTriedTranscript, sourceTranscript, agentTranscription);
    for (const candidate of candidates) {
      const validated = await this.voiceCapabilityDispatcherService.dispatch(
        this.buildCapabilityContext(candidate, language, sessionId, userId),
        'primary',
      );

      if (validated) {
        this.logger.log('DB-validated response selected using AI-refined transcript candidate');
        return validated;
      }
    }

    return null;
  }

  private buildRefinementCandidates(
    alreadyTriedTranscript: string | undefined,
    sourceTranscript: string | undefined,
    agentTranscription: string | undefined,
  ): string[] {
    const seen = new Set<string>();
    const tried = this.normalizeForComparison(alreadyTriedTranscript);

    if (tried) {
      seen.add(tried);
    }

    const rawCandidates = [agentTranscription, sourceTranscript]
      .map((value) => this.refineTranscript(value))
      .filter((value): value is string => Boolean(value?.trim()));

    const candidates: string[] = [];
    for (const candidate of rawCandidates) {
      const normalized = this.normalizeForComparison(candidate);
      if (!normalized || seen.has(normalized)) {
        continue;
      }

      seen.add(normalized);
      candidates.push(candidate);
    }

    return candidates;
  }

  private normalizeForComparison(text: string | undefined): string {
    return (text || '').toLowerCase().replace(/\s+/g, ' ').trim();
  }

  private isDatabaseGroundedQuery(text: string | undefined): boolean {
    const normalized = (text || '').toLowerCase().replace(/\s+/g, ' ').trim();
    if (!normalized) {
      return false;
    }

    const dbTerms = [
      'order',
      'orders',
      'history',
      'status',
      'offer',
      'offers',
      'promotion',
      'discount',
      'price',
      'stock',
      'product',
      'products',
      'catalog',
      'search',
      'recommend',
      'suggest',
      'shopping list',
      'buying list',
      'ඇණවු',
      'ඔර්ඩ',
      'ඕඩ',
      'ඔෆර්',
      'වට්ටම්',
      'ප්‍රවර්ධන',
      'දීමනා',
      'මිල',
      'තොග',
      'ලැයිස්තුව',
      'නිර්දේශ',
      'යෝජනා',
      'භාණ්ඩ',
      'නිෂ්පාදන',
    ];

    return dbTerms.some((term) => normalized.includes(term.toLowerCase()));
  }

  private buildDatabaseSafetyResponse(
    transcription: string | undefined,
    language: VoiceChatTcpPayload['language'],
    sessionId: string,
  ): VoiceChatResponseDto {
    return {
      success: true,
      transcription: transcription?.trim() || '',
      response:
        'මට database මත පදනම් වූ නිවැරදි දත්ත පමණක් ලබාදිය හැක. කරුණාකර order number, product name, offer, price, stock වගේ විස්තරාත්මක එකක් නැවත අහන්න.',
      language,
      sessionId,
      messages: [],
      model: 'db-grounded-safety',
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
