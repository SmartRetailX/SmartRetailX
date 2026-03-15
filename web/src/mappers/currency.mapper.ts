import { CurrencyRateResponse } from '@/schemas/response-validation/currency.schema';
import { CurrencyRate } from '@/types/currency';

export const mapCurrencyRate = (response: CurrencyRateResponse): CurrencyRate => {
  return {
    source: response.source,
    target: response.target,
    rate: response.rate,
    time: new Date(response.time),
  };
};
