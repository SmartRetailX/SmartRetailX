export type VoiceLanguageCode = 'auto' | 'si-LK' | 'si' | 'en-US' | 'en';
export type VoiceUserRole = 'admin' | 'owner' | 'user' | 'customer' | 'guest';
export type VoiceAssistantIntent =
  | 'offers'
  | 'order_history'
  | 'buying_suggestions'
  | 'prices'
  | 'product_search'
  | 'general';

export interface VoiceUserContext {
  id?: string;
  email?: string;
  name?: string;
  role: VoiceUserRole;
}

export interface VoiceChatDto {
  language: VoiceLanguageCode;
  sessionId?: string;
  userId?: string;
  userRole?: VoiceUserRole;
  intents?: VoiceAssistantIntent[];
  transcriptText?: string;
}

export interface VoiceChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface VoiceChatResponseDto {
  success: boolean;
  transcription: string;
  response: string;
  language: VoiceLanguageCode;
  sessionId: string;
  messages: VoiceChatMessage[];
  model?: string;
  latencyMs?: number;
  error?: string;
}

export type VoiceChatInputMode = 'text' | 'voice';

export interface VoiceChatStoredMessage {
  id: string;
  role: 'user' | 'assistant';
  channel: VoiceChatInputMode;
  content: string;
  transcription?: string | null;
  language: VoiceLanguageCode;
  createdAt: string;
}

export interface VoiceChatSessionDto {
  id: string;
  userId: string;
  agentSessionId: string;
  createdAt: string;
  updatedAt: string;
  lastMessageAt?: string | null;
  messages: VoiceChatStoredMessage[];
}

export interface VoiceChatTcpPayload {
  audioBase64: string;
  mimeType: string;
  language: VoiceLanguageCode;
  sessionId: string;
  userId?: string;
  userContext?: VoiceUserContext;
  intents?: VoiceAssistantIntent[];
  transcriptText?: string;
}

export const VOICE_CHAT_PATTERN = { cmd: 'voice_chat' } as const;
