import { PAYEE_ROLE } from '@/constants';
import { PaginationApiResponse } from '@/types/api';

import { EXPENSE_STATUS } from './expense';

export interface IPayeeAddress {
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
}

export interface Payee {
  _id: string;
  name: string;
  email: string;
  type: PAYEE_ROLE;
  internalPayee?: boolean;
  image?: string;
  aliases?: string[];
  paymentInfo?: Record<string, unknown>;
  totalIncome: number;
  meta: {
    spotifyUri?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface MergedPayee extends Payee {
  linkedPayees: { _id: string; name: string; email: string }[];
  isHidden: boolean;
}

// Use the generic type instead of specific PayeesResponse
export type PayeesResponse = PaginationApiResponse<Payee>;
export type MergedPayeesResponse = PaginationApiResponse<MergedPayee>;

export interface SelectedPayee {
  id: string;
  name: string;
  email: string;
  type: PAYEE_ROLE.ARTIST | PAYEE_ROLE.LABEL;
  split: number;
  image?: string;
}

export interface ContractDiff {
  id: string;
  isrc: string;
  label: {
    id: string;
    name: string;
  };
  payeeCount: number;
  releaseDate?: string;
  releaseTitle?: string;
  upc?: string;
  image?: string;
}

export interface ExpenseDiff {
  expense: {
    id: string;
    amount: number;
    payee: {
      id: string;
      email?: string;
      name: string;
    };
    label: {
      id: string;
      name: string;
    };
    reference: string;
    status: EXPENSE_STATUS;
  };
  totalOwed: number;
  totalPaid: number;
  remainingAmount: number;
}

export interface BasePayee {
  id: string;
  name: string;
  email: string;
  type: PAYEE_ROLE;
  image?: string;
  address: IPayeeAddress;
  preferredCurrency?: string;
  aliases?: string[];
}

export interface MergePreviewPayee extends BasePayee {
  contractsCount: number;
  totalRemainingObligations: number;
  payableRoyalties: number;
}

export interface PayeeMergePreview {
  masterPayee: MergePreviewPayee;
  mergePayee: MergePreviewPayee;
  impact: {
    contracts: ContractDiff[];
    expenses: ExpenseDiff[];
    totalRemainingObligations: number;
    linkedPayeesCount: number;
  };
}

export interface PayeeOverviewRoyalty {
  month: number;
  year: number;
  totalEarnings: number;
  totalStreams: number;
}

export interface PayeeOverview {
  totalRoyaltyIncome: number;
  totalExpenseRecovery: number;
  totalPayout: number;
  availableToPay: number;
  totalIncomeFromES: number;
  contractCount: number;
  last3MonthsRoyalties: PayeeOverviewRoyalty[];
}
