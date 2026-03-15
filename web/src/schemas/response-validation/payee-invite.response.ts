import { z } from 'zod';

const inviteUserSchema = z
  .object({
    id: z.string().optional(),
    _id: z.string().optional(),
    name: z.string().optional(),
    email: z.string().optional().nullable(),
  })
  .passthrough();

const payeeInvitePayeeSchema = z
  .object({
    id: z.string().optional(),
    _id: z.string().optional(),
    name: z.string().optional(),
    email: z.string().optional().nullable(),
    image: z.string().optional().nullable(),
  })
  .passthrough();

export const payeeInviteResponseSchema = z
  .object({
    id: z.string().optional(),
    _id: z.string().optional(),
    payeeId: z.string().optional(),
    name: z.string().optional(),
    type: z.string().optional(),
    payee: payeeInvitePayeeSchema.optional(),
    email: z.string(),
    status: z.string().optional(),
    organization: z
      .object({
        name: z.string().optional(),
      })
      .passthrough()
      .optional(),
    payeeImage: z.string().optional().nullable(),
    rejectedReason: z.string().optional().nullable(),
    respondedAt: z.string().optional().nullable(),
    createdBy: inviteUserSchema.optional(),
    updatedBy: inviteUserSchema.optional(),
    expiresAt: z.string(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  })
  .passthrough()
  .refine((value) => Boolean(value.id || value._id), {
    message: 'Payee invite response must include id or _id',
  });

const payeeInviteListDataSchema = z.object({
  data: z.array(payeeInviteResponseSchema),
  total: z.number(),
});

export const payeeInviteListResponseSchema = z.union([
  payeeInviteListDataSchema,
  z.array(payeeInviteResponseSchema),
]);

export const payeeInviteSingleResponseSchema = z.union([
  payeeInviteResponseSchema,
  z.object({ data: payeeInviteResponseSchema }).passthrough(),
]);

export type PayeeInviteResponse = z.infer<typeof payeeInviteResponseSchema>;
export type PayeeInviteListResponse = z.infer<typeof payeeInviteListResponseSchema>;
export type PayeeInviteSingleResponse = z.infer<typeof payeeInviteSingleResponseSchema>;
