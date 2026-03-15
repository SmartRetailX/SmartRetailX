import {
  PayeeOverviewApiResponse,
  PayeeOverviewResponse,
} from '@/schemas/response-validation/payee-overview.response';
import { PayeeOverview } from '@/types/payee';

const unwrap = (response: PayeeOverviewApiResponse): PayeeOverviewResponse => {
  if ('data' in response && response.data) {
    return response.data;
  }
  return response;
};

export const mapPayeeOverview = (response: PayeeOverviewApiResponse): PayeeOverview => {
  const data = unwrap(response);

  return {
    totalRoyaltyIncome: data.totalRoyaltyIncome,
    totalExpenseRecovery: data.totalExpenseRecovery,
    totalPayout: data.totalPayout,
    availableToPay: data.availableToPay,
    totalIncomeFromES: data.totalIncomeFromES ?? 0,
    contractCount: data.contractCount ?? 0,
    last3MonthsRoyalties: (data.last3MonthsRoyalties ?? []).map((item) => ({
      month: item.month,
      year: item.year,
      totalEarnings: item.totalEarnings ?? item.earnings ?? item.amount ?? 0,
      totalStreams: item.totalStreams ?? item.streams ?? 0,
    })),
  };
};
