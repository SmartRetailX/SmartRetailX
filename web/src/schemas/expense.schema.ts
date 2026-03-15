import * as z from 'zod';

import { EXPENSE_CONDITION_TYPE, EXPENSE_STATUS } from '@/types/expense';

const objectIdSchema = (fieldName: string) =>
  z
    .string({ required_error: `${fieldName} is required` })
    .min(1, `${fieldName} is required`)
    .regex(/^[a-fA-F0-9]{24}$/, `${fieldName} must be a valid 24-character hex string`);

// Nested schemas for contracts, payees, conditions, and rules
const ruleSchema = z
  .object({
    percentage: z.union([z.number(), z.string()]).transform((val) => Number(val) || 0),
    fromDate: z.string().optional(),
    toDate: z.string().optional(),
    isFallback: z.boolean(),
  })
  .refine(
    (data) => {
      return data.percentage >= 0 && data.percentage <= 100;
    },
    {
      message: 'Percentage must be between 0 and 100',
      path: ['percentage'],
    },
  )
  .refine(
    (data) => {
      if (data.fromDate && data.toDate) {
        return new Date(data.toDate) >= new Date(data.fromDate);
      }
      return true;
    },
    {
      message: 'End date must be after start date',
      path: ['toDate'],
    },
  );

const conditionSchema = z
  .object({
    type: z.nativeEnum(EXPENSE_CONDITION_TYPE),
    value: z.string(),
  })
  .refine(
    (data) => {
      if (data.type !== EXPENSE_CONDITION_TYPE.AFTER_DATE) {
        return Number(data.value) >= 0;
      }
      return true;
    },
    {
      message: 'Condition value cannot be negative',
      path: ['value'],
    },
  );

const payeeSchema = z
  .object({
    payeeId: objectIdSchema('Payee ID'),
    amount: z.number(),
    exclude: z.array(z.string()).optional(),
    include: z.array(z.string()).optional(),
    condition: conditionSchema.optional(),
    rules: z.array(ruleSchema).optional(),
    guarantorContracts: z.array(z.string()).optional(),
    guarantorRecoupStartDate: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.guarantorRecoupStartDate &&
      (!data.guarantorContracts || data.guarantorContracts.length === 0)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Guarantor contracts are required when a recoup start date is provided.',
        path: ['guarantorContracts'],
      });
    }

    if (!data.rules || data.rules.length === 0) {
      return;
    }

    const fallbackCount = data.rules.filter((rule) => rule.isFallback).length;
    if (fallbackCount !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Each payee must have exactly one fallback rule.',
        path: ['rules'],
      });
    }

    if (!data.rules[0]?.isFallback) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'First rule must be the fallback rule.',
        path: ['rules', 0, 'isFallback'],
      });
    }

    data.rules.forEach((rule, ruleIndex) => {
      if (ruleIndex === 0) {
        return;
      }

      if (!rule.fromDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'From date is required for additional rules.',
          path: ['rules', ruleIndex, 'fromDate'],
        });
      }

      if (!rule.toDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'To date is required for additional rules.',
          path: ['rules', ruleIndex, 'toDate'],
        });
      }
    });
  });

const contractSchema = z.object({
  contractId: objectIdSchema('Contract ID'),
  details: z.string().optional(),
  amount: z.number().min(0, 'Amount must be a positive number'),
  payees: z.array(payeeSchema),
});
export type RepaymentAllocation = z.infer<typeof contractSchema>;

const baseExpenseSchema = z.object({
  reference: z.string().min(1, 'Reference is required'),
  amount: z.number().gt(0, 'Amount is required and must be greater than 0'),
  category: objectIdSchema('Category ID'),
  dateReceived: z.string().optional(),
  paymentDate: z.string().optional(),
  payee: objectIdSchema('Payee'),
  label: objectIdSchema('Label ID'),
  status: z.nativeEnum(EXPENSE_STATUS),
  contracts: z.array(contractSchema).min(1, 'At least one contract is required'),
  fileKey: z.string().optional(),
});

export const expenseSchema = baseExpenseSchema.refine(
  (data) => {
    if (!data.contracts || data.contracts.length === 0) return true;
    const totalAllocated = data.contracts.reduce((sum, c) => sum + (c.amount || 0), 0);
    return totalAllocated.toFixed(2) === Number(data.amount).toFixed(2);
  },
  {
    message: 'Total allocated amount must equal the expense value.',
    path: ['contracts'],
  },
);

export const updateExpenseSchema = baseExpenseSchema
  .extend({
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    _id: z.string().optional(),
  })
  .refine(
    (data) => {
      if (!data.contracts || data.contracts.length === 0) return true;
      const totalAllocated = data.contracts.reduce((sum, c) => sum + (c.amount || 0), 0);
      return totalAllocated.toFixed(2) === Number(data.amount).toFixed(2);
    },
    {
      message: 'Total allocated amount must equal the expense value.',
      path: ['contracts'],
    },
  );

export type ExpenseSchemaType = z.infer<typeof baseExpenseSchema>;
export type UpdateExpenseSchemaType = z.infer<typeof updateExpenseSchema>;
