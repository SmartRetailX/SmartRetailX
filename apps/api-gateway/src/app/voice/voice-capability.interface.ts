import type {
  VoiceAssistantIntent,
  VoiceChatResponseDto,
  VoiceChatStoredMessage,
  VoiceChatTcpPayload,
  VoiceExplainability,
} from '@smart-retail-x/shared-types';

export type VoiceCapabilityMode = 'primary' | 'fallback' | 'recovery';

export type VoiceCapabilityContext = {
  transcriptText: string | undefined;
  language: VoiceChatTcpPayload['language'];
  sessionId: string;
  userId: string;
  intent?: VoiceAssistantIntent;
  entities?: Record<string, unknown>;
  explainability?: VoiceExplainability;
  recentMessages?: VoiceChatStoredMessage[];
};

export interface VoiceCapability {
  readonly id: string;
  readonly priority: number;
  handle(context: VoiceCapabilityContext, mode: VoiceCapabilityMode): Promise<VoiceChatResponseDto | null>;
}

export const VOICE_CAPABILITIES = Symbol('VOICE_CAPABILITIES');
