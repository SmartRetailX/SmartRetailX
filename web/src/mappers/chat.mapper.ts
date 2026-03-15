import {
  AssistantMessageSchemaType,
  ChatResponseSchemaType,
  MentionSchemaType,
  MessageSchemaType,
  PreResolvedEntitySchemaType,
  ThreadItemSchemaType,
  UserMessageSchemaType,
  UserSchemaType,
  VisualizationSchemaType,
} from '@/schemas/response-validation/chat.schema';
import { ChartVisualization, CHAT_USERS, MentionType } from '@/types';
import {
  AssistantErrorMessage,
  AssistantSuccessMessage,
  AssistantThreadItem,
  Chat,
  ChatMessage,
  Mention,
  ThreadItem,
  User,
  UserMessage,
  UserThreadItem,
} from '@/types/chat.domain';

const toDate = (s: string) => new Date(s);

// Type guards
const isUserMessage = (m: UserMessageSchemaType): m is UserMessageSchemaType =>
  m.role === CHAT_USERS.USER;

const isAssistantMessage = (m: MessageSchemaType): m is AssistantMessageSchemaType =>
  m.role === CHAT_USERS.ASSISTANT;

// Mentions
const mapUserMention = (m: PreResolvedEntitySchemaType): Mention => ({
  value: m.original_mention,
  name: m.name,
  type: m.entity_type,
  id: m.id,
});

const hasRealValue = (v?: string | null) =>
  typeof v === 'string' && v.trim().length > 0 && v.trim().toUpperCase() !== 'N/A';

const mapAgentMention = (m: MentionSchemaType): Mention => {
  if (hasRealValue(m.payee_id)) {
    return {
      value: m.artist_name,
      name: m.artist_name,
      type: m.payee_role as unknown as MentionType,
      id: m.payee_id,
    };
  }

  return {
    value: m.track_title,
    name: m.track_title,
    type: MentionType.CONTRACT,
    id: m.contract_id,
  };
};

// User
const mapUser = (u: UserSchemaType): User => ({
  id: u._id,
  email: u.email,
  userId: u.userId,
  firstName: u.firstName,
  lastName: u.lastName,
  version: u.__v,
  createdAt: toDate(u.createdAt),
  updatedAt: toDate(u.updatedAt),
});

// Messages
const mapUserMessage = (m: UserMessageSchemaType): UserMessage => ({
  kind: CHAT_USERS.USER,
  id: m._id,
  chatId: m.chatId,
  role: m.role,
  mode: m.message.mode,
  type: m.message.type,
  prompt: m.message.query,
  clarifications: m.message.clarification_input?.map((c) => ({
    term: c.original_ambiguous_term,
    name: c.selection_name,
    id: c.id,
  })),
  mentions: m.message.pre_resolved_entities?.map(mapUserMention),
  createdAt: toDate(m.createdAt),
  updatedAt: toDate(m.updatedAt),
});

const mapVisualization = (v: VisualizationSchemaType): ChartVisualization => {
  return {
    title: v.title || 'Chart Visualization',
    description: v.description || 'Description not available',
    chartData: v.chart_data,
    chartType: v.chart_type,
  };
};

const mapAssistantSuccessMessage = (m: AssistantMessageSchemaType): AssistantSuccessMessage => {
  // Type assertion is safe here because we check success in the calling function
  const message = m.message as Extract<typeof m.message, { success: true }>;

  return {
    kind: CHAT_USERS.ASSISTANT,
    id: m._id,
    chatId: m.chatId,
    sessionId: message.session_id || m.chatId,
    role: m.role,
    feedback: m.feedback,
    createdAt: toDate(m.createdAt),
    updatedAt: toDate(m.updatedAt),
    success: message.success,
    agentType: message.agent_type,
    primary: {
      type: (message.primary_response?.type as 'markdown' | 'table') || 'markdown',
      content: message.primary_response?.content,
    },
    clarificationRequest: message.ambiguity_resolution && {
      prompt: message.ambiguity_resolution.original_query,
      selections: message.ambiguity_resolution.selections.map((s) => ({
        name: s.selection_name,
        description: s.message_to_user,
        term: s.original_ambiguous_term,
        options: s.options.map((o) => ({
          displayName: o.display_name,
          id: o.id,
        })),
      })),
    },
    mentions: message.mentions?.map(mapAgentMention),
    suggestions: message.suggestions,
    visualization:
      message.visualizations && message.visualizations.length > 0
        ? mapVisualization(message.visualizations[0])
        : undefined,
    suggestedChatTopic: message.suggested_chat_topic,
  };
};

