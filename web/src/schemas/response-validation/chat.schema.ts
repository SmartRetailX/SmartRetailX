import { z } from 'zod';

import { PAYEE_ROLE } from '@/constants';
import {
  AgentType,
  ChartType,
  CHAT_USERS,
  ChatFeedback,
  ChatMode,
  ChatType,
  MentionType,
  PrimaryResponseType,
} from '@/types';

// Pre-resolved entity schema (Mention - User)
const preResolvedEntitySchema = z.object({
  id: z.string(),
  original_mention: z.string(),
  name: z.string(),
  entity_type: z.nativeEnum(MentionType),
});

// Mention schema
const mentionSchema = z.object({
  // Artist mention fields
  payee_id: z.string(),
  artist_name: z.string(),
  payee_role: z.nativeEnum(PAYEE_ROLE),
  // Contract mention fields
  contract_id: z.string(),
  track_title: z.string(),
  // isrc: z.string(),
  // platform: z.string(),
  // territory: z.string(),
  // year: z.number(),
  // aggregated_month: z.string(),
  // artist_earnings: z.number(),
  // total_earnings_before_split: z.number(),
  // split_percentage: z.number(),
});

// Clarification selection schema
const clarificationSelectionSchema = z.object({
  selection_name: z.string(),
  id: z.string(),
  original_ambiguous_term: z.string(),
});

// Primary response schema
const primaryResponseSchema = z.object({
  type: z.nativeEnum(PrimaryResponseType),
  content: z.string(),
});

// Ambiguity resolution schema
const ambiguityResolutionSchema = z.object({
  original_query: z.string(),
  selections: z.array(
    z.object({
      selection_name: z.string(),
      message_to_user: z.string(),
      original_ambiguous_term: z.string(),
      options: z.array(
        z.object({
          display_name: z.string(),
          id: z.string(),
        }),
      ),
    }),
  ),
});

// Visualization schema
const visualizationSchema = z.object({
  chart_type: z.nativeEnum(ChartType),
  chart_data: z.string(),
  title: z.string(),
  description: z.string().optional(),
});
export type VisualizationSchemaType = z.infer<typeof visualizationSchema>;

const userSchema = z.object({
  _id: z.string(),
  __v: z.number().optional(),
  createdAt: z.string(),
  email: z.string(),
  updatedAt: z.string(),
  userId: z.string(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

// User message body schema
const userMessageBodySchema = z.object({
  query: z.string(),
  mode: z.nativeEnum(ChatMode),
  type: z.nativeEnum(ChatType),
  pre_resolved_entities: z.array(preResolvedEntitySchema).optional(),
  clarification_input: z.array(clarificationSelectionSchema).optional(), // ambiguity resolution selections
  // selected_suggestion: z.string().optional(),
});

// Assistant success message body schema
const assistantSuccessMessageBodySchema = z.object({
  success: z.literal(true),
  session_id: z.string().optional(),
  agent_type: z.nativeEnum(AgentType),
  primary_response: primaryResponseSchema,
  suggested_chat_topic: z.string().optional(),
  mentions: z.array(mentionSchema).optional(),
  suggestions: z.array(z.string()).optional(),
  ambiguity_resolution: ambiguityResolutionSchema.optional(),
  visualizations: z.array(visualizationSchema).optional(),
});

// Assistant error message body schema
const assistantErrorMessageBodySchema = z.object({
  success: z.literal(false),
  session_id: z.string().optional(),
  content: z.string(),
});

// Combined assistant message body schema using discriminated union on success
export const assistantMessageBodySchema = z.discriminatedUnion('success', [
  assistantSuccessMessageBodySchema,
  assistantErrorMessageBodySchema,
]);

// Base message schema
const baseMessageSchema = z.object({
  _id: z.string(),
  chatId: z.string(),
  role: z.nativeEnum(CHAT_USERS),
  success: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  __v: z.number().optional(),
});

// User message schema
const userMessageSchema = baseMessageSchema.extend({
  role: z.literal(CHAT_USERS.USER),
  message: userMessageBodySchema,
});

// Assistant message schema
export const assistantMessageSchema = baseMessageSchema.extend({
  role: z.literal(CHAT_USERS.ASSISTANT),
  message: assistantMessageBodySchema,
  feedback: z.nativeEnum(ChatFeedback).optional(),
});

// Combined message schema
const messageSchema = z.discriminatedUnion('role', [userMessageSchema, assistantMessageSchema]);

export const chatResponseSchema = z
  .object({
    _id: z.string(),
    userId: z.union([userSchema, z.string()]),
    chatId: z.string(),
    isPublic: z.boolean(),
    isResponsePending: z.boolean(),
    title: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
    __v: z.number().optional(),
  })
  .optional();

export const chatsResponseSchema = z.object({
  total: z.number(),
  data: z.array(chatResponseSchema),
});

export const chatItemsResponseSchema = z.object({
  total: z.number(),
  data: z.array(messageSchema),
});

// Thread schemas
export const baseThreadItemSchema = z.object({
  _id: z.string(),
  chatId: z.string(),
  messageId: z.string(),
  success: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  __v: z.number(),
});

export const userThreadSchema = baseThreadItemSchema.extend({
  role: z.literal(CHAT_USERS.USER),
  message: z.object({
    query: z.string(),
    mode: z.string(),
    clarification_input: z.array(clarificationSelectionSchema).optional(),
    pre_resolved_entities: z.array(preResolvedEntitySchema).optional(),
  }),
});

export const assistantThreadSchema = baseThreadItemSchema.extend({
  role: z.literal(CHAT_USERS.ASSISTANT),
  message: visualizationSchema,
});
export type AssistantThreadSchemaType = z.infer<typeof assistantThreadSchema>;

// Thread item schema
export const threadItemSchema = z.discriminatedUnion('role', [
  userThreadSchema,
  assistantThreadSchema,
]);

export const threadItemsResponseSchema = z.array(threadItemSchema);

export type ThreadItemSchemaType = z.infer<typeof threadItemSchema>;

export type ThreadItemsResponseSchemaType = z.infer<typeof threadItemsResponseSchema>;
export type MessageSchemaType = z.infer<typeof messageSchema>;
export type UserMessageSchemaType = z.infer<typeof userMessageSchema>;
export type AssistantMessageBodySchemaType = z.infer<typeof assistantMessageBodySchema>;
export type AssistantMessageSchemaType = z.infer<typeof assistantMessageSchema>;
export type ChatResponseSchemaType = z.infer<typeof chatResponseSchema>;
export type ChatItemsResponseSchemaType = z.infer<typeof chatItemsResponseSchema>;
export type AssistantErrorMessageBodySchemaType = z.infer<typeof assistantErrorMessageBodySchema>;
export type PreResolvedEntitySchemaType = z.infer<typeof preResolvedEntitySchema>;
export type MentionSchemaType = z.infer<typeof mentionSchema>;
export type UserSchemaType = z.infer<typeof userSchema>;
