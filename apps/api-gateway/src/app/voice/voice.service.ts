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

type CatalogSearchMatch = {
  productId: string;
  productUuid: string;
  sku: string | null;
  nameEn: string;
  nameSi: string | null;
  categoryEn: string;
  categorySi: string | null;
  brandSi: string | null;
  price: number;
  currentStock: number;
  status: string;
  storeId: string | null;
  tokenHits: number;
  exactHit: boolean;
  prefixHit: boolean;
  matchScore: number;
};

type CatalogSearchResponse = {
  success: boolean;
  term: string;
  matches: CatalogSearchMatch[];
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

    const directCatalogResult = await this.tryCatalogResponse(dto.transcriptText, language, sessionId);
    if (directCatalogResult) {
      return await this.persistAndReturn(directCatalogResult, channel, payload, userId);
    }

    const transportMode = (this.configService.get<string>('AGENT_VOICE_TRANSPORT', 'http-first') ||
      'http-first') as 'http-only' | 'http-first' | 'tcp-first';

    try {
      if (transportMode === 'http-only') {
        const result = await this.forwardViaHttp(audioFile, payload);
        return await this.persistWithCatalogFallback(result, channel, payload, userId, sessionId);
      }

      if (transportMode === 'http-first') {
        try {
          const result = await this.forwardViaHttp(audioFile, payload);
          return await this.persistWithCatalogFallback(result, channel, payload, userId, sessionId);
        } catch (httpError) {
          this.logger.warn(
            `HTTP agent request failed (${httpError?.message ?? httpError}). Trying TCP fallback...`,
          );
          const result = await this.forwardViaTcp(payload, language, sessionId);
          return await this.persistWithCatalogFallback(result, channel, payload, userId, sessionId);
        }
      }

      try {
        const result = await this.forwardViaTcp(payload, language, sessionId);
        return await this.persistWithCatalogFallback(result, channel, payload, userId, sessionId);
      } catch (tcpError) {
        this.logger.warn(
          `TCP agent request failed (${tcpError?.message ?? tcpError}). Trying HTTP fallback...`,
        );
        const result = await this.forwardViaHttp(audioFile, payload);
        return await this.persistWithCatalogFallback(result, channel, payload, userId, sessionId);
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

      const selectedMatches = this.selectCatalogMatches(queryText, result.matches);
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

    return ['### Matching Products', ...lines, '_Tip: ask with brand, size, or variant for an exact single match._'].join('\n');
  }

  private formatSingleCatalogMatch(product: CatalogSearchMatch): string {
    return [
      '### Product Match',
      `- **Name:** ${this.getDisplayName(product)}`,
      `- **Category:** ${this.getDisplayCategory(product)}`,
      `- **Price:** ${this.formatPrice(product.price)}`,
      `- **Stock:** ${this.formatStockLabel(product.currentStock)}`,
    ].join('\n');
  }

  private formatCompactCatalogMatch(product: CatalogSearchMatch): string {
    return `**${this.getDisplayName(product)}** - ${this.formatPrice(product.price)} | ${this.formatStockLabel(product.currentStock)} | ${this.getDisplayCategory(product)}`;
  }

  private getDisplayName(product: CatalogSearchMatch): string {
    return (product.nameSi || product.nameEn || '').trim();
  }

  private getDisplayCategory(product: CatalogSearchMatch): string {
    return (product.categorySi || product.categoryEn || 'N/A').trim() || 'N/A';
  }

  private formatPrice(price: number): string {
    return `LKR ${Number(price).toFixed(2)}`;
  }

  private formatStockLabel(stock: number): string {
    return stock > 0 ? `${stock} available` : 'Out of stock';
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