const mapAssistantErrorMessage = (m: AssistantMessageSchemaType): AssistantErrorMessage => {
  // Type assertion is safe here because we check success in the calling function
  const message = m.message as Extract<typeof m.message, { success: false }>;

  return {
    kind: CHAT_USERS.ASSISTANT,
    success: false,
    sessionId: message.session_id || m.chatId,
    id: m._id,
    role: m.role,
    createdAt: toDate(m.createdAt),
    updatedAt: toDate(m.updatedAt),
    content: message.content || 'An unknown error occurred.',
  };
};

export const mapChat = (c: ChatResponseSchemaType): Chat | null => {
  if (!c) return null;

  const user =
    typeof c.userId === 'string'
      ? { _id: c.userId, email: '', userId: c.userId, createdAt: '', updatedAt: '' }
      : c.userId;

  return {
    id: c._id,
    chatId: c.chatId,
    title: c.title,
    user: mapUser(user),
    isResponsePending: c.isResponsePending,
    isPublic: c.isPublic,
    createdAt: new Date(c.createdAt),
    updatedAt: new Date(c.updatedAt),
    version: c.__v,
  };
};

export const mapAssistantMessage = (item: AssistantMessageSchemaType): ChatMessage => {
  if (item.message.success === false) {
    return mapAssistantErrorMessage(item);
  } else {
    return mapAssistantSuccessMessage(item);
  }
};

export const mapChatItem = (item: MessageSchemaType): ChatMessage => {
  if (isAssistantMessage(item)) {
    return mapAssistantMessage(item);
  } else if (isUserMessage(item)) {
    return mapUserMessage(item);
  }

  // This should never happen with proper discriminated unions
  throw new Error(`Unknown message type: ${(item as MessageSchemaType).role}`);
};

// Thread Items
const isUser = (
  item: ThreadItemSchemaType,
): item is Extract<ThreadItemSchemaType, { role: CHAT_USERS.USER }> =>
  item.role === CHAT_USERS.USER;

const mapThreadUserItem = (
  item: Extract<ThreadItemSchemaType, { role: CHAT_USERS.USER }>,
): UserThreadItem => ({
  id: item._id,
  chatId: item.chatId,
  threadId: item.messageId,
  success: item.success,
  role: item.role,
  kind: CHAT_USERS.USER,
  content: {
    prompt: item.message.query,
    mode: item.message.mode,
    clarifications: item.message.clarification_input?.map((c) => ({
      name: c.selection_name,
      id: c.id,
      term: c.original_ambiguous_term,
    })),
    mentions: item.message.pre_resolved_entities?.map(mapUserMention),
  },
  createdAt: toDate(item.createdAt),
  updatedAt: toDate(item.updatedAt),
});

export const mapThreadAssistantItem = (
  item: Extract<ThreadItemSchemaType, { role: CHAT_USERS.ASSISTANT }>,
): AssistantThreadItem => ({
  id: item._id,
  chatId: item.chatId,
  threadId: item.messageId,
  role: item.role,
  success: item.success,
  kind: CHAT_USERS.ASSISTANT,
  visualization: mapVisualization(item.message),
  createdAt: toDate(item.createdAt),
  updatedAt: toDate(item.updatedAt),
});

export const mapThreadItem = (item: ThreadItemSchemaType): ThreadItem => {
  if (isUser(item)) {
    return mapThreadUserItem(item);
  } else {
    return mapThreadAssistantItem(item);
  }
};
