import { PAYEE_ROLE } from '@/constants';

import { Contract } from './contract';
import { Payee } from './payee';
import { Transaction } from './transaction';
import { CreatedBy, UpdatedBy } from './user';

/**
 * Payout entry
 */
export interface IPayoutBase {
  id: string;
  identifier: string;
  amount: number;
  status: PAYOUT_STATUS;
  createdAt: Date | null;
  version: number;
}

export interface PayoutStatement {
  _id: string;
  originalName: string;
  mimeType: string;
  size: number;
  key: string;
  tags: string[];
  uploadedBy: string;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface Payout {
  _id: string;
  identifier: string;
  opening_balance: number;
  gross_earnings: number;
  total_expenses: number;
  payout_amount: number;
  payee: Payee | string;
  payeeName: string;
  payeeEmail?: string | null;
  status: PAYOUT_STATUS;
  rolledPayouts: string[];
  version: number;
  reason?: PAYOUT_STATUS.CANCELLED extends PAYOUT_STATUS ? string : never;
  createdBy: {
    _id: string;
    email: string;
  };
  updatedBy: {
    _id: string;
    email: string;
  };
  createdAt: Date;
  updatedAt: Date;
  // Added
  contracts: Contract[];
  transactions: Transaction[];
  statement?: PayoutStatement | null;
}

/**
 * Payouts by payees
 */
export interface IPayoutsByPayees {
  payeeId: string;
  payeeName: string;
  payeeEmail?: string | null;
  payeeImage?: string | null;
  type: PAYEE_ROLE;
  preferredCurrency?: string | null;
  totalPayouts: number;
  totalAmount: number;
  totalExpenses: number;
  totalGrossEarnings: number;
  latestPayoutDate: Date | null;
  payouts: IPayoutBase[];
  // address?: IPayeeAddress | null;
  // paymentInfo?: Record<string, any> | null;
}

export interface PayoutsByPayeesWithPagination {
  data: IPayoutsByPayees[];
  total: number;
}

// Payout Group Types
export enum PayoutGroupType {
  COUNTRY = 'country',
  CURRENCY = 'currency',
  AMOUNT = 'amount',
  CUSTOM = 'custom',
}

export interface AmountRange {
  from?: number;
  to?: number;
}

interface BasePayoutGroup {
  id: string;
  type: PayoutGroupType;
  name: string;
  isActive?: boolean; // Optional since backend doesn't always return it
  createdAt: Date;
  updatedAt: Date;
  createdBy: CreatedBy;
  updatedBy: UpdatedBy;
}

/** Specific variants — discriminated by `type` */
export interface CountryPayoutGroup extends BasePayoutGroup {
  type: PayoutGroupType.COUNTRY;
  countryValues: string[]; // required for country
}

export interface CurrencyPayoutGroup extends BasePayoutGroup {
  type: PayoutGroupType.CURRENCY;
  currencyValues: string[]; // required for currency
}

export interface AmountPayoutGroup extends BasePayoutGroup {
  type: PayoutGroupType.AMOUNT;
  range?: AmountRange; // optional if range can be partially specified
}

export interface CustomPayoutGroup extends BasePayoutGroup {
  type: PayoutGroupType.CUSTOM;
  payeeIds: string[]; // required for custom
}

export interface PopulatedPayee {
  id: string;
  email: string;
  name: string;
  image?: string;
}

export interface CustomPayoutGroupPopulated extends BasePayoutGroup {
  type: PayoutGroupType.CUSTOM;
  payees: PopulatedPayee[]; // populated payees for by-id response
}

/** Discriminated union of all variants */
export type IPayoutGroup =
  | CountryPayoutGroup
  | CurrencyPayoutGroup
  | AmountPayoutGroup
  | CustomPayoutGroup;

export type IPayoutGroupPopulated =
  | CountryPayoutGroup
  | CurrencyPayoutGroup
  | AmountPayoutGroup
  | CustomPayoutGroupPopulated;

export enum PAYOUT_STATUS {
  CREATED = 'created',
  SENT = 'sent',
  INVOICE_RECEIVED = 'invoice_received',
  INVOICE_PAID = 'invoice_paid',
  CANCELLED = 'cancelled',
  FAILED = 'failed',
  REGENERATED = 'regenerated', // This status indicates that the payout version has been superseded by a regenerated version
  ROLLED_OVER = 'rolled_over', // This status indicates that the payout has been rolled over to the next period
}
