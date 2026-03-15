import { ORGANIZATION_ROLE, PAYEE_ROLE } from '@/constants';

import { CreatedBy } from './user';

export interface ITicketMessage {
  _id: string; // _id from MongoDB
  user: string; // userId
  createdAt: string; // ISO date string
  content: string;
  attachmentKeys: string[];
}

export interface ITicketUser {
  id: string;
  email?: string;
  name: string;
  image?: string;
  type: PAYEE_ROLE | ORGANIZATION_ROLE;
}

export interface ITicketAttachment {
  _id: string;
  originalName: string;
  mimeType: string;
  size: number;
  key: string;
  tags: string[];
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ITicket {
  id: string;
  ticketId: string;
  contracts: {
    id: string;
    title: string;
    upc?: string;
    isrc?: string;
    image?: string;
  }[];
  subject: string;
  description: string;
  isClosed: boolean;
  progress: string;
  assignedPayees?: ITicketUser[];
  assignedUsers?: ITicketUser[];
  category: {
    id: string;
    name: string;
    description: string;
    color: string;
    icon: string;
  };
  attachments?: ITicketAttachment[];
  createdBy: CreatedBy;
  updatedBy?: string; // userId (optional)
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

export interface ITicketItem {
  id: string;
  ticketId: string;
  content: string;
  attachments?: ITicketAttachment[];
  user: ITicketUser;
  createdAt: string;
  updatedAt: string;
}

export interface ITicketCategory {
  id: string; // MongoDB _id mapped to id
  name: string;
  description: string;
  color: string;
  icon: string; // Icon name as string, not the Icon component
  createdBy: CreatedBy;
  // updatedBy?: string; // userId (optional)
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}
