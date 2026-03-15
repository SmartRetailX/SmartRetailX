import {
  AgentType,
  ChartVisualization,
  CHAT_USERS,
  ChatFeedback,
  ChatMode,
  ChatModel,
  ChatType,
  MentionType,
} from '@/types';

export type Id = string;

export interface TimestampedDomain {
  createdAt: Date;
  updatedAt: Date;
}

export interface Mention {
  type: MentionType;
  id: Id;
  name: string;
  value: string;
}

export interface ClarificationSelection {
  name: string;
  id: Id;
  term: string;
}

export interface PrimaryResponse {
  type: 'markdown' | 'table';
  content?: string;
}

// Domain Models
export interface User extends TimestampedDomain {
  id: Id;
  email: string;
  userId: string;
  firstName?: string;
  lastName?: string;
  version?: number;
}

interface MessageBase extends TimestampedDomain {
  id: Id;
  chatId?: Id;
  role: CHAT_USERS;
  mentions?: Mention[];
}

export interface UserMessage extends MessageBase {
  kind: CHAT_USERS.USER;
  mode: ChatMode;
  model: ChatModel;
  type: ChatType;
  prompt: string;
  clarifications?: ClarificationSelection[];
}

export interface AssistantSuccessMessage extends MessageBase {
  kind: CHAT_USERS.ASSISTANT;
  success: boolean;
  sessionId: string;
  agentType: AgentType;
  primary: PrimaryResponse;
  clarificationRequest?: {
    prompt: string;
    selections: {
      name: string;
      description: string;
      term: string;
      options: { displayName: string; id: Id }[];
    }[];
  };
  mentions?: Mention[];
  suggestions?: string[];
  visualization?: ChartVisualization;
  suggestedChatTopic?: string;
  content?: string;
  feedback?: ChatFeedback;
}

export interface AssistantErrorMessage extends MessageBase {
  kind: CHAT_USERS.ASSISTANT;
  success: false;
  sessionId: string;
  content: string;
}

export type ChatMessage = UserMessage | AssistantSuccessMessage | AssistantErrorMessage;

export interface Chat extends TimestampedDomain {
  id: Id;
  chatId: Id;
  user: User; // domain renames and flattens
  version?: number;
  title: string;
  isPublic: boolean;
  isResponsePending: boolean;
}

// Thread Items
export interface BaseThreadItem extends TimestampedDomain {
  id: Id;
  chatId: Id;
  threadId: Id;
  role: CHAT_USERS;
  success: boolean;
}
export interface UserThreadItem extends BaseThreadItem {
  kind: CHAT_USERS.USER;
  content: {
    prompt: string;
    mode: string;
    clarifications?: ClarificationSelection[];
    mentions?: Mention[];
  };
}

export interface AssistantThreadItem extends BaseThreadItem {
  kind: CHAT_USERS.ASSISTANT;
  visualization: ChartVisualization;
}

export type ThreadItem = UserThreadItem | AssistantThreadItem;
