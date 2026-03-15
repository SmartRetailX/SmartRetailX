import * as z from 'zod';

export const ticketCategorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  color: z.string().min(7, 'Color is required'),
  icon: z.string().optional(),
});

export const createTicketCategorySchema = ticketCategorySchema;
export const updateTicketCategorySchema = ticketCategorySchema.partial();

export type CreateTicketCategoryInput = z.infer<typeof createTicketCategorySchema>;
export type UpdateTicketCategoryInput = z.infer<typeof updateTicketCategorySchema>;
