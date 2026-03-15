import { PaginationApiResponse } from './api';
import { Contract } from './contract';
import { Distro } from './distro';
import { Label } from './label';
import { Payee } from './payee';

export enum EXPENSE_CONDITION_TYPE {
  AFTER_TOTAL_EARNINGS = 'after_total_earnings', // condition based on total earnings after a certain date
  AFTER_DATE = 'after_date', // condition based on a specific date
}

export enum EXPENSE_STATUS {
  PENDING = 'pending', // expense is pending approval
  PAID = 'paid', // expense has been paid
}

export interface ExpenseCategory {
  id: string;
  name: string;
  description?: string;
  color: string;
  createdBy?: {
    id: string;
    email: string;
  };
  updatedBy?: {
    id: string;
    email: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Expense {
  _id: string;
  dateReceived?: Date;
  paymentDate?: Date;
  reference?: string;
  status: EXPENSE_STATUS;
  amount: number;
  recoupedAmount?: number;
  category: ExpenseCategory;
  payee: Payee;
  payeeName: string;
  label: Label;
  labelName: string;
  items: ExpenseItem[];
  createdBy: {
    _id: string;
    email: string;
  };
  updatedBy: {
    _id: string;
    email: string;
  };
  fileKey?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExpenseItem {
  contract: Contract;
  details?: string;
  amount: number;
  payees: {
    payee: Payee;
    amount: number;
    recoupedAmount?: number;
    condition?: {
      type: EXPENSE_CONDITION_TYPE;
      value: string | number;
    };
    rules?: Array<{
      percentage?: number;
      fromDate?: string;
      toDate?: string;
      isFallback?: boolean;
    }>;
    guarantorContracts?: string[];
    guarantorRecoupStartDate?: string;
  }[];
}

export interface ExpenseCategory {
  id: string;
  name: string;
  description?: string;
  color: string;
  createdBy?: {
    id: string;
    email: string;
  };
  updatedBy?: {
    id: string;
    email: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export type ExpenseListItem = Pick<
  Expense,
  | '_id'
  | 'dateReceived'
  | 'paymentDate'
  | 'reference'
  | 'status'
  | 'amount'
  | 'recoupedAmount'
  | 'payeeName'
  | 'labelName'
  | 'createdAt'
  | 'updatedAt'
> & {
  category: ExpenseCategory;
  // Mapped string IDs to objects for type compatibility if needed, or kept as strings if that's what comes from API
  // But based on JSON: payee and label are strings (IDs) in list view.
  // However, Expense interface has objects.
  payee: string; // ID
  label: string; // ID
  items: string[]; // IDs
};

export type ExpenseResponse = PaginationApiResponse<ExpenseListItem>;

export type ExpenseTransaction = {
  month: number;
  year: number;
  amount: number;
  payee: Payee;
  contract: Contract;
  distro: Distro;
  isrc: string;
  royaltyUpload: {
    _id: string;
    reference: string;
    month: number;
    year: number;
    fileKey: string;
    fileName: string;
    status: string;
  };
};
