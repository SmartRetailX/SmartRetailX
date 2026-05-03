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

    const isCatalogIntent = context.intent === 'prices' || context.intent === 'product_search';
    const hasExplicitCatalogSignal = this.hasExplicitCatalogSignal(queryText);
    const hasCatalogEntitySignal = this.hasCatalogEntitySignal(queryText);
    const productEntity =
      typeof context.entities?.product === 'string' ? context.entities.product.trim() : '';
    const hasProductEntity = productEntity.length > 0;
    const isCatalogQuestion = isCatalogIntent || hasExplicitCatalogSignal || hasCatalogEntitySignal || hasProductEntity;

    if (mode === 'primary' && !isCatalogQuestion) {
      return null;
    }

    if (mode !== 'primary' && mode !== 'fallback' && mode !== 'recovery') {
      return null;
    }

    const catalogResponse = await this.tryCatalogResponse(queryText, context.language, context.sessionId, context.entities);
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
    entities?: Record<string, unknown>,
  ): Promise<VoiceChatResponseDto | null> {
    const queryText = transcriptText?.trim();
    if (!queryText) {
      return null;
    }

    let result: CatalogSearchResponse | null = null;
    const queryVariants = this.buildCatalogSearchQueries(queryText);
    const collectedMatches: CatalogSearchRaw[] = [];
    for (const queryVariant of queryVariants) {
      result = await this.searchCatalog(queryVariant, 8);
      if (result?.success && Array.isArray(result.matches) && result.matches.length > 0) {
        collectedMatches.push(...result.matches);
      }
    }

    const mergedMatches = this.mergeCatalogMatches(collectedMatches);
    if ((!result?.success && mergedMatches.length === 0) || mergedMatches.length === 0) {
      return null;
    }

    const scoredMatches = this.scoreCatalogMatches(queryText, mergedMatches, queryVariants);
    const selectedMatches = this.selectCatalogMatches(queryText, scoredMatches);
    if (selectedMatches.length === 0) {
      return null;
    }

    if (this.shouldClarifyCatalogMatch(selectedMatches)) {
      return {
        success: true,
        transcription: queryText,
        response: this.buildCatalogClarificationResponse(selectedMatches),
        language,
        sessionId,
        messages: [],
        intent: 'product_search',
        entities,
        explainability: this.buildCatalogExplainability(queryText, selectedMatches),
        model: 'core-catalog-clarification',
      };
    }

    return {
      success: true,
      transcription: queryText,
      response: this.buildCatalogResponse(selectedMatches),
      language,
      sessionId,
      messages: [],
      intent: 'product_search',
      entities,
      explainability: this.buildCatalogExplainability(queryText, selectedMatches),
      model: 'core-catalog',
    };
  }

  private buildCatalogSearchQueries(queryText: string): string[] {
    const normalized = normalizeCatalogQuery(queryText);
    const tokens = buildCatalogQueryTokens(normalized);
    const synonyms = new Map<string, string>([
      ['ෂැම්පු', 'shampoo'],
      ['ශැම්පු', 'shampoo'],
      ['shamppo', 'shampoo'],
      ['ශැම්පෝ', 'shampoo'],
      ['බිස්කට්', 'biscuit'],
      ['බිස්කට්ස්', 'biscuits'],
      ['biscut', 'biscuit'],
      ['biscuts', 'biscuits'],
      ['cheeze', 'cheese'],
      ['chese', 'cheese'],
      ['cheezy', 'cheese'],
      ['spred', 'spread'],
      ['කොත්මලේ', 'kotmale'],
      ['චීස්', 'cheese'],
      ['ස්ප්‍රෙඩ්', 'spread'],
      ['ජෑම්', 'jam'],
      ['කිරි', 'milk'],
      ['crm', 'cream'],
      ['crem', 'cream'],
      ['icecrm', 'ice cream'],
      ['icecrem', 'ice cream'],
      ['icecram', 'ice cream'],
      ['aice', 'ice'],
    ]);

    const variants: string[] = [queryText.trim()];
    const normalizedWithPhraseFixes = normalized
      .replace(/\bice\s*crm\b/g, 'ice cream')
      .replace(/\bice\s*crem\b/g, 'ice cream')
      .replace(/\bice\s*cram\b/g, 'ice cream');
    if (normalizedWithPhraseFixes && normalizedWithPhraseFixes !== normalized) {
      variants.push(normalizedWithPhraseFixes);
    }

    if (tokens.length > 0) {
      const normalizedTokens = tokens.map((token) => synonyms.get(token) ?? token);
      variants.push(tokens.join(' '));
      variants.push(normalizedTokens.join(' '));

      for (const phrase of this.buildTokenPhrases(tokens)) {
        variants.push(phrase);
      }

      for (const phrase of this.buildTokenPhrases(normalizedTokens)) {
        variants.push(phrase);
      }

      for (const token of tokens) {
        const mapped = synonyms.get(token);
        if (mapped) {
          variants.push(mapped);
        }

        const transliterated = this.transliterateSinhalaToken(token);
        if (transliterated) {
          variants.push(transliterated);
        }
      }
    }

    const seen = new Set<string>();
    return variants
      .map((variant) => variant.trim())
      .filter((variant) => {
        if (!variant) {
          return false;
        }

        const key = normalizeCatalogQuery(variant);
        if (!key || seen.has(key)) {
          return false;
        }

        seen.add(key);
        return true;
      });
  }

  private mergeCatalogMatches(matches: CatalogSearchRaw[]): CatalogSearchRaw[] {
    const byProductId = new Map<string, CatalogSearchRaw>();
    for (const match of matches) {
      const key = (match.productId || match.sku || '').trim();
      if (!key) {
        continue;
      }
      if (!byProductId.has(key)) {
        byProductId.set(key, match);
      }
    }

    return Array.from(byProductId.values()).slice(0, 20);
  }

  private transliterateSinhalaToken(token: string): string {
    const direct: Record<string, string> = {
      'ෂැම්පු': 'shampoo',
      'ශැම්පු': 'shampoo',
      'ශැම්පෝ': 'shampoo',
      'බිස්කට්': 'biscuit',
      'බිස්කට්ස්': 'biscuits',
      'චොකලට්': 'chocolate',
      'සෝප්': 'soap',
      'සබන්': 'soap',
      'නූඩ්ල්ස්': 'noodles',
      'කෝක්': 'coke',
      'කොකාකෝලා': 'coca cola',
      'කොත්මලේ': 'kotmale',
      'චීස්': 'cheese',
      'ස්ප්‍රෙඩ්': 'spread',
      'ජෑම්': 'jam',
      'කිරි': 'milk',
    };

    return direct[token] || '';
  }

  private buildTokenPhrases(tokens: string[]): string[] {
    const phrases: string[] = [];
    const uniqueTokens = tokens.filter((token, index) => token && tokens.indexOf(token) === index);
    const maxLength = Math.min(uniqueTokens.length, 5);

    for (let length = maxLength; length >= 2; length -= 1) {
      for (let start = 0; start <= uniqueTokens.length - length; start += 1) {
        phrases.push(uniqueTokens.slice(start, start + length).join(' '));
      }
    }

    return phrases;
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
      'වර්ග',
      'වර්ගය',
      'කාණ්ඩ',
      'කාණ්ඩය',
      'product',
      'products',
      'type',
      'types',
      'category',
      'categories',
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
      'ලබා ගත හැකි',
      'ලබා ගත හැකිද',
      'ලබාගත හැකි',
      'ලබාගත හැකිද',
      'ගන්න පුලුවන්ද',
      'ගන්න පුළුවන්ද',
      'in stock',
    ];

    return catalogTerms.some((term) => normalized.includes(term));
  }

  private hasCatalogEntitySignal(text: string): boolean {
    const normalized = normalizeCatalogQuery(text);
    if (!normalized) {
      return false;
    }

    if (/^(hi|hello|hey|helo|හායි|හලෝ|හෙලෝ|හෙලො)$/u.test(normalized)) {
      return false;
    }

    const tokens = buildCatalogQueryTokens(normalized);
    if (tokens.length === 0 || tokens.length > 5) {
      return false;
    }

    const detailIntentPatterns = [
      /ගැන\s+(විස්තර|දැනගන්න|තොරතුරු)/u,
      /(විස්තර|තොරතුරු)\s+(දෙන්න|ඕන|අවශ්‍යයි)/u,
      /\b(details?|info|information)\b/u,
    ];

    return detailIntentPatterns.some((pattern) => pattern.test(normalized));
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

  formatProductMarkdownLink(product: CatalogSearchRaw): string {
    const label = this.escapeMarkdownLinkLabel(this.getDisplayName(product) || product.sku || product.productId);
    return `[${label}](/products/${encodeURIComponent(product.productId)})`;
  }

  private scoreCatalogMatches(
    queryText: string,
    rawMatches: CatalogSearchRaw[],
    queryVariants: string[] = [],
  ): CatalogSearchMatch[] {
    const normalized = normalizeCatalogQuery(queryText);
    const queryTokens = buildCatalogQueryTokens(normalized);
    const normalizedVariants = Array.from(new Set(queryVariants.map((variant) => normalizeCatalogQuery(variant))));
    const scoringTexts = [normalized, ...normalizedVariants].filter(Boolean);

    return rawMatches.map((raw) => {
      const nameLower = (raw.name || '').toLowerCase();
      const nameSiLower = (raw.nameSi || '').toLowerCase();
      const catLower = (raw.category || '').toLowerCase();
      const catSiLower = (raw.categoryNameSi || '').toLowerCase();
      const skuLower = (raw.sku || '').toLowerCase();
      const brandLower = (raw.brand || '').toLowerCase();

      const searchable = [nameLower, nameSiLower, brandLower, catLower, catSiLower, skuLower];
      const normalizedSearchable = [
        normalizeCatalogQuery(raw.name || ''),
        normalizeCatalogQuery(raw.nameSi || ''),
        normalizeCatalogQuery(raw.brand || ''),
        normalizeCatalogQuery(raw.category || ''),
        normalizeCatalogQuery(raw.categoryNameSi || ''),
        normalizeCatalogQuery(raw.sku || ''),
      ];

      const exactHit = scoringTexts.some((text) => nameLower === text || nameSiLower === text || skuLower === text);
      const prefixHit = scoringTexts.some((text) => nameLower.startsWith(text) || nameSiLower.startsWith(text));
      const phraseHit = normalizedSearchable.some((field) =>
        scoringTexts.some((text) => Boolean(text && field.includes(text))),
      );

      const variantTokens = normalizedVariants.flatMap((variant) => buildCatalogQueryTokens(variant));
      const matchedTokens = Array.from(new Set([...queryTokens, ...variantTokens])).filter((token) =>
        searchable.some((field) => field.includes(token)),
      );
      const tokenHits = matchedTokens.length;

      let matchScore = 0;
      if (exactHit) matchScore = 100;
      else if (prefixHit) matchScore = 88;
      else if (phraseHit) matchScore = 84;
      else if (queryTokens.length > 0) matchScore = Math.round((tokenHits / queryTokens.length) * 82);

      const fuzzyScore = this.computeFuzzyNameScore(normalized, raw);
      matchScore = Math.max(matchScore, fuzzyScore);

      return {
        ...raw,
        tokenHits,
        matchedTokens,
        exactHit,
        prefixHit,
        phraseHit,
        matchScore,
      };
    });
  }

  private computeFuzzyNameScore(normalizedQuery: string, product: CatalogSearchRaw): number {
    const name = normalizeCatalogQuery(product.name || '');
    const nameSi = normalizeCatalogQuery(product.nameSi || '');
    const brand = normalizeCatalogQuery(product.brand || '');
    const fields = [name, nameSi, brand].filter(Boolean);
    if (fields.length === 0) {
      return 0;
    }

    const queryTokens = buildCatalogQueryTokens(normalizedQuery);
    const candidateQueries = [normalizedQuery, ...queryTokens].filter(Boolean);
    let best = 0;
    for (const candidate of candidateQueries) {
      for (const field of fields) {
        best = Math.max(best, this.diceCoefficient(candidate, field));
      }
    }

    // Mild boost when query has latin-ish typo and candidate has direct token overlap.
    const hasLatin = /[a-z]/.test(normalizedQuery);
    if (hasLatin && queryTokens.some((token) => fields.some((field) => field.includes(token.slice(0, Math.max(3, token.length - 1)))))) {
      best = Math.max(best, best + 0.08);
    }

    const similarity = Math.min(1, best);
    return Math.round(similarity * 100);
  }

  private diceCoefficient(a: string, b: string): number {
    if (!a || !b) {
      return 0;
    }
    if (a === b) {
      return 1;
    }
    if (a.length < 2 || b.length < 2) {
      return 0;
    }

    const aBigrams = new Map<string, number>();
    for (let i = 0; i < a.length - 1; i += 1) {
      const gram = a.slice(i, i + 2);
      aBigrams.set(gram, (aBigrams.get(gram) || 0) + 1);
    }

    let intersection = 0;
    for (let i = 0; i < b.length - 1; i += 1) {
      const gram = b.slice(i, i + 2);
      const count = aBigrams.get(gram) || 0;
      if (count > 0) {
        aBigrams.set(gram, count - 1);
        intersection += 1;
      }
    }

    return (2 * intersection) / (a.length + b.length - 2);
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
    const fullTokenCoverage = queryTokens.length >= 2 && top.tokenHits === queryTokens.length;
    const hasStrongTop = top.exactHit || top.prefixHit || top.phraseHit || fullTokenCoverage || top.matchScore >= 90;
    const clearLead = !second || top.matchScore - second.matchScore >= 16 || top.tokenHits > second.tokenHits;

    if (hasStrongTop && clearLead) {
      return [top];
    }

    return relevantMatches.slice(0, 3);
  }

  private shouldClarifyCatalogMatch(matches: CatalogSearchMatch[]): boolean {
    if (matches.length < 2) {
      return false;
    }

    const [top, second] = matches;
    const tooClose = top.matchScore - second.matchScore <= 8;
    const mediumConfidence = top.matchScore >= 50 && top.matchScore < 78;
    return tooClose || mediumConfidence;
  }

  private buildCatalogClarificationResponse(matches: CatalogSearchMatch[]): string {
    const topMatches = matches.slice(0, 3);
    const options = topMatches
      .map((product, index) =>
        [
          `| ${index + 1}`,
          this.formatProductMarkdownLink(product),
          this.formatPrice(product.price),
          this.formatStockLabel(product.currentStock),
          this.getDisplayCategory(product),
        ].join(' | ') + ' |',
      )
      .join('\n');

    return [
      '### ඔබ අදහස් කළ භාණ්ඩය මේවා අතරද?',
      '',
      this.buildCatalogChoiceExplanation(topMatches),
      '',
      '| # | භාණ්ඩය | මිල | තොගය | වර්ගය |',
      '| ---: | --- | ---: | --- | --- |',
      options,
      '',
      '_අංකය කියන්න, මම නිවැරදි භාණ්ඩයේ විස්තර දෙන්නම්._',
    ].join('\n');
  }

  private isConfidentCatalogMatch(match: CatalogSearchMatch, queryTokens: string[]): boolean {
    if (match.exactHit || match.prefixHit || match.phraseHit) {
      return true;
    }

    if (match.matchScore >= 78) {
      return true;
    }

    if (match.matchScore >= 62 && queryTokens.length <= 3 && match.tokenHits >= 1) {
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

    const lines = topMatches.map((product, index) => this.formatCatalogTableRow(product, index + 1));

    return [
      '### ගැලපෙන නිෂ්පාදන',
      '',
      this.buildCatalogChoiceExplanation(topMatches),
      '',
      '| # | භාණ්ඩය | මිල | තොගය | වර්ගය | ගැලපුනේ |',
      '| ---: | --- | ---: | --- | --- | --- |',
      ...lines,
      '',
      '_තවත් නිවැරදි ප්‍රතිඵල සඳහා වෙළඳ නාමය හෝ ප්‍රභේදය සඳහන් කරන්න._',
    ].join('\n');
  }

  private buildCatalogExplainability(queryText: string, matches: CatalogSearchMatch[]) {
    const top = matches[0];
    const confidence = top ? Math.min(0.99, Math.max(0.45, top.matchScore / 100)) : 0.45;
    return {
      source: 'db-catalog' as const,
      confidence,
      rationale: `Catalog search used the cleaned query "${queryText}" and ranked active products by name, Sinhala name, sku, brand, category, token coverage, and stock.`,
      features: matches.slice(0, 3).map((product) => ({
        name: this.getDisplayName(product),
        weight: product.matchScore,
        evidence: `${this.formatMatchReason(product)}; ${this.formatPrice(product.price)}; ${this.formatStockLabel(product.currentStock)}`,
      })),
    };
  }

  private formatSingleCatalogMatch(product: CatalogSearchMatch): string {
    return [
      '### නිෂ්පාදන තොරතුරු',
      '',
      '| Field | Details |',
      '| --- | --- |',
      `| භාණ්ඩය | ${this.formatProductMarkdownLink(product)} |`,
      `| වර්ගය | ${this.formatMarkdownCell(this.getDisplayCategory(product))} |`,
      `| මිල | ${this.formatMarkdownCell(this.formatPrice(product.price))} |`,
      `| තොගය | ${this.formatMarkdownCell(this.formatStockLabel(product.currentStock))} |`,
      `| ගැලපුනේ | ${this.formatMarkdownCell(this.formatCustomerMatchReason(product))} |`,
    ].join('\n');
  }

  private formatCatalogTableRow(product: CatalogSearchMatch, rank: number): string {
    return [
      `| ${rank}`,
      this.formatProductMarkdownLink(product),
      this.formatPrice(product.price),
      this.formatStockLabel(product.currentStock),
      this.getDisplayCategory(product),
      this.formatCustomerMatchReason(product),
    ]
      .map((cell) => this.formatMarkdownCell(cell))
      .join(' | ') + ' |';
  }

  private buildCatalogChoiceExplanation(matches: CatalogSearchMatch[]): string {
    if (matches.length === 0) {
      return '';
    }

    const lowestPrice = matches.reduce((best, product) => (product.price < best.price ? product : best), matches[0]);
    const bestStock = matches.reduce(
      (best, product) => (product.currentStock > best.currentStock ? product : best),
      matches[0],
    );
    const top = matches[0];
    const allSameStock = matches.every((product) => product.currentStock === top.currentStock);
    const allSameCategory = matches.every((product) => this.getDisplayCategory(product) === this.getDisplayCategory(top));
    const cheapestIsTop = lowestPrice.productId === top.productId;
    const bestStockIsTop = bestStock.productId === top.productId;
    const priceRange =
      matches.length > 1
        ? `${this.formatPrice(Math.min(...matches.map((product) => product.price)))} - ${this.formatPrice(
            Math.max(...matches.map((product) => product.price)),
          )}`
        : this.formatPrice(top.price);

    const lines = [
      cheapestIsTop
        ? `ඔබ කියූ නමට හොඳින්ම ගැළපෙන අතර අඩුම මිලත් "${this.getDisplayName(top)}" (${this.formatPrice(top.price)}) එකටයි.`
        : `නමට ගැළපීම අනුව "${this.getDisplayName(top)}" ඉදිරියෙන් තියෙනවා; අඩුම මිල නම් "${this.getDisplayName(
            lowestPrice,
          )}" (${this.formatPrice(lowestPrice.price)}).`,
    ];

    if (allSameStock) {
      lines.push(`මේ තුනෙම තොග තත්ත්වය එක වගේ (${this.formatStockLabel(top.currentStock)}), ඒ නිසා මිල සහ ප්‍රමාණය බලලා තෝරගන්න.`);
    } else if (bestStockIsTop) {
      lines.push(`තොගයත් වැඩියෙන් තියෙන්නේ පළමු item එකටයි (${this.formatStockLabel(top.currentStock)}).`);
    } else {
      lines.push(`තොගය වැඩියෙන් අවශ්‍ය නම් "${this.getDisplayName(bestStock)}" (${this.formatStockLabel(bestStock.currentStock)}) බලන්න.`);
    }

    lines.push(
      allSameCategory
        ? `සියල්ලම ${this.getDisplayCategory(top)} කාණ්ඩයේ; මිල පරාසය ${priceRange}.`
        : `කාණ්ඩ කිහිපයක ප්‍රතිඵල තියෙනවා; මිල පරාසය ${priceRange}.`,
    );

    return lines.join(' ');
  }

  private formatCustomerMatchReason(product: CatalogSearchMatch): string {
    if (product.exactHit) {
      return 'නම සම්පූර්ණයෙන් ගැළපුණා';
    }

    if (product.phraseHit || product.prefixHit) {
      return 'නම/sku එක query එකට ගැළපුණා';
    }

    const terms = product.matchedTokens.slice(0, 4).join(', ');
    return terms ? `ගැළපුණු වචන: ${terms}` : 'හොඳම catalog ගැළපීම';
  }

  private formatMatchReason(product: CatalogSearchMatch): string {
    if (product.exactHit) {
      return 'නම සම්පූර්ණයෙන් ගැළපුණා';
    }

    if (product.phraseHit || product.prefixHit) {
      return 'නිෂ්පාදන නම/sku එක query එකට ගැළපුණා';
    }

    const terms = product.matchedTokens.slice(0, 4).join(', ');
    return terms ? `සෙවූ වචන ගැළපුණා: ${terms}` : 'catalog ranking අනුව හොඳම ගැළපීම';
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
        'සමාවෙන්න, ඔබ සෙවූ භාණ්ඩය දැනට අපගේ වෙළඳසලෙහි නැත.',
        'තවදුරටත් තහවුරු කර ගැනීමට කාර්ය මණ්ඩලයේ කෙනෙකුගෙන් විමසන්න.',
        'වෙනත් brand එකක් හෝ වෙනස් නමක් භාවිතා කර නැවත සෙවිය හැක.',
      ].join(' '),
      language,
      sessionId,
      messages: [],
      intent: 'product_search',
      explainability: {
        source: 'db-catalog',
        confidence: 0.55,
        rationale: `Catalog search checked active products for "${queryText}" but found no confident match.`,
        features: [{ name: 'catalog_match_count', weight: 0, evidence: 'No active product matched the query tokens confidently.' }],
      },
      model: 'core-catalog-unavailable',
    };
  }

  private getDisplayCategory(product: CatalogSearchRaw): string {
    return (product.categoryNameSi || product.category || 'N/A').trim() || 'N/A';
  }

  private escapeMarkdownLinkLabel(value: string): string {
    return value.replace(/\\/g, '\\\\').replace(/\]/g, '\\]').replace(/\n/g, ' ').trim();
  }

  private formatMarkdownCell(value: string | number): string {
    return String(value ?? 'N/A').replace(/\|/g, '\\|').replace(/\n/g, ' ').trim() || 'N/A';
  }
}
