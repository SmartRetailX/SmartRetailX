import {
  ApiResponsePayoutsByPayees,
  ApiResponsePayoutsByPayeesSchema,
  PayeeItem,
} from '@/schemas/response-validation/payout.response';
import { PaginationApiResponse } from '@/types/api';
import { IPayoutBase, IPayoutsByPayees } from '@/types/payout';
import { parseIsoToDate, toNumberSafe } from '@/utils/parsers';

/**
 * Map a single PayeeItem -> Payouts by Payees
 */
export function mapPayeeItemToPayoutsByPayees(item: PayeeItem): IPayoutsByPayees {
  const paymentInfo = item.payeeDetails?.paymentInfo ?? {};
  const mappedPayeeId = item._id ?? item.id ?? item.payeeDetails?._id ?? item.payeeDetails?.id;
  const mappedPayeeName = item.payeeDetails?.name?.trim() || 'Unknown payee';
  const mappedPayeeEmail = item.payeeDetails?.email?.trim() || null;

  const payouts: IPayoutBase[] = (item.payouts ?? []).map((p) => ({
    id: p._id ?? p.id ?? p.identifier,
    identifier: p.identifier,
    amount: toNumberSafe(p.payout_amount, 0),
    status: p.status,
    createdAt: parseIsoToDate(p.createdAt),
    version: p.version,
  }));

  return {
    payeeId: mappedPayeeId ?? '',
    payeeName: mappedPayeeName,
    payeeEmail: mappedPayeeEmail,
    payeeImage: item.payeeDetails.image,
    type: item.payeeDetails.type,
    preferredCurrency: paymentInfo?.preferredCurrency ?? null,
    totalPayouts: toNumberSafe(item.totalPayouts, 0),
    totalAmount: toNumberSafe(item.totalAmount, 0),
    totalGrossEarnings: toNumberSafe(item.totalGrossEarnings, 0),
    totalExpenses: toNumberSafe(item.totalExpenses ?? 0, 0),
    latestPayoutDate: parseIsoToDate(item.latestPayoutDate),
    payouts, // payout array
  };
}

/**
 * Map full API response -> array of Payout by Payees and totals
 * - Optionally performs Zod validation when `validate` is true (default: true).
 * - If validation fails, throws with the Zod error.
 */
export function mapApiResponseToPayoutsWithTotals(
  data: ApiResponsePayoutsByPayees,
  options?: { validate?: boolean },
): PaginationApiResponse<IPayoutsByPayees> {
  const validate = options?.validate ?? true;

  if (validate) {
    const parsed = ApiResponsePayoutsByPayeesSchema.safeParse(data);

    if (!parsed.success) {
      console.error('Payouts by Payees API response validation errors:', parsed.error.format());
      // rethrow as friendly error
      throw new Error(
        `Invalid API response shape: ${parsed.error.errors
          .map((e) => `${e.path.join('.')}: ${e.message}`)
          .join('; ')}`,
      );
    }
  }

  const mappedData: IPayoutsByPayees[] = data.data.map(mapPayeeItemToPayoutsByPayees);
  return {
    data: mappedData,
    total: data.total,
  };
}
