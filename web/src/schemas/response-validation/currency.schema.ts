import { z } from 'zod';

export const currencyRateResponseSchema = z.object({
  source: z.string(),
  target: z.string(),
  rate: z.number(),
  time: z.string(),
});

export type CurrencyRateResponse = z.infer<typeof currencyRateResponseSchema>;
