import { Injectable } from '@nestjs/common';
import { normalizeCatalogQuery, type VoiceChatResponseDto, type VoiceChatTcpPayload } from '@smart-retail-x/shared-types';

import {
  type VoiceCapability,
  type VoiceCapabilityContext,
  type VoiceCapabilityMode,
} from './voice-capability.interface';

@Injectable()
export class VoiceOfferService implements VoiceCapability {
  readonly id = 'offer';
  readonly priority = 30;

  async handle(context: VoiceCapabilityContext, mode: VoiceCapabilityMode): Promise<VoiceChatResponseDto | null> {
    if (mode !== 'fallback') {
      return null;
    }

    return this.buildOfferFallbackResponse(context.transcriptText, context.language, context.sessionId);
  }

  isOfferStyleQuestion(text: string | undefined): boolean {
    const normalized = normalizeCatalogQuery(text || '');
    if (!normalized) {
      return false;
    }

    const offerTerms = [
      'offer',
      'offers',
      'promotion',
      'promotions',
      'discount',
      'deals',
      'special price',
      'coupon',
      'coupons',
      'වට්ටම්',
      'ප්රවර්ධන',
      'ප්‍රවර්ධන',
      'දීමනා',
      'offer එක',
      'offers තියෙනවද',
    ];

    return offerTerms.some((term) => normalized.includes(term));
  }

  buildOfferFallbackResponse(
    transcriptText: string | undefined,
    language: VoiceChatTcpPayload['language'],
    sessionId: string,
  ): VoiceChatResponseDto | null {
    const queryText = transcriptText?.trim();
    if (!this.isOfferStyleQuestion(queryText)) {
      return null;
    }

    return {
      success: true,
      transcription: queryText || '',
      response:
        'දැනට offers සේවාවට සම්බන්ධතාවයේ ගැටලුවක් තිබෙනවා. මොහොතකින් නැවත උත්සාහ කරන්න, හෝ "current offers list" කියලා අහන්න.',
      language,
      sessionId,
      messages: [],
      model: 'offer-fallback',
    };
  }
}
