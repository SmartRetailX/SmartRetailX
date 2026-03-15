import { z } from 'zod';

import { EXPENSE_CONDITION_TYPE, EXPENSE_STATUS } from '@/types/expense';

export const expenseCategorySchema = z
  .object({
    _id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    color: z.string(),
    createdBy: z
      .object({
        _id: z.string(),
        email: z.string(),
      })
      .or(z.string()),
    updatedBy: z
      .object({
        _id: z.string(),
        email: z.string(),
      })
      .optional(),
    createdAt: z.string().or(z.date()),
    updatedAt: z.string().or(z.date()),
    __v: z.number().optional(),
  })
  .passthrough();

export const expenseListItemSchema = z.object({
  _id: z.string(),
  dateReceived: z.string().nullable().optional(),
  paymentDate: z.string().nullable().optional(),
  reference: z.string().nullable().optional(),
  status: z.nativeEnum(EXPENSE_STATUS),
  amount: z.number(),
  category: expenseCategorySchema,
  payee: z.string(), // ID
  payeeName: z.string(),
  label: z.string(), // ID
  labelName: z.string(),
  items: z.array(z.string()), // IDs
  createdBy: z.object({
    _id: z.string(),
    email: z.string(),
  }),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const expenseListResponseSchema = z.object({
  data: z.array(expenseListItemSchema),
  total: z.number(),
});

// Detailed Schemas

export const contractSchema = z
  .object({
    _id: z.string(),
    title: z.string(),
    isrc: z.string(),
    catalogNo: z.string(),
    // Add other contract fields if needed, kept minimal based on usage
  })
  .passthrough();

export const expenseItemPayeeRuleSchema = z.object({
  value: z.number(),
  isFallback: z.boolean().optional(),
  _id: z.string().optional(),
});

export const expenseItemPayeeSchema = z.object({
  payee: z
    .object({
      _id: z.string(),
      name: z.string(),
      email: z.string(),
      type: z.string(),
      // Add other payee fields as needed for detail view
    })
    .passthrough(),
  amount: z.number(),
  rules: z.array(expenseItemPayeeRuleSchema).optional(),
  condition: z
    .object({
      type: z.nativeEnum(EXPENSE_CONDITION_TYPE),
      value: z.number(),
    })
    .optional(),
});

export const expenseItemSchema = z.object({
  _id: z.string(),
  contract: contractSchema,
  details: z.string().optional(),
  amount: z.number(),
  payees: z.array(expenseItemPayeeSchema),
});

export const expenseDetailSchema = z.object({
  _id: z.string(),
  dateReceived: z.string().nullable().optional(),
  paymentDate: z.string().nullable().optional(),
  reference: z.string().nullable().optional(),
  status: z.nativeEnum(EXPENSE_STATUS),
  amount: z.number(),
  category: expenseCategorySchema,
  payee: z
    .object({
      _id: z.string(),
      name: z.string(),
      email: z.string(),
      type: z.string(),
      // Add full payee fields if needed
    })
    .passthrough(),
  payeeName: z.string(),
  label: z
    .object({
      _id: z.string(),
      name: z.string(),
    })
    .passthrough(),
  labelName: z.string(),
  items: z.array(expenseItemSchema),
  createdBy: z.object({
    _id: z.string(),
    email: z.string(),
  }),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ExpenseListItemResponse = z.infer<typeof expenseListItemSchema>;
export type ExpenseListResponse = z.infer<typeof expenseListResponseSchema>;
export type ExpenseDetailResponse = z.infer<typeof expenseDetailSchema>;
