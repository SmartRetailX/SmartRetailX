import { Injectable } from '@nestjs/common';
import {
  type VoiceChatInputMode,
  type VoiceChatSessionDto,
  type VoiceLanguageCode,
} from '@smart-retail-x/shared-types';

import { VoiceChatRepository } from './voice-chat.repository';

@Injectable()
export class VoiceService {
  constructor(private readonly voiceChatRepository: VoiceChatRepository) {}

  async getSession(userId: string, limit?: number): Promise<VoiceChatSessionDto> {
    return this.voiceChatRepository.getSessionWithMessages(userId, limit);
  }

  async saveExchange(params: {
    userId: string;
    channel: VoiceChatInputMode;
    language: VoiceLanguageCode;
    userText: string;
    assistantText: string;
    transcription?: string;
    userAudioUrl?: string | null;
    products?: Record<string, unknown>[] | null;
  }): Promise<void> {
    await this.voiceChatRepository.appendExchange(params);
  }
}
