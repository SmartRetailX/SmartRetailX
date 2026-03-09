import { Injectable } from '@nestjs/common';
import { normalizeCatalogQuery, type VoiceChatResponseDto, type VoiceChatTcpPayload } from '@smart-retail-x/shared-types';

import {
  type VoiceCapability,
  type VoiceCapabilityContext,
  type VoiceCapabilityMode,
} from './voice-capability.interface';
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

  private formatRecommendationLine(product: CatalogSearchRaw): string {
    return `- **${this.voiceProductService.getDisplayName(product)}** - ${this.voiceProductService.formatPrice(product.price)} | ${this.voiceProductService.formatStockLabel(product.currentStock)}`;
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
