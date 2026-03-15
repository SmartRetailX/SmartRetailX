import { PAYEE_ROLE } from '@/constants';
import { ContractAnomalyType, PayeeAnomalyType } from '@/constants/anomalies';

export interface AnomalyGroup<T extends string> {
  type: T;
  count: number;
}

export interface AnomalyCount<T extends string> {
  groups: AnomalyGroup<T>[];
  total: number;
}

export type ContractAnomalyCount = AnomalyCount<ContractAnomalyType>;
export type PayeeAnomalyCount = AnomalyCount<PayeeAnomalyType>;

export interface ContractAnomaly {
  contract: {
    id: string;
    isrc: string | null;
    catalogNumber: string;
    payees?: { id: string }[];
    releaseDate: string | null;
    releaseTitle: string | null;
    title: string;
    upc: string | null;
    version: string | null;
  };
  types: ContractAnomalyType[];
}

export interface PayeeAnomaly {
  payee: {
    id: string;
    name: string;
    isHidden: boolean;
    sourceId: string;
    aliases?: string[];
    internalPayee: boolean;
    email?: string;
    type: PAYEE_ROLE;
  };
  types: PayeeAnomalyType[];
}
