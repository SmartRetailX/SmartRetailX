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

export interface VoiceExplainabilityFeature {
  name: string;
  weight?: number;
  evidence?: string;
}

export interface VoiceExplainability {
  source:
    | 'sinllama'
    | 'fallback-keyword'
    | 'db-catalog'
    | 'db-order'
    | 'db-offers'
    | 'db-recommendation';
  confidence?: number;
  rationale?: string;
  features?: VoiceExplainabilityFeature[];
}

export interface VoiceChatResponseDto {
  success: boolean;
  transcription: string;
  response: string;
  audioUrl?: string;
  language: VoiceLanguageCode;
  sessionId: string;
  messages: VoiceChatMessage[];
  intent?: VoiceAssistantIntent;
  entities?: Record<string, unknown>;
  explainability?: VoiceExplainability;
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
  audioUrl?: string | null;
  language: VoiceLanguageCode;
  createdAt: string;
  products?: Record<string, unknown>[] | null;
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

export type VoiceProcessingStatusPhase =
  | 'idle'
  | 'received'
  | 'gateway_to_agent'
  | 'transcribing'
  | 'intent_detection'
  | 'resolving'
  | 'responding'
  | 'completed'
  | 'failed'
  | 'busy';

export interface VoiceProcessingStatusDto {
  userId: string;
  sessionId?: string;
  requestId: string;
  channel: VoiceChatInputMode;
  phase: VoiceProcessingStatusPhase;
  message: string;
  active: boolean;
  transcription?: string;
  intent?: VoiceAssistantIntent;
  error?: string;
  updatedAt: string;
}
