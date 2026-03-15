import { PaginationApiResponse } from './api';

export interface PayeeInvite {
  id: string;
  payeeId?: string;
  name?: string;
  type?: string;
  payee?: {
    id?: string;
    name?: string;
    email?: string;
    image?: string;
  };
  organization?: {
    name?: string;
  };
  createdBy?: {
    id?: string;
    name?: string;
    email?: string;
  };
  updatedBy?: {
    id?: string;
    name?: string;
    email?: string;
  };
  email?: string;
  rejectedReason?: string;
  respondedAt?: string;
  payeeImage?: string;
  status?: string;
  expiresAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type PayeeInviteList = PaginationApiResponse<PayeeInvite>;
