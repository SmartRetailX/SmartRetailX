import z from 'zod';

import { PAYEE_ROLE } from '@/constants';
import { CONTRACT_ANOMALY_TYPES, PAYEE_ANOMALY_TYPES } from '@/constants/anomalies';

const contractAnomalyTypeSchema = z.nativeEnum(CONTRACT_ANOMALY_TYPES);
const payeeAnomalyTypeSchema = z.nativeEnum(PAYEE_ANOMALY_TYPES);

const contractAnomalyGroupSchema = z.object({
  type: contractAnomalyTypeSchema,
  count: z.number(),
});

const payeeAnomalyGroupSchema = z.object({
  type: payeeAnomalyTypeSchema,
  count: z.number(),
});

export const contractAnomalyCountSchema = z.object({
  byType: z.array(contractAnomalyGroupSchema),
  totalCount: z.number(),
});

export const payeeAnomalyCountSchema = z.object({
  byType: z.array(payeeAnomalyGroupSchema),
  totalCount: z.number(),
});

const anomalyResponseSchema = z.object({
  data: z.object({}),
  total: z.number(),
});

const contractAnomalySchema = z.object({
  contract: z.object({
    _id: z.string(),
    isrc: z.string().optional(),
    catalogNo: z.string().optional(),
    payees: z.array(z.object({ id: z.string() })).optional(),
    releaseDate: z.string().optional(),
    releaseTitle: z.string().optional(),
    title: z.string(),
    upc: z.string().optional(),
    version: z.string().optional(),
  }),
  anomalyTypes: z.array(z.nativeEnum(CONTRACT_ANOMALY_TYPES)),
});

const payeeAnomalySchema = z.object({
  payee: z.object({
    _id: z.string(),
    isHidden: z.boolean().optional(),
    meta: z.object({
      sourceId: z.string(),
    }),
    aliases: z.array(z.string()).optional(),
    internalPayee: z.boolean(),
    name: z.string(),
    email: z.string().optional(),
    type: z.nativeEnum(PAYEE_ROLE),
  }),
  anomalyTypes: z.array(z.nativeEnum(PAYEE_ANOMALY_TYPES)),
});

export const contractAnomalyListSchema = anomalyResponseSchema.extend({
  data: z.array(contractAnomalySchema),
  total: z.number(),
});

export const payeeAnomalyListSchema = anomalyResponseSchema.extend({
  data: z.array(payeeAnomalySchema),
  total: z.number(),
});

// Counts
export type ContractAnomalyCountResponse = z.infer<typeof contractAnomalyCountSchema>;
export type PayeeAnomalyCountResponse = z.infer<typeof payeeAnomalyCountSchema>;

// Anomalies
export type ContractAnomalyResponse = z.infer<typeof contractAnomalySchema>;
export type PayeeAnomalyResponse = z.infer<typeof payeeAnomalySchema>;
export type ContractAnomalyListResponse = z.infer<typeof contractAnomalyListSchema>;
export type PayeeAnomalyListResponse = z.infer<typeof payeeAnomalyListSchema>;
