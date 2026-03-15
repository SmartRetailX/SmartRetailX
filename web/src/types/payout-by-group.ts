import { PAYEE_ROLE } from '@/constants';

import { PAYOUT_STATUS } from './payout';

/**
 * Payout summary in group response
 */
export interface IPayoutSummary {
  _id: string;
  identifier: string;
  payout_amount: number;
  status: PAYOUT_STATUS;
  createdAt: Date;
  version: number;
}

/**
 * Payee details in group response
 */
export interface IPayeeDetails {
  _id: string;
  name: string;
  email?: string;
  type: PAYEE_ROLE;
  image?: string;
  aliases?: string[];
  internalPayee?: boolean;
  additionalInformation?: {
    realName?: string;
    otherMembers?: Array<{ name?: string }>;
  };
  paymentInfo?: {
    address?: {
      addressLine1?: string;
      addressLine2?: string;
      city?: string;
      state?: string;
      country?: string;
      postalCode?: string;
    };
    taxId?: string;
    preferredCurrency?: string;
  };
  meta?: {
    spotifyUri?: string | null;
    sourceId?: string;
  };
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
}

/**
 * Payout by group item (grouped by payee)
 */
export interface IPayoutByGroup {
  _id: string; // Payee ID
  totalPayouts: number;
  totalAmount: number;
  totalGrossEarnings: number;
  totalExpenses: number;
  latestPayoutDate: Date;
  payouts: IPayoutSummary[];
  payeeDetails: IPayeeDetails;
}

/**
 * Payouts by group response with pagination
 */
export interface PayoutsByGroupResponse {
  data: IPayoutByGroup[];
  total: number;
}
