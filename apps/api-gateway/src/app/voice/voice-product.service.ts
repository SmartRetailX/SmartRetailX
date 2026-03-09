import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ConfigService } from '@smart-retail-x/config';
import {
  buildCatalogQueryTokens,
  normalizeCatalogQuery,
  type VoiceChatResponseDto,
  type VoiceChatTcpPayload,
} from '@smart-retail-x/shared-types';
import { catchError, defaultIfEmpty, firstValueFrom, timeout } from 'rxjs';

import {
  type VoiceCapability,
  type VoiceCapabilityContext,
  type VoiceCapabilityMode,
} from './voice-capability.interface';
import { type CatalogSearchMatch, type CatalogSearchRaw, type CatalogSearchResponse } from './voice.types';

@Injectable()
export class VoiceProductService implements VoiceCapability {
  private readonly logger = new Logger(VoiceProductService.name);
  readonly id = 'product';
  readonly priority = 40;

  constructor(
    @Inject('CORE_SERVICE') private readonly coreClient: ClientProxy,
    private readonly configService: ConfigService,
  ) {}

  async handle(context: VoiceCapabilityContext, mode: VoiceCapabilityMode): Promise<VoiceChatResponseDto | null> {
    const queryText = context.transcriptText?.trim();
    if (!queryText) {
      return null;
    }

    if (this.isOfferStyleQuestion(queryText)) {
      return null;
    }

    const isCatalogQuestion = this.isCatalogStyleQuestion(queryText);
    const hasExplicitCatalogSignal = this.hasExplicitCatalogSignal(queryText);

    if (mode === 'primary' && !isCatalogQuestion) {
      return null;
    }

    if (mode !== 'primary' && mode !== 'fallback' && mode !== 'recovery') {
      return null;
    }

    const catalogResponse = await this.tryCatalogResponse(queryText, context.language, context.sessionId);
    if (catalogResponse) {
      return catalogResponse;
    }

    // For clear product/catalog questions, return a deterministic no-match message
    // instead of falling through to generic agent output.
    if (isCatalogQuestion && hasExplicitCatalogSignal) {
      return this.buildCatalogUnavailableResponse(queryText, context.language, context.sessionId);
    }

    return null;
  }

  async tryCatalogResponse(
    transcriptText: string | undefined,
    language: VoiceChatTcpPayload['language'],
    sessionId: string,
  ): Promise<VoiceChatResponseDto | null> {
    const queryText = transcriptText?.trim();
    if (!queryText) {
      return null;
    }

    const result = await this.searchCatalog(queryText, 3);
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
  }

  async searchCatalog(term: string, limit = 4): Promise<CatalogSearchResponse | null> {
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
      this.logger.warn(`Catalog query failed (${error?.message ?? error})`);
      return null;
    }
  }

  isCatalogStyleQuestion(text: string | undefined): boolean {
    const normalized = normalizeCatalogQuery(text || '');
    if (!normalized) {
      return false;
    }

    if (this.hasExplicitCatalogSignal(normalized)) {
      return true;
    }

    return buildCatalogQueryTokens(normalized).length > 0;
  }

  private isOfferStyleQuestion(text: string | undefined): boolean {
    const normalized = normalizeCatalogQuery(text || '');
    if (!normalized) {
      return false;
    }

    const offerTerms = [
      'offer',
      'offers',
      'promo',
      'promos',
      'promotion',
      'promotions',
      'discount',
      'sale',
      'sales',
      'deals',
      'special price',
      'coupon',
      'coupons',
      'වට්ටම්',
      'ප්රවර්ධන',
      'ප්‍රවර්ධන',
      'ප්‍රොමෝ',
      'ප්රොමෝ',
      'දීමනා',
      'offer එක',
      'offers තියෙනවද',
      'ඔෆර්',
      'ඔෆර්ස්',
      'ඔෆර් එක',
      'ඔෆර්ස් තියෙනවද',
      'ඔපර්',
      'ඔපර්ස්',
      'ඔපර් එක',
      'ඔපර්ස් තියෙනවද',
      'ඔෆස්',
      'ඔෆස් තියෙනවද',
      'discount items',
      'current offers',
      'current promotions',
      'promotion list',
    ];

    if (offerTerms.some((term) => normalized.includes(term))) {
      return true;
    }

    const offerPatterns = [
      /\boffer?s?\b/,
      /\bpromo(?:s|tion|tions)?\b/,
      /\bdiscounts?\b/,
      /\bdeals?\b/,
      /\bcoupons?\b/,
      /\bsales?\b/,
      /ඔ[ෆප](?:ර්|ර)?(?:ස්)?/,
      /වට්ටම්/,
      /ප්.?රවර්ධන/,
      /දීමනා/,
    ];

    return offerPatterns.some((pattern) => pattern.test(normalized));
  }

  private hasExplicitCatalogSignal(text: string): boolean {
    const normalized = normalizeCatalogQuery(text);
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
      'stock',
      'available',
      'show',
      'find',
      'search',
      'තියෙනවද',
      'තියෙනවාද',
      'තියෙන්නෙ',
      'හොයන්න',
    ];

    return catalogTerms.some((term) => normalized.includes(term));
  }

  formatPrice(price: number): string {
    return `රු. ${Number(price).toFixed(2)}`;
  }

  formatStockLabel(stock: number): string {
    return stock > 0 ? `${stock} ක් ඇත` : 'තොග නැත';
  }

  getDisplayName(product: CatalogSearchRaw): string {
    return (product.nameSi || product.name || '').trim();
  }

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

  private buildCatalogUnavailableResponse(
    queryText: string,
    language: VoiceChatTcpPayload['language'],
    sessionId: string,
  ): VoiceChatResponseDto {
    return {
      success: true,
      transcription: queryText,
      response: [
        'සමාවෙන්න, ඔබ සෙවූ භාණ්ඩය දැනට අපගේ අප වෙළදසලෙහි නැත.',
        'තවදුරටත් තහවුරු කර ගැනීමට කාර්ය මණ්ඩලයේ කෙනෙකුගෙන් විමසන්න.',
        'වෙනත් brand එකක් හෝ වෙනස් නමක් භාවිතා කර නැවත සෙවිය හැක.',
      ].join(' '),
      language,
      sessionId,
      messages: [],
      model: 'core-catalog-unavailable',
    };
  }

  private getDisplayCategory(product: CatalogSearchRaw): string {
    return (product.categorySi || product.category || 'N/A').trim() || 'N/A';
  }
}
