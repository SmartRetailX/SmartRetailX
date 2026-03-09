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

type OrderListItem = {
  id: string;
  orderNumber: string;
  userId: string;
  status: string;
  itemCount: number;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  createdAt: string;
  updatedAt: string;
};

type OrderListResponse = {
  success: boolean;
  data?: {
    orders: OrderListItem[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
  message?: string;
};

type OrderDetailItem = {
  id: string;
  productId: string;
  productName: string;
  productNameSi: string | null;
  productSku: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
};

type OrderDetail = {
  id: string;
  orderNumber: string;
  userId: string;
  status: string;
  items: OrderDetailItem[];
  itemCount: number;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  createdAt: string;
  updatedAt: string;
};

type OrderDetailResponse = {
  success: boolean;
  data?: OrderDetail;
  message?: string;
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
      const orderAwareResult = await this.tryOrderAwareResponse(
        result.transcription || payload.transcriptText,
        result.language || payload.language,
        result.sessionId || sessionId,
        userId,
      );
      if (orderAwareResult) {
        return await this.persistAndReturn(orderAwareResult, channel, payload, userId);
      }

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

  private async tryOrderAwareResponse(
    transcriptText: string | undefined,
    language: VoiceChatTcpPayload['language'],
    sessionId: string,
    userId: string,
  ): Promise<VoiceChatResponseDto | null> {
    const queryText = transcriptText?.trim();
    if (!queryText) {
      return null;
    }

    if (this.isRecommendationStyleQuestion(queryText)) {
      const responseText = await this.buildRecommendationsFromLastOrder(userId);
      if (!responseText) {
        return null;
      }

      return {
        success: true,
        transcription: queryText,
        response: responseText,
        language,
        sessionId,
        messages: [],
        model: 'core-order-recommendations',
      };
    }

    if (!this.isOrderStyleQuestion(queryText)) {
      return null;
    }

    const responseText = await this.buildOrderResponse(queryText, userId);
    if (!responseText) {
      return null;
    }

    return {
      success: true,
      transcription: queryText,
      response: responseText,
      language,
      sessionId,
      messages: [],
      model: 'core-order-history',
    };
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

  private async buildOrderResponse(queryText: string, userId: string): Promise<string | null> {
    const orderNumber = this.extractOrderNumber(queryText);
    const order =
      orderNumber !== null
        ? await this.fetchOrderByNumber(userId, orderNumber)
        : await this.fetchLatestOrder(userId);

    if (!order) {
      return 'ඔබගේ ඇණවුම් ඉතිහාසයේ දත්ත හමු නොවුණා. පළමුව ඇණවුමක් place කළ පසු විස්තර ලබා දෙන්න පුළුවන්.';
    }

    return this.formatOrderDetail(order);
  }

  private async buildRecommendationsFromLastOrder(userId: string): Promise<string | null> {
    const lastOrder = await this.fetchLatestOrder(userId);
    if (!lastOrder || !Array.isArray(lastOrder.items) || lastOrder.items.length === 0) {
      return 'නිර්දේශ ලබා දීමට ඔබගේ පෙර ඇණවුම් දත්ත හමු නොවුණා.';
    }

    const topItems = [...lastOrder.items].sort((a, b) => b.quantity - a.quantity).slice(0, 4);

    const suggestions = await Promise.all(
      topItems.map(async (item) => {
        const searchTerm = (item.productNameSi || item.productName || '').trim();
        if (!searchTerm) {
          return null;
        }

        const catalog = await this.searchCatalog(searchTerm, 4);
        if (!catalog?.success || !Array.isArray(catalog.matches) || catalog.matches.length === 0) {
          return null;
        }

        const best = catalog.matches.find((m) => m.productId === item.productId) || catalog.matches[0];
        if (!best) {
          return null;
        }

        return `- **${this.getDisplayName(best as CatalogSearchMatch)}** - ${this.formatPrice(best.price)} | ${this.formatStockLabel(best.currentStock)}`;
      }),
    );

    const lines = suggestions.filter((line): line is string => Boolean(line)).slice(0, 5);
    if (lines.length === 0) {
      return 'ඔබගේ අවසන් ඇණවුම අනුව නිර්දේශ සකස් කළා, නමුත් දැනට ගැලපෙන stock items හමු නොවුණා.';
    }

    return [
      '### ඔබට නිර්දේශිත ලැයිස්තුව',
      `- **මූලාශ්‍රය:** ඔබගේ අවසන් ඇණවුම (${lastOrder.orderNumber})`,
      ...lines,
      '_අවශ්‍ය නම් මේ ලැයිස්තුවෙන් items cart එකට දාන්න කියන්න._',
    ].join('\n');
  }

  private async fetchLatestOrder(userId: string): Promise<OrderDetail | null> {
    const list = await this.fetchOrders(userId, 1);
    const latest = list?.data?.orders?.[0];
    if (!latest?.id) {
      return null;
    }

    return await this.fetchOrderById(userId, latest.id);
  }

  private async fetchOrderById(userId: string, orderId: string): Promise<OrderDetail | null> {
    try {
      const timeoutMs = Number(this.configService.get<string | number>('CORE_ORDER_TIMEOUT_MS', 3_000));
      const result = (await firstValueFrom(
        this.coreClient.send({ cmd: 'order_get' }, { userId, orderId }).pipe(
          timeout(timeoutMs),
          defaultIfEmpty({ success: false } satisfies OrderDetailResponse),
          catchError((error) => {
            throw error;
          }),
        ),
      )) as OrderDetailResponse;

      if (!result?.success || !result.data) {
        return null;
      }

      return result.data;
    } catch (error) {
      this.logger.warn(`Order detail lookup failed (${error?.message ?? error})`);
      return null;
    }
  }

  private async fetchOrderByNumber(userId: string, orderNumber: string): Promise<OrderDetail | null> {
    try {
      const timeoutMs = Number(this.configService.get<string | number>('CORE_ORDER_TIMEOUT_MS', 3_000));
      const result = (await firstValueFrom(
        this.coreClient.send({ cmd: 'order_get_by_number' }, { userId, orderNumber }).pipe(
          timeout(timeoutMs),
          defaultIfEmpty({ success: false } satisfies OrderDetailResponse),
          catchError((error) => {
            throw error;
          }),
        ),
      )) as OrderDetailResponse;

      if (!result?.success || !result.data) {
        return null;
      }

      return result.data;
    } catch (error) {
      this.logger.warn(`Order number lookup failed (${error?.message ?? error})`);
      return null;
    }
  }

  private async fetchOrders(userId: string, limit = 5): Promise<OrderListResponse | null> {
    try {
      const timeoutMs = Number(this.configService.get<string | number>('CORE_ORDER_TIMEOUT_MS', 3_000));
      const result = (await firstValueFrom(
        this.coreClient.send({ cmd: 'order_list' }, { userId, page: 1, limit }).pipe(
          timeout(timeoutMs),
          defaultIfEmpty({ success: false } satisfies OrderListResponse),
          catchError((error) => {
            throw error;
          }),
        ),
      )) as OrderListResponse;

      return result;
    } catch (error) {
      this.logger.warn(`Order list lookup failed (${error?.message ?? error})`);
      return null;
    }
  }

  private async searchCatalog(term: string, limit = 4): Promise<CatalogSearchResponse | null> {
    try {
      const timeoutMs = Number(this.configService.get<string | number>('CORE_CATALOG_TIMEOUT_MS', 3_000));
      const result = (await firstValueFrom(
        this.coreClient.send({ cmd: 'catalog_search' }, { term, limit }).pipe(
          timeout(timeoutMs),
          defaultIfEmpty({ success: false, term, matches: [] } satisfies CatalogSearchResponse),
          catchError((error) => {
            throw error;
          }),
        ),
      )) as CatalogSearchResponse;

      return result;
    } catch (error) {
      this.logger.warn(`Catalog query failed during recommendations (${error?.message ?? error})`);
      return null;
    }
  }

  private formatOrderDetail(order: OrderDetail): string {
    const createdAt = this.formatDate(order.createdAt);
    const items = (order.items || []).slice(0, 5).map((item, index) => {
      const itemName = (item.productNameSi || item.productName || '').trim() || 'නම නොමැති නිෂ්පාදනය';
      return `${index + 1}. ${itemName} x${item.quantity} - ${this.formatPrice(item.totalPrice)}`;
    });

    return [
      '### අවසන් ඇණවුමේ විස්තර',
      `- **Order No:** ${order.orderNumber}`,
      `- **දිනය:** ${createdAt}`,
      `- **තත්වය:** ${this.formatOrderStatus(order.status)}`,
      `- **මුළු මුදල:** ${this.formatPrice(order.total)}`,
      `- **භාණ්ඩ ගණන:** ${order.itemCount}`,
      '### අයිතම',
      ...(items.length > 0 ? items : ['- අයිතම නොමැත']),
    ].join('\n');
  }

  private formatDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toLocaleString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private formatOrderStatus(status: string): string {
    const normalized = (status || '').toLowerCase();
    if (normalized === 'pending') return 'Pending';
    if (normalized === 'confirmed') return 'Confirmed';
    if (normalized === 'processing') return 'Processing';
    if (normalized === 'shipped') return 'Shipped';
    if (normalized === 'delivered') return 'Delivered';
    if (normalized === 'cancelled') return 'Cancelled';
    return status || 'Unknown';
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

  private isOrderStyleQuestion(text: string): boolean {
    const normalized = normalizeCatalogQuery(text);
    const orderTerms = [
      'order',
      'orders',
      'ඔර්ඩර්',
      'ඕඩර්',
      'ඇණවුම',
      'ඇණවුම්',
      'order history',
      'last order',
      'අවසන්',
      'විස්තර',
    ];
    return orderTerms.some((term) => normalized.includes(term));
  }

  private isRecommendationStyleQuestion(text: string): boolean {
    const normalized = normalizeCatalogQuery(text);
    const recommendationTerms = [
      'recommend',
      'recommendation',
      'suggest',
      'suggestion',
      'නිර්දේශ',
      'යෝජනා',
      'මොනවා ගන්න',
      'what should i buy',
    ];
    return recommendationTerms.some((term) => normalized.includes(term));
  }

  private extractOrderNumber(text: string): string | null {
    const match = text.match(/(ORD[-\s]?\d{8}[-\s]?[A-Za-z0-9]{4,10})/i);
    if (!match?.[1]) {
      return null;
    }

    const compact = match[1].replace(/\s+/g, '').toUpperCase();
    const normalized = compact.includes('-') ? compact : compact.replace(/^ORD(\d{8})([A-Z0-9]{4,10})$/, 'ORD-$1-$2');
    return normalized;
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
