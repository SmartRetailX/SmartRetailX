import { Inject, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ConfigService } from '@smart-retail-x/config';
import {
  VOICE_CHAT_PATTERN,
  buildCatalogQueryTokens,
  normalizeCatalogQuery,
  type VoiceAssistantIntent,
  type VoiceChatInputMode,
  type VoiceChatDto,
  type VoiceChatResponseDto,
  type VoiceChatSessionDto,
  type VoiceChatTcpPayload,
  type VoiceUserContext,
} from '@smart-retail-x/shared-types';
import { catchError, defaultIfEmpty, firstValueFrom, timeout } from 'rxjs';

import { VoiceChatRepository } from './voice-chat.repository';

/** Shape returned by core-service `catalog_search`. */
type CatalogSearchRaw = {
  productId: string;
  sku: string;
  name: string;
  nameSi: string | null;
  baseProduct: string | null;
  baseProductSi: string | null;
  category: string | null;
  categorySi: string | null;
  price: number;
  currentStock: number;
  imageUrl: string | null;
  isActive: boolean;
};

/** Enriched match with locally-computed scoring. */
type CatalogSearchMatch = CatalogSearchRaw & {
  tokenHits: number;
  exactHit: boolean;
  prefixHit: boolean;
  matchScore: number;
};

type CatalogSearchResponse = {
  success: boolean;
  term: string;
  matches: CatalogSearchRaw[];
};

@Injectable()
export class VoiceService {
  private readonly logger = new Logger(VoiceService.name);

