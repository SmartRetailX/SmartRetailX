import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import {
  type VoiceAssistantIntent,
  type VoiceChatInputMode,
  type VoiceChatDto,
  type VoiceChatResponseDto,
  type VoiceChatSessionDto,
  type VoiceChatStoredMessage,
  type VoiceChatTcpPayload,
  type VoiceExplainability,
  type VoiceUserContext,
} from '@smart-retail-x/shared-types';

import { VoiceAgentTransportService } from './voice-agent-transport.service';
import { VoiceAudioStorageService } from './voice-audio-storage.service';
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
    private readonly voiceAudioStorageService: VoiceAudioStorageService,
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
    const recentMessages = await this.getRecentMessagesForContext(userId);
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
    const voiceAudioUrl =
      channel === 'voice' && audioFile?.buffer?.length
        ? await this.voiceAudioStorageService.uploadVoiceAudio({
            buffer: audioFile.buffer,
            mimeType: audioFile.mimetype,
            userId,
            sessionId,
          })
        : null;

    try {
      const clarificationSelection = this.resolveClarificationSelectionTranscript(payload.transcriptText, recentMessages);
      if (clarificationSelection) {
        const selectionResult = await this.voiceCapabilityDispatcherService.dispatch(
          this.buildCapabilityContext(
            clarificationSelection,
            language,
            sessionId,
            userId,
            'product_search',
            { selectedOption: payload.transcriptText, product: clarificationSelection },
            {
              source: 'db-catalog',
              confidence: 0.96,
              rationale: 'User selected a numbered option from the previous catalog clarification response.',
              features: [
                {
                  name: 'clarification_selection',
                  weight: 1,
                  evidence: clarificationSelection,
                },
              ],
            },
            recentMessages,
          ),
          'primary',
        );

        if (selectionResult) {
          return await this.persistAndReturn(
            this.withAudioUrl(this.withVisibleTranscription(selectionResult, payload.transcriptText), voiceAudioUrl),
            channel,
            payload,
            userId,
            voiceAudioUrl,
          );
        }
      }

      const transportResult = await this.voiceAgentTransportService.request(audioFile, payload);
      const refinedAgentTranscription = this.refineTranscript(transportResult.transcription);
      const result: VoiceChatResponseDto = {
        ...transportResult,
        transcription: refinedAgentTranscription || payload.transcriptText || transportResult.transcription,
      };

      const visibleTranscript = this.resolveCapabilityTranscript(channel, payload.transcriptText, result.transcription);
      const capabilityTranscript = this.resolveContextualCapabilityTranscript(visibleTranscript, recentMessages);
      const capabilityLanguage = result.language || payload.language;
      const capabilitySessionId = result.sessionId || sessionId;
      const isDbGroundedQuery = this.isDatabaseGroundedQuery(
        capabilityTranscript || payload.transcriptText || result.transcription,
      );
      const isDbGroundedIntent = this.isDatabaseGroundedIntent(result.intent);
      const enforceDatabaseGrounding = isDbGroundedQuery || isDbGroundedIntent;

      const primaryCapabilityResult = await this.voiceCapabilityDispatcherService.dispatch(
        this.buildCapabilityContext(
          capabilityTranscript,
          capabilityLanguage,
          capabilitySessionId,
          userId,
          result.intent,
          result.entities,
          result.explainability,
          recentMessages,
        ),
        'primary',
      );

      if (primaryCapabilityResult) {
          return await this.persistAndReturn(
            this.withAudioUrl(this.withVisibleTranscription(primaryCapabilityResult, visibleTranscript), voiceAudioUrl),
            channel,
            payload,
            userId,
            voiceAudioUrl,
          );
      }

      if (enforceDatabaseGrounding) {
        const refinedValidatedResult = await this.tryDbValidatedRefinedCapability(
          capabilityTranscript,
          payload.transcriptText,
          result.transcription,
          capabilityLanguage,
          capabilitySessionId,
          userId,
          result.intent,
          result.entities,
          result.explainability,
          recentMessages,
        );

        if (refinedValidatedResult) {
          return await this.persistAndReturn(
            this.withAudioUrl(this.withVisibleTranscription(refinedValidatedResult, visibleTranscript), voiceAudioUrl),
            channel,
            payload,
            userId,
            voiceAudioUrl,
          );
        }
      }

      if (result.success && result.response?.trim()) {
        // For DB-grounded user questions, avoid returning free-form generated answers.
        if (enforceDatabaseGrounding) {
          const fallbackCapabilityResult = await this.voiceCapabilityDispatcherService.dispatch(
            this.buildCapabilityContext(
              capabilityTranscript,
              capabilityLanguage,
              capabilitySessionId,
              userId,
              result.intent,
              result.entities,
              result.explainability,
              recentMessages,
            ),
            'fallback',
          );

          if (fallbackCapabilityResult) {
            return await this.persistAndReturn(
              this.withAudioUrl(
                this.withVisibleTranscription(fallbackCapabilityResult, visibleTranscript),
                voiceAudioUrl,
              ),
              channel,
              payload,
              userId,
              voiceAudioUrl,
            );
          }

          return await this.persistAndReturn(
            this.withAudioUrl(
              this.buildDatabaseSafetyResponse(
                capabilityTranscript,
                capabilityLanguage,
                capabilitySessionId,
                result.intent,
                result.explainability,
              ),
              voiceAudioUrl,
            ),
            channel,
            payload,
            userId,
            voiceAudioUrl,
          );
        }

        return await this.persistAndReturn(this.withAudioUrl(result, voiceAudioUrl), channel, payload, userId, voiceAudioUrl);
      }

      return await this.persistWithCapabilityRecovery(this.withAudioUrl(result, voiceAudioUrl), channel, payload, userId, sessionId, voiceAudioUrl);
    } catch (error) {
      this.logger.error(`Voice chat failed: ${error?.message ?? error}`, error?.stack);

      const fallbackResult = await this.voiceCapabilityDispatcherService.dispatch(
        this.buildCapabilityContext(this.refineTranscript(dto.transcriptText), language, sessionId, userId),
        'fallback',
      );
      if (fallbackResult) {
        this.logger.log('Agent unavailable - serving capability fallback response');
        return await this.persistAndReturn(this.withAudioUrl(fallbackResult, voiceAudioUrl), channel, payload, userId, voiceAudioUrl);
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
    audioUrl?: string | null,
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
        this.withAudioUrl(
          {
            ...recoveryResult,
            transcription: result.transcription || recoveryResult.transcription,
            language: result.language || recoveryResult.language,
            sessionId: result.sessionId || sessionId,
          },
          audioUrl,
        ),
        channel,
        payload,
        userId,
        audioUrl,
      );
    }

    return await this.persistAndReturn(this.withAudioUrl(result, audioUrl), channel, payload, userId, audioUrl);
  }

  private withAudioUrl(result: VoiceChatResponseDto, audioUrl?: string | null): VoiceChatResponseDto {
    if (!audioUrl) {
      return result;
    }

    return {
      ...result,
      audioUrl,
    };
  }

  private async persistAndReturn(
    result: VoiceChatResponseDto,
    channel: VoiceChatInputMode,
    payload: VoiceChatTcpPayload,
    userId: string,
    audioUrl?: string | null,
  ): Promise<VoiceChatResponseDto> {
    await this.voiceChatRepository.appendExchange({
      userId,
      channel,
      language: result.language,
      userText: result.transcription || payload.transcriptText || '',
      assistantText: result.response || '',
      transcription: result.transcription || payload.transcriptText || '',
      userAudioUrl: audioUrl ?? result.audioUrl ?? null,
    });

    return result;
  }

  private buildCapabilityContext(
    transcriptText: string | undefined,
    language: VoiceChatTcpPayload['language'],
    sessionId: string,
    userId: string,
    intent?: VoiceAssistantIntent,
    entities?: Record<string, unknown>,
    explainability?: VoiceExplainability,
    recentMessages?: VoiceChatStoredMessage[],
  ): VoiceCapabilityContext {
    return {
      transcriptText,
      language,
      sessionId,
      userId,
      intent,
      entities,
      explainability,
      recentMessages,
    };
  }

  private async getRecentMessagesForContext(userId: string): Promise<VoiceChatStoredMessage[]> {
    try {
      const session = await this.voiceChatRepository.getSessionWithMessages(userId, 16);
      return session.messages || [];
    } catch (error) {
      this.logger.warn(`Voice context history unavailable (${error?.message ?? error})`);
      return [];
    }
  }

  private resolveClarificationSelectionTranscript(
    transcriptText: string | undefined,
    recentMessages: VoiceChatStoredMessage[],
  ): string | undefined {
    const selectedNumber = this.extractSelectionNumber(transcriptText);
    if (!selectedNumber) {
      return undefined;
    }

    for (const message of [...recentMessages].reverse()) {
      if (message.role !== 'assistant') {
        continue;
      }

      const selectedProduct = this.extractNumberedCatalogOption(message.content, selectedNumber);
      if (selectedProduct) {
        this.logger.log(`Resolved catalog clarification option ${selectedNumber}: "${selectedProduct}"`);
        return selectedProduct;
      }
    }

    return undefined;
  }

  private extractSelectionNumber(text: string | undefined): number | undefined {
    const normalized = this.normalizeForComparison(text);
    if (!normalized) {
      return undefined;
    }

    const digitMatch = normalized.match(/^(?:option|අංකය|අංක)?\s*([1-9]|10)$/u);
    if (digitMatch?.[1]) {
      return Number(digitMatch[1]);
    }

    const ordinalMap = new Map<string, number>([
      ['එක', 1],
      ['පළවෙනි', 1],
      ['පලවෙනි', 1],
      ['first', 1],
      ['දෙක', 2],
      ['දෙවෙනි', 2],
      ['second', 2],
      ['තුන', 3],
      ['තුන්වෙනි', 3],
      ['third', 3],
    ]);

    return ordinalMap.get(normalized);
  }

  private extractNumberedCatalogOption(content: string | undefined, selectedNumber: number): string | undefined {
    const text = content?.trim();
    if (!text || selectedNumber < 1) {
      return undefined;
    }

    const optionPattern = /^\s*(\d{1,2})\)\s+(.+?)(?:\s+\([^)]*\))?\s*$/gmu;
    for (const match of text.matchAll(optionPattern)) {
      if (Number(match[1]) !== selectedNumber) {
        continue;
      }

      const productName = this.cleanCatalogOptionText(match[2]);
      if (productName) {
        return productName;
      }
    }

    const tablePattern = /^\|\s*(\d{1,2})\s*\|\s*(.+?)\s*\|/gmu;
    for (const match of text.matchAll(tablePattern)) {
      if (Number(match[1]) !== selectedNumber) {
        continue;
      }

      const productName = this.cleanCatalogOptionText(match[2]);
      if (productName) {
        return productName;
      }
    }

    return undefined;
  }

  private cleanCatalogOptionText(value: string | undefined): string | undefined {
    const text = value?.trim();
    if (!text || /^-+$/.test(text)) {
      return undefined;
    }

    const linkMatch = text.match(/\[([^\]]+)\]\([^)]+\)/u);
    const productName = (linkMatch?.[1] || text)
      .replace(/\*\*/g, '')
      .replace(/\\([\\\]\|])/g, '$1')
      .trim();

    return productName || undefined;
  }

  private resolveContextualCapabilityTranscript(
    transcriptText: string | undefined,
    recentMessages: VoiceChatStoredMessage[],
  ): string | undefined {
    const current = this.refineTranscript(transcriptText);
    if (!current || !this.isContextualFollowUp(current)) {
      return current;
    }

    const previous = this.findPreviousGroundedContext(recentMessages);
    if (!previous) {
      return current;
    }

    const resolved = `${previous} ${current}`.trim();
    this.logger.log(`Resolved contextual voice query: "${current}" -> "${resolved}"`);
    return resolved;
  }

  private isContextualFollowUp(text: string): boolean {
    const normalized = this.normalizeForComparison(text);
    if (!normalized) {
      return false;
    }

    const followUpTerms = [
      'ඒවා',
      'ඒක',
      'එක',
      'මෙක',
      'මේක',
      'මොනවද තියෙන',
      'මොනවා තියෙන',
      'මොනවද තියෙන්නේ',
      'මොනවා තියෙන්නේ',
      'තියෙන ඒවා',
      'තියෙනවා ඒවා',
      'available ඒවා',
      'what about',
      'how about',
      'available ones',
      'stock එක',
      'price එක',
    ];
    const hasFollowUpCue = followUpTerms.some((term) => normalized.includes(term.toLowerCase()));
    if (!hasFollowUpCue) {
      return false;
    }

    const fillerTokens = new Set([
      'මොනවද',
      'මොනවා',
      'තියෙන',
      'තියෙනවා',
      'තියෙන්නේ',
      'ඒවා',
      'available',
      'ones',
      'stock',
      'price',
    ]);
    const productTokens = normalized
      .split(/\s+/)
      .map((token) => token.replace(/^[^\p{L}\p{N}\p{M}]+|[^\p{L}\p{N}\p{M}]+$/gu, ''))
      .filter((token) => token.length >= 3 && !fillerTokens.has(token));

    return productTokens.length <= 3;
  }

  private findPreviousGroundedContext(recentMessages: VoiceChatStoredMessage[]): string | undefined {
    for (const message of [...recentMessages].reverse()) {
      if (message.role === 'user') {
        const candidate = this.refineTranscript(message.transcription || message.content);
        if (candidate && this.isDatabaseGroundedQuery(candidate)) {
          return candidate;
        }
        continue;
      }

      const catalogContext = this.extractCatalogContextFromAssistantMessage(message.content);
      if (catalogContext) {
        return catalogContext;
      }
    }

    return undefined;
  }

  private extractCatalogContextFromAssistantMessage(content: string | undefined): string | undefined {
    const text = content?.trim();
    if (!text) {
      return undefined;
    }

    const nameMatch = text.match(/(?:^|\n)නම:\s*(.+?)(?:\n|$)/u);
    if (nameMatch?.[1]?.trim()) {
      return `${nameMatch[1].trim()} available`;
    }

    const reasonMatch = text.match(/ගැලපුනේ:\s*සෙවූ වචන ගැලපුණා:\s*([^\n]+)/u);
    if (reasonMatch?.[1]?.trim()) {
      return `${reasonMatch[1].replace(/,/g, ' ').trim()} available`;
    }

    return undefined;
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
    intent?: VoiceAssistantIntent,
    entities?: Record<string, unknown>,
    explainability?: VoiceExplainability,
    recentMessages?: VoiceChatStoredMessage[],
  ): Promise<VoiceChatResponseDto | null> {
    const candidates = this.buildRefinementCandidates(alreadyTriedTranscript, sourceTranscript, agentTranscription);
    for (const candidate of candidates) {
      const validated = await this.voiceCapabilityDispatcherService.dispatch(
        this.buildCapabilityContext(candidate, language, sessionId, userId, intent, entities, explainability, recentMessages),
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
      'available',
      'availability',
      'product',
      'products',
      'catalog',
      'search',
      'type',
      'types',
      'category',
      'categories',
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
      'තියෙනව',
      'තියනව',
      'ලැයිස්තුව',
      'නිර්දේශ',
      'යෝජනා',
      'භාණ්ඩ',
      'නිෂ්පාදන',
      'වර්ග',
      'කාණ්ඩ',
    ];

    return dbTerms.some((term) => normalized.includes(term.toLowerCase()));
  }

  private isDatabaseGroundedIntent(intent: VoiceAssistantIntent | undefined): boolean {
    return intent === 'offers' || intent === 'order_history' || intent === 'product_search' || intent === 'prices' || intent === 'buying_suggestions';
  }

  private buildDatabaseSafetyResponse(
    transcription: string | undefined,
    language: VoiceChatTcpPayload['language'],
    sessionId: string,
    intent?: VoiceAssistantIntent,
    explainability?: VoiceExplainability,
  ): VoiceChatResponseDto {
    return {
      success: true,
      transcription: transcription?.trim() || '',
      response:
        'මට database මත පදනම් වූ නිවැරදි දත්ත පමණක් ලබාදිය හැක. කරුණාකර order number, product name, offer, price, stock වගේ විස්තරාත්මක එකක් නැවත අහන්න.',
      language,
      sessionId,
      messages: [],
      intent,
      explainability: explainability ?? {
        source: 'fallback-keyword',
        confidence: 0.3,
        rationale: 'DB-grounded intent was detected, but no capability returned a confident database result.',
        features: [],
      },
      model: 'db-grounded-safety',
    };
  }

  private withVisibleTranscription(
    result: VoiceChatResponseDto,
    visibleTranscript: string | undefined,
  ): VoiceChatResponseDto {
    const transcription = visibleTranscript?.trim();
    if (!transcription || transcription === result.transcription) {
      return result;
    }

    return {
      ...result,
      transcription,
    };
  }

}
