import { PAYEE_ROLE } from '@/constants';
import { PayoutsByGroupResponse as ApiResponse } from '@/schemas/response-validation/payout-by-group.response';
import { PAYOUT_STATUS } from '@/types/payout';
import {
  IPayeeDetails,
  IPayoutByGroup,
  IPayoutSummary,
  PayoutsByGroupResponse,
} from '@/types/payout-by-group';

/**
 * Maps a single payout summary from API response
 */
function mapPayoutSummary(payout: ApiResponse['data'][0]['payouts'][0]): IPayoutSummary {
  return {
    _id: payout._id,
    identifier: payout.identifier,
    payout_amount: payout.payout_amount,
    status: payout.status as PAYOUT_STATUS,
    createdAt: new Date(payout.createdAt),
    version: payout.version,
  };
}

/**
 * Maps payee details from API response
 */
function mapPayeeDetails(details: ApiResponse['data'][0]['payeeDetails']): IPayeeDetails {
  return {
    _id: details._id,
    name: details.name,
    email: details.email,
    type: details.type as PAYEE_ROLE,
    image: details.image,
    aliases: details.aliases,
    internalPayee: details.internalPayee,
    additionalInformation: details.additionalInformation,
    paymentInfo: details.paymentInfo,
    meta: details.meta,
    createdAt: new Date(details.createdAt),
    updatedAt: new Date(details.updatedAt),
    createdBy: details.createdBy,
    updatedBy: details.updatedBy,
  };
}

/**
 * Maps a single payout by group item from API response
 */
function mapPayoutByGroup(item: ApiResponse['data'][0]): IPayoutByGroup {
  return {
    _id: item._id,
    totalPayouts: item.totalPayouts,
    totalAmount: item.totalAmount,
    totalGrossEarnings: item.totalGrossEarnings,
    totalExpenses: item.totalExpenses,
    latestPayoutDate: new Date(item.latestPayoutDate),
    payouts: item.payouts.map(mapPayoutSummary),
    payeeDetails: mapPayeeDetails(item.payeeDetails),
  };
}

/**
 * Maps payouts by group response from API to domain model
 */
export function mapPayoutsByGroup(response: ApiResponse): PayoutsByGroupResponse {
  return {
    data: response.data.map(mapPayoutByGroup),
    total: response.total,
  };
}