  constructor(
    @Inject('AGENT_SERVICE') private readonly agentClient: ClientProxy,
    @Inject('CORE_SERVICE') private readonly coreClient: ClientProxy,
    private readonly configService: ConfigService,
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

    const transportMode = (this.configService.get<string>('AGENT_VOICE_TRANSPORT', 'http-first') ||
      'http-first') as 'http-only' | 'http-first' | 'tcp-first';

    try {
      let result: VoiceChatResponseDto;

      if (transportMode === 'http-only') {
        result = await this.forwardViaHttp(audioFile, payload);
      } else if (transportMode === 'http-first') {
        try {
          result = await this.forwardViaHttp(audioFile, payload);
        } catch (httpError) {
          this.logger.warn(
            `HTTP agent request failed (${httpError?.message ?? httpError}). Trying TCP fallback...`,
          );
          result = await this.forwardViaTcp(payload, language, sessionId);
        }
      } else {
        try {
          result = await this.forwardViaTcp(payload, language, sessionId);
        } catch (tcpError) {
          this.logger.warn(
            `TCP agent request failed (${tcpError?.message ?? tcpError}). Trying HTTP fallback...`,
          );
          result = await this.forwardViaHttp(audioFile, payload);
        }
      }

      // If the agent gave a meaningful response, use it directly.
      // For catalog-style questions (prices/products), prefer factual catalog response
      // even when the agent generated generic text.
      const effectiveTranscript = result.transcription || payload.transcriptText;
      if (this.isCatalogStyleQuestion(effectiveTranscript)) {
        const factualResult = await this.tryCatalogResponse(
          effectiveTranscript,
          result.language || payload.language,
          result.sessionId || sessionId,
        );

        if (factualResult) {
          return await this.persistAndReturn(
            {
              ...factualResult,
              transcription: effectiveTranscript,
              language: result.language,
              sessionId: result.sessionId || sessionId,
            },
            channel,
            payload,
            userId,
          );
        }
      }

      if (result.success && result.response?.trim()) {
        return await this.persistAndReturn(result, channel, payload, userId);
      }

      return await this.persistWithCatalogFallback(result, channel, payload, userId, sessionId);
    } catch (error) {
      this.logger.error(`Voice chat failed: ${error?.message ?? error}`, error?.stack);

      // Last resort: try catalog search when the agent is completely unavailable.
      const catalogFallback = await this.tryCatalogResponse(dto.transcriptText, language, sessionId);
      if (catalogFallback) {
        this.logger.log('Agent unavailable – serving catalog fallback response');
        return await this.persistAndReturn(catalogFallback, channel, payload, userId);
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

  private async persistWithCatalogFallback(
    result: VoiceChatResponseDto,
    channel: VoiceChatInputMode,
    payload: VoiceChatTcpPayload,
    userId: string,
    sessionId: string,
  ): Promise<VoiceChatResponseDto> {
    const factualResult = await this.tryCatalogResponse(
      result.transcription || payload.transcriptText,
      result.language || payload.language,
      result.sessionId || sessionId,
    );

    if (factualResult) {
      return await this.persistAndReturn(
        {
          ...factualResult,
          transcription: result.transcription || factualResult.transcription,
          language: result.language,
          sessionId: result.sessionId || sessionId,
        },
        channel,
        payload,
        userId,
      );
    }

    return await this.persistAndReturn(result, channel, payload, userId);
  }

  private async tryCatalogResponse(
    transcriptText: string | undefined,
    language: VoiceChatTcpPayload['language'],
    sessionId: string,
  ): Promise<VoiceChatResponseDto | null> {
    const queryText = transcriptText?.trim();
    if (!queryText) {
      return null;
    }

    const timeoutMs = Number(this.configService.get<string | number>('CORE_CATALOG_TIMEOUT_MS', 3_000));

    try {
      const result = (await firstValueFrom(
        this.coreClient.send({ cmd: 'catalog_search' }, { term: queryText, limit: 3 }).pipe(
          timeout(timeoutMs),
          defaultIfEmpty({ success: false, term: queryText, matches: [] } satisfies CatalogSearchResponse),
          catchError((error) => {
            throw error;
          }),
        ),
      )) as CatalogSearchResponse;

      if (!result?.success || !Array.isArray(result.matches) || result.matches.length === 0) {
        return null;
      }

      const scoredMatches = this.scoreCatalogMatches(queryText, result.matches);
      const selectedMatches = this.selectCatalogMatches(queryText, scoredMatches);
      if (selectedMatches.length === 0) {
        return null;
      }

      return {
        success: true,
        transcription: queryText,
        response: this.buildCatalogResponse(selectedMatches),
        language,
        sessionId,
        messages: [],
        model: 'core-catalog',
      };
    } catch (error) {
      this.logger.warn(`Catalog lookup failed (${error?.message ?? error}). Falling back to agent.`);
      return null;
    }
  }

  /**
   * Compute scoring fields locally because the core-service search
   * returns plain product rows without match metadata.
   */
  private scoreCatalogMatches(queryText: string, rawMatches: CatalogSearchRaw[]): CatalogSearchMatch[] {
    const normalized = normalizeCatalogQuery(queryText);
    const queryTokens = buildCatalogQueryTokens(normalized);

    return rawMatches.map((raw) => {
      const nameLower = (raw.name || '').toLowerCase();
      const nameSiLower = (raw.nameSi || '').toLowerCase();
      const baseLower = (raw.baseProduct || '').toLowerCase();
      const baseSiLower = (raw.baseProductSi || '').toLowerCase();
      const catLower = (raw.category || '').toLowerCase();
      const catSiLower = (raw.categorySi || '').toLowerCase();
      const skuLower = (raw.sku || '').toLowerCase();

      const searchable = [nameLower, nameSiLower, baseLower, baseSiLower, catLower, catSiLower, skuLower];

      const exactHit = nameLower === normalized || nameSiLower === normalized;
      const prefixHit = nameLower.startsWith(normalized) || nameSiLower.startsWith(normalized);

      let tokenHits = 0;
      for (const token of queryTokens) {
        if (searchable.some((field) => field.includes(token))) {
          tokenHits += 1;
        }
      }

      let matchScore = 0;
      if (exactHit) matchScore = 100;
      else if (prefixHit) matchScore = 80;
      else if (queryTokens.length > 0) matchScore = Math.round((tokenHits / queryTokens.length) * 70);

      return { ...raw, tokenHits, exactHit, prefixHit, matchScore };
    });
  }

  private selectCatalogMatches(queryText: string, matches: CatalogSearchMatch[]): CatalogSearchMatch[] {
    const queryTokens = buildCatalogQueryTokens(normalizeCatalogQuery(queryText));

    const relevantMatches = matches
      .filter((match) => this.isConfidentCatalogMatch(match, queryTokens))
      .sort((a, b) => b.matchScore - a.matchScore);

    if (relevantMatches.length === 0) {
      return [];
    }

    const [top, second] = relevantMatches;
    const hasStrongTop = top.exactHit || top.prefixHit || top.matchScore >= 90;
    const clearLead = !second || top.matchScore - second.matchScore >= 24;

    if (hasStrongTop && clearLead) {
      return [top];
    }

    return relevantMatches.slice(0, 3);
  }

  private isConfidentCatalogMatch(match: CatalogSearchMatch, queryTokens: string[]): boolean {
    if (match.exactHit || match.prefixHit) {
      return true;
    }

    if (queryTokens.length >= 2) {
      return match.tokenHits >= 2;
    }

    const singleToken = queryTokens[0] ?? '';
    if (singleToken.length <= 3) {
      return false;
    }

    return match.tokenHits >= 1;
  }

  private buildCatalogResponse(matches: CatalogSearchMatch[]): string {
    const topMatches = matches.slice(0, 3);

    if (topMatches.length === 1) {
      return this.formatSingleCatalogMatch(topMatches[0]);
    }

    const lines = topMatches.map((product, index) => {
      return `${index + 1}. ${this.formatCompactCatalogMatch(product)}`;
    });

    return ['### ගැලපෙන නිෂ්පාදන', ...lines, '_තවත් නිවැරදි ප්‍රතිඵල සඳහා වෙළඳ නාමය හෝ ප්‍රභේදය සඳහන් කරන්න._'].join(
      '\n',
    );
  }

  private formatSingleCatalogMatch(product: CatalogSearchMatch): string {
    return [
      '### නිෂ්පාදන තොරතුරු',
      `- **නම:** ${this.getDisplayName(product)}`,
      `- **වර්ගය:** ${this.getDisplayCategory(product)}`,
      `- **මිල:** ${this.formatPrice(product.price)}`,
      `- **තොගය:** ${this.formatStockLabel(product.currentStock)}`,
    ].join('\n');
  }

  private formatCompactCatalogMatch(product: CatalogSearchMatch): string {
    return `**${this.getDisplayName(product)}** - ${this.formatPrice(product.price)} | ${this.formatStockLabel(product.currentStock)} | ${this.getDisplayCategory(product)}`;
  }

  private getDisplayName(product: CatalogSearchMatch): string {
    return (product.nameSi || product.name || '').trim();
  }

  private getDisplayCategory(product: CatalogSearchMatch): string {
    return (product.categorySi || product.category || 'N/A').trim() || 'N/A';
  }

  private formatPrice(price: number): string {
    return `රු. ${Number(price).toFixed(2)}`;
  }

  private formatStockLabel(stock: number): string {
    return stock > 0 ? `${stock} ක් ඇත` : 'තොග නැත';
  }

  private isCatalogStyleQuestion(text: string | undefined): boolean {
    const normalized = normalizeCatalogQuery(text || '');
    if (!normalized) {
      return false;
    }

    const catalogTerms = [
      'මිල',
      'කීය',
      'කීයද',
      'නිෂ්පාදන',
      'භාණ්ඩ',
      'product',
      'products',
      'price',
      'cost',
      'available',
      'show',
      'find',
      'search',
    ];

    if (catalogTerms.some((term) => normalized.includes(term))) {
      return true;
    }

    return buildCatalogQueryTokens(normalized).length > 0;
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
    audioFile: { buffer: Buffer; mimetype?: string } | undefined,
    payload: VoiceChatTcpPayload,
  ): Promise<VoiceChatResponseDto> {
    const endpoint = this.configService.get<string>(
      'AGENT_HTTP_VOICE_URL',
      'http://127.0.0.1:8010/api/v1/voice/chat',
    );

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
