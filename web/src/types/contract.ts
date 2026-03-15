import { Payee } from './payee';

export interface Contract {
  _id: string;
  title: string;
  description: string;
  image?: string;
  upc: string;
  catalogNo: string;
  copyright: string;
  createdAt: string | Date;
  updatedAt: string | Date;
  customGenre: string;
  mainGenre: string;
  label: {
    _id: string;
    name: string;
  };
  payees: {
    _id: string;
    type: string;
    split: number;
    id: Payee;
  }[];
  createdBy:
    | string
    | {
        firstName: string;
        lastName: string;
      };
  updatedBy:
    | string
    | {
        firstName: string;
        lastName: string;
      };
  isrc: string;
  publisher: string;
  releaseTitle: string;
  royalties?: number;
  labelShare?: number;
  releaseDate: string | Date;
  spotifyUrl: string;
  version: string;
}

export interface ContractResponse {
  data: Contract[];
  total: number;
}

export interface ContractOverview {
  _id: string;
  downloads: number;
  labelShare: number;
  expenses: number;
  last3RoyaltyTotal: number;
  totalEarnings: number;
  totalStreams: number;
  payees: {
    payee: string;
    earnings: number;
  }[];
}

// Updated Types
export interface LinkedContract {
  _id: string;
  title: string;
  version: string;
  releaseTitle?: string;
  image?: string;
}
