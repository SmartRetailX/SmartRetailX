import { Injectable } from '@nestjs/common';
import { normalizeCatalogQuery, type VoiceChatResponseDto, type VoiceChatTcpPayload } from '@smart-retail-x/shared-types';

import {
  type VoiceCapability,
  type VoiceCapabilityContext,
  type VoiceCapabilityMode,
} from './voice-capability.interface';
import { type ActivePromotionItem, VoiceOfferService } from './voice-offer.service';
import { VoiceOrderService } from './voice-order.service';
import { VoiceProductService } from './voice-product.service';
import { type CatalogSearchRaw } from './voice.types';

type RecommendationSeedItem = {
  productId: string;
  productName: string;
  productNameSi: string | null;
  totalQuantity: number;
  orderHits: number;
};

@Injectable()
export class VoiceRecommendationService implements VoiceCapability {
  readonly id = 'recommendation';
  readonly priority = 10;

  constructor(
    private readonly voiceOrderService: VoiceOrderService,
    private readonly voiceProductService: VoiceProductService,
    private readonly voiceOfferService: VoiceOfferService,
  ) {}

  async handle(context: VoiceCapabilityContext, mode: VoiceCapabilityMode): Promise<VoiceChatResponseDto | null> {
    if (mode !== 'primary' && mode !== 'fallback') {
      return null;
    }

    return await this.tryRecommendationResponse(context.transcriptText, context.language, context.sessionId, context.userId);
  }

