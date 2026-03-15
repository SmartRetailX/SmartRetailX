import * as z from 'zod';

export const ticketSchema = z.object({
  subject: z.string().min(1, 'Subject is required'),
  description: z.string().min(1, 'Description is required'),
  category: z.string().min(1, 'Category is required'),
  contracts: z.array(z.string().min(1, 'Contract is required')),
  assignedPayees: z.array(z.string().min(1, 'Assigned payee is required')),
  assignedUsers: z.array(z.string().min(1, 'Assigned user is required')),
  attachmentKeys: z.array(z.string()).optional(),
});

export const ticketItemSchema = z.object({
  content: z.string().min(1, 'Content is required'),
  attachmentKeys: z.array(z.string()).optional(),
});

export const createTicketSchema = ticketSchema;
export type CreateTicketSchema = z.infer<typeof createTicketSchema>;

export const updateTicketSchema = ticketSchema.partial().extend({
  progress: z.string().optional(),
  isClosed: z.boolean().optional(),
});
export type UpdateTicketSchema = z.infer<typeof updateTicketSchema>;

export const sendTicketMessageSchema = ticketItemSchema;
export type SendTicketMessageSchema = z.infer<typeof sendTicketMessageSchema>;
