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
    const lastOrder = await this.voiceOrderService.getLatestOrderForUser(userId);
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

        const catalog = await this.voiceProductService.searchCatalog(searchTerm, 4);
        if (!catalog?.success || !Array.isArray(catalog.matches) || catalog.matches.length === 0) {
          return null;
        }

        const best = catalog.matches.find((m) => m.productId === item.productId) || catalog.matches[0];
        if (!best) {
          return null;
        }

        return this.formatRecommendationLine(best);
      }),
    );

    const lines = suggestions.filter((line): line is string => Boolean(line)).slice(0, 5);
    const offerLines = await this.buildOfferRecommendationLines(topItems.map((item) => item.productNameSi || item.productName || ''));

    if (lines.length === 0 && offerLines.length === 0) {
      return 'ඔබගේ අවසන් ඇණවුම අනුව නිර්දේශ සකස් කළා, නමුත් දැනට ගැලපෙන stock items හමු නොවුණා.';
    }

    const sections = [
      '### ඔබට නිර්දේශිත ලැයිස්තුව',
      `- **මූලාශ්‍රය:** ඔබගේ අවසන් ඇණවුම (${lastOrder.orderNumber})`,
    ];

    if (lines.length > 0) {
      sections.push('### නැවත මිලදී ගත හැකි items', ...lines);
    }

    if (offerLines.length > 0) {
      sections.push('### ඔබට අදාල available offers', ...offerLines);
    }

    sections.push('_අවශ්‍ය නම් මේ ලැයිස්තුවෙන් items cart එකට දාන්න කියන්න._');

    return sections.join('\n');
  }

  private formatRecommendationLine(product: CatalogSearchRaw): string {
    return `- **${this.voiceProductService.getDisplayName(product)}** - ${this.voiceProductService.formatPrice(product.price)} | ${this.voiceProductService.formatStockLabel(product.currentStock)}`;
  }

  private async buildOfferRecommendationLines(lastOrderNames: string[]): Promise<string[]> {
    const offers = await this.voiceOfferService.getOfferCandidates(6);
    if (!offers || offers.length === 0) {
      return [];
    }

    const activeOrUpcoming = offers.filter((offer) => offer.offerStatus === 'active' || offer.offerStatus === 'upcoming');
    if (activeOrUpcoming.length === 0) {
      return [];
    }

    const related = activeOrUpcoming.filter((offer) => this.isOfferRelatedToRecentOrders(offer, lastOrderNames));
    const selected = (related.length > 0 ? related : activeOrUpcoming).slice(0, 3);

    return selected.map((offer) => {
      const discount = this.formatOfferDiscount(offer.discountPercentage);
      const status = offer.offerStatus === 'active' ? 'active' : 'upcoming';
      const validity = this.formatOfferDateRange(offer.startDate, offer.endDate);
      const offerName = (offer.productName || offer.productId || 'Unknown product').trim();

      return `- **${offerName}** - ${discount} | ${status}${validity}`;
    });
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
      return ` | ${startDate} - ${endDate}`;
    }
    if (endDate) {
      return ` | valid until ${endDate}`;
    }
    if (startDate) {
      return ` | starts ${startDate}`;
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
