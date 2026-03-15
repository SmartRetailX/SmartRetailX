import { SUPPORTED_DISTRIBUTION_PLATFORMS } from '@/constants';

export enum TransactionType {
  ROYALTY_INCOME = 'royalty-income',
  EXPENSE_RECOVERY = 'expense-recovery',
}

export interface Transaction {
  _id: string;
  isrc: string;
  month: number;
  source: SUPPORTED_DISTRIBUTION_PLATFORMS;
  payee: {
    _id: string;
    email: string;
    name: string;
  };
  type: TransactionType;
  year: number;
  amount: number;
  paid: boolean;
  createdAt: Date;
  updatedAt: Date;
}
