import { PAYEE_ROLE } from '@/constants';

export enum CHAT_USERS {
  USER = 'user',
  ASSISTANT = 'assistant',
}

export enum ChatFeedback {
  AGREE = 'agree',
  DISAGREE = 'disagree',
}

export interface Message {
  _id?: string;
  role: CHAT_USERS;
  message: MessageBody;
  feedback?: ChatFeedback;
  mentions?: {
    original_mention: string;
    name: string;
    entity_type: string;
    id: string;
  }[];
  createdAt?: Date;
  updatedAt?: Date;
}

export type MessageBody = SendMessageBody | ClarificationSelection | AgentResponse;

export interface Chat {
  _id: string;
  chatId: string;
  isResponsePending: boolean;
  chatList: Message[];
  createdAt: Date;
  updatedAt: Date;
  title: string;
  userId: string;
  isPublic: boolean;
}

export enum AgentType {
  GREETING_AGENT = 'GREETING_AGENT',
  RAG_AGENT = 'RAG',
  REPORT_AGENT = 'REPORT_GENERATOR',
  CHAT_AGENT = 'CHAT_AGENT',
  COMPARATOR_AGENT = 'COMPARATOR',
  CALCULATION_AGENT = 'CALCULATION_AGENT',
  ENTITY_PREPROCESSOR = 'ENTITY_PREPROCESSOR',
  RANKING_AGENT = 'RANKING_AGENT',
  TOOL_ASSISTED_AGENT = 'TOOL_ASSISTED_AGENT',
  VISUALIZATION_AGENT = 'VISUALIZATION_AGENT',
  WRITE_AGENT = 'WRITE_TOOL',
}

export enum PrimaryResponseType {
  MARKDOWN = 'markdown',
  TEXT = 'text',
  TABLE = 'table',
}

export enum ChatType {
  NORMAL = 'normal',
  THREAD = 'thread',
}

export enum ChatMode {
  CHAT = 'chat',
  VISUALIZATION = 'visualization',
  WRITE = 'write',
}

export enum ChatModel {
  NORMAL = 'normal',
  ADVANCED = 'advanced',
  PRO = 'pro',
}

export enum ChartType {
  BAR = 'bar',
  LINE = 'line',
  PIE = 'pie',
  SCATTER = 'scatter',
  HEATMAP = 'heatmap',
  MAP = 'map',
}

export interface ChartVisualization {
  title: string;
  description: string;
  chartType: ChartType;
  chartData: string;
}

export enum MentionType {
  ARTIST = PAYEE_ROLE.ARTIST,
  COMPANY = PAYEE_ROLE.COMPANY,
  COMPOSER = PAYEE_ROLE.COMPOSER,
  LABEL = PAYEE_ROLE.LABEL,
  CONTRACT = 'contract',
  COUNTRY = 'country',
  PLATFORM = 'platform',
}

export interface ChatTableContent {
  headers: string[];
  rows: Record<string, unknown>[] | unknown[][];
  total_rows?: number;
}

export interface ClarificationSelection {
  selection_name: string;
  id: string;
  original_ambiguous_term: string;
}

export interface SendMessageBody {
  query: string;
  clarification_input?: ClarificationSelection[];
  pre_resolved_entities?: MentionData[];
  selected_suggestion?: string;
  mode: ChatMode;
  model: ChatModel;
  type: ChatType;
  messageId?: string;
}

export interface MentionData {
  objectId?: string;
  id: string;
  original_mention: string;
  name: string;
  entity_type: MentionType;
}

export interface AgentResponse {
  success: boolean;
  agent_type: AgentType;
  agent_confidence?: number;
  primary_response: {
    type: 'markdown' | 'table';
    content?: string | ChatTableContent;
  };
  ambiguityResolution?: {
    original_query: string;
    selections: {
      selection_name: string;
      message_to_user: string;
      original_ambiguous_term: string;
      options: {
        display_name: string;
        id: string;
      }[];
    }[];
  };
  pre_resolved_entities?: {
    original_mention: string;
    name: string;
    entity_type: PAYEE_ROLE | 'contract' | 'country' | 'platform';
    id: string;
  }[];
  suggestions?: string[];
  visualizations?: Array<{
    chart_type: 'bar' | 'line' | 'pie';
    chart_data?: unknown;
  }>;
  report_title?: string | null;
  sources?: string[] | null;
  error?: string | null;
  suggested_chat_topic?: string;
  content?: string;
}
