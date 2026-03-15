import { ROYALTY_IMPORT_STATUS } from '@/constants';

import { Contract } from './contract';
import { Transaction } from './transaction';
import { UploadedBy } from './user';

export interface PayableRoyalty {
  transactions: Transaction[];
  contracts: Contract[];
}

// Updated Types
export interface Royalty {
  id: string;
  month: number;
  year: number;
  totalEarnings: number;
  totalStreams: number;
  date?: string;
  isrc?: string;
  distro?: {
    id: string;
    name: string;
  };
  royaltyUpload?: {
    id: string;
    reference: string;
    createdAt?: string;
  };
}

export type RoyaltyImportStatus =
  (typeof ROYALTY_IMPORT_STATUS)[keyof typeof ROYALTY_IMPORT_STATUS];

export interface RoyaltyImportBase {
  id: string;
  months: { month: number; year: number }[];
  file: {
    name: string;
    size: number;
    key: string;
  };
  status: RoyaltyImportStatus;
  parsedValue: number;
  labelShare: number;
  failureReason?: string;
  uploadedBy: UploadedBy;
  createdAt: string;
  updatedAt: string;
}

export type RoyaltyImport = RoyaltyImportBase;

// Contract Royalty (data for a specific contract)
export interface ContractRoyalty {
  id: string;
  month: number;
  year: number;
  totalEarnings: number;
  totalStreams: number;
  date?: string;
  isrc?: string;
  distro?: {
    id: string;
    name: string;
  };
  royaltyUpload?: {
    id: string;
    reference: string;
    createdAt?: string;
  };
}

// All royalty uploads response (includes distro information)
export interface AllRoyaltyUpload extends RoyaltyImportBase {
  distroId: string;
  distroName: string;
  distroImage?: string;
}

export type RoyaltyUploadSummaryType = 'payee' | 'contract' | 'dsp' | 'country';

interface RoyaltyUploadSummaryOverview {
  totalEarnings: number;
  totalStreams: number;
  royaltiesCount: number;
}

interface RoyaltyUploadSummaryContractDsp {
  dsp: string;
  earnings: number;
  streams: number;
}

interface RoyaltyUploadSummaryContract {
  earnings: number;
  streams: number;
  dsps: RoyaltyUploadSummaryContractDsp[];
  contract: {
    id: string;
    title: string;
    isrc: string;
    upc?: string;
    mix?: string;
  };
}

interface RoyaltyUploadSummaryDsp {
  earnings: number;
  streams: number;
  dsp: string;
}

interface RoyaltyUploadSummaryCountry {
  earnings: number;
  streams: number;
  country: string;
}

interface RoyaltyUploadSummaryPayee {
  payee: {
    id: string;
    name: string;
    email?: string;
    image?: string;
  };
  totalEarnings: number;
  contracts: {
    contract: {
      id: string;
      title: string;
      isrc: string;
      upc?: string;
      mix?: string;
    };
    earnings: number;
  }[];
}

export type RoyaltyUploadSummaryByType<T extends RoyaltyUploadSummaryType | undefined> =
  T extends 'contract'
    ? RoyaltyUploadSummaryContract[]
    : T extends 'dsp'
      ? RoyaltyUploadSummaryDsp[]
      : T extends 'country'
        ? RoyaltyUploadSummaryCountry[]
        : T extends 'payee'
          ? RoyaltyUploadSummaryPayee[]
          : RoyaltyUploadSummaryOverview;

export type RoyaltyUploadSummary =
  | RoyaltyUploadSummaryOverview
  | RoyaltyUploadSummaryContract[]
  | RoyaltyUploadSummaryDsp[]
  | RoyaltyUploadSummaryCountry[]
  | RoyaltyUploadSummaryPayee[];