  async tryRecommendationResponse(
    transcriptText: string | undefined,
    language: VoiceChatTcpPayload['language'],
    sessionId: string,
    userId: string,
  ): Promise<VoiceChatResponseDto | null> {
    const queryText = transcriptText?.trim();
    if (!queryText || !this.isRecommendationStyleQuestion(queryText)) {
      return null;
    }

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

  private async buildRecommendationsFromLastOrder(userId: string): Promise<string | null> {
    const recentOrders = await this.voiceOrderService.getRecentOrdersForUser(userId, 4);
    if (!recentOrders.length) {
      return 'නිර්දේශ ලබා දීමට ඔබගේ පෙර ඇණවුම් දත්ත හමු නොවුණා.';
    }

    const latestOrder = recentOrders[0];
    const aggregatedItems = this.aggregateRecentOrderItems(recentOrders);
    if (!aggregatedItems.length) {
      return 'නිර්දේශ ලබා දීමට ඔබගේ පෙර ඇණවුම් දත්ත හමු නොවුණා.';
    }

    const topItems = aggregatedItems.slice(0, 12);

    const recentProducts = await this.resolveRecentOrderProducts(topItems);
    const topRecentProducts = recentProducts.slice(0, 5);
    const productLines = topRecentProducts.map((product, index) => this.formatRecommendationLine(product, index + 1));

    const pickedProductIds = new Set(recentProducts.map((product) => product.productId));
    const categoryLines = await this.buildCategoryExpansionLines(recentProducts, pickedProductIds, 6);
    const offerLines = await this.buildOfferRecommendationLines(
      topItems.map((item) => item.productNameSi || item.productName || ''),
      recentProducts,
    );

    if (productLines.length === 0 && categoryLines.length === 0 && offerLines.length === 0) {
      return 'ඔබගේ අවසන් ඇණවුම අනුව නිර්දේශ සකස් කළා, නමුත් දැනට ගැලපෙන stock items හමු නොවුණා.';
    }

    const sections = [
      '**ඔබට නිර්දේශිත ලැයිස්තුව**',
      `_මූලාශ්‍රය: ඔබගේ මෑත ඇණවුම් ${recentOrders.length} (${latestOrder?.orderNumber || 'N/A'} latest)_`,
    ];

    if (productLines.length > 0) {
      sections.push('', '**නැවත මිලදී ගත හැකි items**', ...productLines);
    }

    if (categoryLines.length > 0) {
      sections.push('', '**කාණ්ඩය අනුව තවත් නිර්දේශ**', ...categoryLines);
    }

    if (offerLines.length > 0) {
      sections.push('', '**ඔබට අදාල available offers**', ...offerLines);
    }

    sections.push('', '_අවශ්‍ය නම් මේ ලැයිස්තුවෙන් items cart එකට දාන්න කියන්න._');

    return sections.join('\n');
  }

  private formatRecommendationLine(product: CatalogSearchRaw, rank: number): string {
    return [
      `${rank}) ${this.voiceProductService.getDisplayName(product)}`,
      `   මිල: ${this.voiceProductService.formatPrice(product.price)}`,
      `   තොගය: ${this.voiceProductService.formatStockLabel(product.currentStock)}`,
    ].join('\n');
  }

  private aggregateRecentOrderItems(
    recentOrders: Array<{ items: Array<{ productId: string; productName: string; productNameSi: string | null; quantity: number }> }>,
  ): RecommendationSeedItem[] {
    const bucket = new Map<string, RecommendationSeedItem>();

    for (const order of recentOrders) {
      for (const item of order.items || []) {
        const key = item.productId || normalizeCatalogQuery(item.productNameSi || item.productName || '');
        if (!key) {
          continue;
        }

        const existing = bucket.get(key);
        if (!existing) {
          bucket.set(key, {
            productId: item.productId,
            productName: item.productName,
            productNameSi: item.productNameSi,
            totalQuantity: Math.max(0, Number(item.quantity) || 0),
            orderHits: 1,
          });
          continue;
        }

        existing.totalQuantity += Math.max(0, Number(item.quantity) || 0);
        existing.orderHits += 1;
      }
    }

    return Array.from(bucket.values()).sort((a, b) => {
      if (b.orderHits !== a.orderHits) {
        return b.orderHits - a.orderHits;
      }
      return b.totalQuantity - a.totalQuantity;
    });
  }

  private async resolveRecentOrderProducts(
    topItems: RecommendationSeedItem[],
  ): Promise<CatalogSearchRaw[]> {
    const matches = await Promise.all(
      topItems.map(async (item) => {
        const searchTerm = (item.productNameSi || item.productName || '').trim();
        if (!searchTerm) {
          return null;
        }

        const catalog = await this.voiceProductService.searchCatalog(searchTerm, 4);
        if (!catalog?.success || !Array.isArray(catalog.matches) || catalog.matches.length === 0) {
          return null;
        }

        return catalog.matches.find((match) => match.productId === item.productId) || catalog.matches[0] || null;
      }),
    );

    const dedup = new Map<string, CatalogSearchRaw>();
    for (const match of matches) {
      if (!match) {
        continue;
      }
      if (!dedup.has(match.productId)) {
        dedup.set(match.productId, match);
      }
    }

    return Array.from(dedup.values());
  }

  private async buildCategoryExpansionLines(
    seedProducts: CatalogSearchRaw[],
    excludeProductIds: Set<string>,
    maxItems: number,
  ): Promise<string[]> {
    if (seedProducts.length === 0 || maxItems <= 0) {
      return [];
    }

    const categories = this.extractRelevantCategories(seedProducts).slice(0, 8);
    if (categories.length === 0) {
      return [];
    }

    const expanded: CatalogSearchRaw[] = [];

    for (const category of categories) {
      const catalog = await this.voiceProductService.searchCatalog(category, 10);
      if (!catalog?.success || !Array.isArray(catalog.matches) || catalog.matches.length === 0) {
        continue;
      }

      for (const product of catalog.matches) {
        if (expanded.length >= maxItems) {
          break;
        }

        if (excludeProductIds.has(product.productId)) {
          continue;
        }

        if (product.currentStock <= 0) {
          continue;
        }

        if (!this.belongsToCategory(product, category)) {
          continue;
        }

        expanded.push(product);
        excludeProductIds.add(product.productId);
      }

      if (expanded.length >= maxItems) {
        break;
      }
    }

    return expanded.map((product, index) => {
      const categoryLabel = (product.categorySi || product.category || 'N/A').trim();
      return [
        `${index + 1}) ${this.voiceProductService.getDisplayName(product)}`,
        `   මිල: ${this.voiceProductService.formatPrice(product.price)}`,
        `   තොගය: ${this.voiceProductService.formatStockLabel(product.currentStock)}`,
        `   කාණ්ඩය: ${categoryLabel}`,
      ].join('\n');
    });
  }

  private async buildOfferRecommendationLines(lastOrderNames: string[], seedProducts: CatalogSearchRaw[]): Promise<string[]> {
    const offers = await this.voiceOfferService.getOfferCandidates(6);
    if (!offers || offers.length === 0) {
      return [];
    }

    const activeOrUpcoming = offers.filter((offer) => offer.offerStatus === 'active' || offer.offerStatus === 'upcoming');
    if (activeOrUpcoming.length === 0) {
      return [];
    }

    const relatedChecks = await Promise.all(
      activeOrUpcoming.map(async (offer) => {
        const relatedByName = this.isOfferRelatedToRecentOrders(offer, lastOrderNames);
        if (relatedByName) {
          return true;
        }

        return await this.isOfferRelatedToSeedCategories(offer, seedProducts);
      }),
    );

    const related = activeOrUpcoming.filter((_, index) => relatedChecks[index]);
    const selected = (related.length > 0 ? related : activeOrUpcoming).slice(0, 3);

    return selected.map((offer, index) => {
      const discount = this.formatOfferDiscount(offer.discountPercentage);
      const status = offer.offerStatus === 'active' ? 'active' : 'upcoming';
      const validity = this.formatOfferDateRange(offer.startDate, offer.endDate);
      const offerName = (offer.productName || offer.productId || 'Unknown product').trim();

      const details = [
        `${index + 1}) ${offerName}`,
        `   වට්ටම: ${discount}`,
        `   තත්ත්වය: ${status}`,
        validity ? `   වලංගු කාලය: ${validity}` : null,
      ];

      return details.filter((line): line is string => Boolean(line)).join('\n');
    });
  }

  private async isOfferRelatedToSeedCategories(offer: ActivePromotionItem, seedProducts: CatalogSearchRaw[]): Promise<boolean> {
    const categories = this.extractRelevantCategories(seedProducts);
    if (categories.length === 0) {
      return false;
    }

    const offerSearchTerm = (offer.productName || offer.productId || '').trim();
    if (!offerSearchTerm) {
      return false;
    }

    const catalog = await this.voiceProductService.searchCatalog(offerSearchTerm, 2);
    if (!catalog?.success || !Array.isArray(catalog.matches) || catalog.matches.length === 0) {
      return false;
    }

    const best = catalog.matches[0];
    const offerCategory = normalizeCatalogQuery(best.categorySi || best.category || '');
    if (!offerCategory) {
      return false;
    }

    return categories.some((category) => {
      const normalizedCategory = normalizeCatalogQuery(category);
      return offerCategory.includes(normalizedCategory) || normalizedCategory.includes(offerCategory);
    });
  }

  private extractRelevantCategories(products: CatalogSearchRaw[]): string[] {
    const categories: string[] = [];

    for (const product of products) {
      const label = (product.categorySi || product.category || '').trim();
      if (!label) {
        continue;
      }

      const normalized = normalizeCatalogQuery(label);
      if (!normalized) {
        continue;
      }

      if (!categories.some((existing) => normalizeCatalogQuery(existing) === normalized)) {
        categories.push(label);
      }
    }

    return categories;
  }

  private belongsToCategory(product: CatalogSearchRaw, category: string): boolean {
    const normalizedCategory = normalizeCatalogQuery(category);
    if (!normalizedCategory) {
      return false;
    }

    const fields = [product.categorySi || '', product.category || '', product.baseProductSi || '', product.baseProduct || '']
      .map((value) => normalizeCatalogQuery(value))
      .filter(Boolean);

    return fields.some(
      (field) => field.includes(normalizedCategory) || normalizedCategory.includes(field),
    );
  }

  private isOfferRelatedToRecentOrders(offer: ActivePromotionItem, lastOrderNames: string[]): boolean {
    const offerName = normalizeCatalogQuery(offer.productName || offer.productId || '');
    if (!offerName) {
      return false;
    }

    return lastOrderNames.some((name) => {
      const normalizedName = normalizeCatalogQuery(name || '');
      if (!normalizedName) {
        return false;
      }

      const tokens = normalizedName.split(/\s+/).filter((token) => token.length >= 3);
      return tokens.some((token) => offerName.includes(token));
    });
  }

  private formatOfferDiscount(discountPercentage: number | undefined): string {
    if (typeof discountPercentage !== 'number' || Number.isNaN(discountPercentage)) {
      return 'Discount info unavailable';
    }

    const rounded = Number(discountPercentage.toFixed(2));
    return Number.isInteger(rounded) ? `${rounded}% OFF` : `${rounded.toFixed(2)}% OFF`;
  }

  private formatOfferDateRange(startDate: string | null | undefined, endDate: string | null | undefined): string {
    if (startDate && endDate) {
      return `${startDate} - ${endDate}`;
    }
    if (endDate) {
      return `valid until ${endDate}`;
    }
    if (startDate) {
      return `starts ${startDate}`;
    }

    return '';
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
      'shopping list',
      'buying list',
      'මට ගන්න list එක',
      'ගන්න දේවල්',
    ];

    return recommendationTerms.some((term) => normalized.includes(term));
  }
}
