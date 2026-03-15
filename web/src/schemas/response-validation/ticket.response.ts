import { z } from 'zod';

import { contractResponse } from './contract.response';
import { createdByResponse } from './user.response';

const ticketCategoryCreatedBySchema = z
  .object({
    _id: z.string(),
    email: z.string().email().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
  })
  .passthrough();

// Temp schemas for response validation
const assignedUserSchema = z.object({
  _id: z.string(),
  name: z.string().optional(),
  email: z.string(),
  image: z.string().optional().nullable(),
});

const assignedPayeeSchema = z.object({
  _id: z.string(),
  name: z.string(),
  email: z.string(),
  type: z.string(),
  aliases: z.array(z.string()).optional(),
  internalPayee: z.boolean().optional(),
  image: z.string().optional().nullable(),
});

const categorySchema = z.object({
  _id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  color: z.string().optional(),
  createdBy: z.union([createdByResponse, ticketCategoryCreatedBySchema]),
  icon: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  __v: z.number().optional(),
});

const attachmentsSchema = z.object({
  _id: z.string(),
  originalName: z.string(),
  mimeType: z.string(),
  size: z.number(),
  key: z.string(),
  tags: z.array(z.string()),
  uploadedBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  __v: z.number().optional(),
});

const ticketSchema = z.object({
  _id: z.string(),
  ticketId: z.string(),
  contract: z.array(
    contractResponse.pick({ _id: true, title: true, upc: true, isrc: true, image: true }),
  ),
  subject: z.string(),
  description: z.string(),
  isClosed: z.boolean(),
  progress: z.string(),
  assignedPayees: z.array(assignedPayeeSchema).optional(),
  assignedUsers: z.array(assignedUserSchema).optional(),
  category: categorySchema,
  attachments: z.union([z.array(attachmentsSchema), z.array(z.string())]).optional(),
  createdBy: createdByResponse,
  createdAt: z.string(),
  updatedAt: z.string(),
  __v: z.number().optional(),
  updatedBy: createdByResponse.optional(),
});

const ticketItemSchema = z.object({
  _id: z.string(),
  ticket: z.string(),
  content: z.string(),
  user: z.object({
    _id: z.string(),
    name: z.string().optional(),
    email: z.string(),
    image: z.string().optional(),
  }),
  attachments: z.array(attachmentsSchema).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  __v: z.number(),
});

export const ticketItemResponse = ticketItemSchema;
export type TicketItemResponse = z.infer<typeof ticketItemSchema>;

export const ticketCategoryResponse = categorySchema;
export type TicketCategoryResponse = z.infer<typeof ticketCategoryResponse>;

export const ticketCategoriesResponse = z.array(categorySchema);
export type TicketCategoriesResponse = z.infer<typeof ticketCategoriesResponse>;

export const ticketResponse = ticketSchema.extend({
  category: ticketCategoryResponse.extend({
    createdBy: z.string(),
  }),
  // created
});
export type TicketResponse = z.infer<typeof ticketResponse>;

// Tickets by contract response (array of full tickets)
export const ticketsByContractResponse = z.array(ticketResponse);
export type TicketsByContractResponse = z.infer<typeof ticketsByContractResponse>;

export const ticketItemsResponse = z.object({
  data: z.array(ticketItemSchema),
  total: z.number(),
});
export type TicketItemsResponse = z.infer<typeof ticketItemsResponse>;

// All tickets list response schema
const ticketListItemContractSchema = z.object({
  _id: z.string(),
  isrc: z.string().optional(),
  title: z.string(),
  upc: z.string().optional(),
  image: z.string().nullable().optional(),
});

const ticketListItemCategorySchema = z.object({
  _id: z.string(),
  name: z.string(),
  color: z.string(),
  createdBy: z.string(),
  icon: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  __v: z.number().optional(),
});

const ticketListItemCreatedBySchema = z.object({
  _id: z.string(),
  email: z.string(),
});

const ticketListItemSchema = z.object({
  _id: z.string(),
  ticketId: z.string(),
  contract: z.array(ticketListItemContractSchema),
  subject: z.string(),
  description: z.string(),
  isClosed: z.boolean(),
  progress: z.string(),
  category: ticketListItemCategorySchema,
  createdBy: ticketListItemCreatedBySchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  __v: z.number().optional(),
  updatedBy: ticketListItemCreatedBySchema.optional(),
});

export const ticketsListResponse = z.object({
  data: z.array(ticketListItemSchema),
  total: z.number(),
});
export type TicketsListResponse = z.infer<typeof ticketsListResponse>;
export type TicketListItem = z.infer<typeof ticketListItemSchema>;

export const createTicketResponse = z.object({
  _id: z.string(),
  ticketId: z.string(),
});
export type CreateTicketResponse = z.infer<typeof createTicketResponse>;
