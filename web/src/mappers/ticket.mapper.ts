import { ORGANIZATION_ROLE, PAYEE_ROLE } from '@/constants';
import {
  CreateTicketResponse,
  TicketCategoryResponse,
  TicketItemResponse,
  TicketListItem,
  TicketResponse,
  TicketsListResponse,
} from '@/schemas/response-validation/ticket.response';
import { PaginationApiResponse } from '@/types/api';
import { ITicket, ITicketCategory, ITicketItem } from '@/types/ticket';

const mapTicketCategory = (category: TicketCategoryResponse): ITicketCategory => ({
  id: category._id,
  name: category.name,
  description: category.description || 'No information provided',
  color: category.color || '#6b7280',
  icon: category.icon || 'Thread',
  createdBy: {
    id: category.createdBy._id,
    email: category.createdBy.email || 'Unknown email',
    name: category.createdBy.email || 'Unknown User',
  },
  createdAt: category.createdAt,
  updatedAt: category.updatedAt,
});

const mapTicket = (ticket: TicketResponse): ITicket => ({
  id: ticket._id,
  ticketId: ticket.ticketId,
  contracts: ticket.contract.map((contract) => ({
    id: contract._id,
    title: contract.title,
    upc: contract.upc || '',
    isrc: contract.isrc || '',
    image: contract.image || undefined,
  })),
  subject: ticket.subject,
  description: ticket.description,
  isClosed: ticket.isClosed,
  progress: ticket.progress,
  assignedPayees:
    ticket.assignedPayees?.map((payee) => ({
      id: payee._id,
      name: payee.name,
      email: payee.email,
      image: payee.image || undefined,
      type: (payee.type as PAYEE_ROLE) || PAYEE_ROLE.ARTIST,
    })) || [],
  assignedUsers:
    ticket.assignedUsers?.map((user) => ({
      id: user._id,
      name: user.name || user.email || 'Unknown User',
      email: user.email,
      image: user.image || undefined,
      type: ORGANIZATION_ROLE.USER,
    })) || [],
  category: {
    id: ticket.category._id,
    name: ticket.category.name,
    description: ticket.category.description || 'No information provided',
    color: ticket.category.color || '#6b7280',
    icon: ticket.category.icon || 'Thread',
  },
  attachments: Array.isArray(ticket.attachments)
    ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ticket.attachments.filter((att): att is any => typeof att === 'object')
    : [],
  createdBy: {
    id: ticket.createdBy._id,
    name: ticket.createdBy.name || ticket.createdBy.email || 'Unknown User',
    email: ticket.createdBy.email,
    image: ticket.createdBy.image || undefined,
  },
  createdAt: ticket.createdAt,
  updatedAt: ticket.updatedAt,
});

const mapTicketItem = (item: TicketItemResponse): ITicketItem => ({
  id: item._id,
  ticketId: item.ticket,
  content: item.content,
  attachments: item.attachments,
  user: {
    id: item.user._id,
    name: item.user.name || item.user.email || 'Unknown User',
    email: item.user.email,
    image: item.user.image,
    type: ORGANIZATION_ROLE.USER,
  },
  createdAt: item.createdAt,
  updatedAt: item.updatedAt,
});

export const mapTicketCategoryResponse = (category: TicketCategoryResponse): ITicketCategory => {
  return mapTicketCategory(category);
};

export const mapTicketCategoriesResponse = (
  categories: TicketCategoryResponse[],
): ITicketCategory[] => {
  return categories.map(mapTicketCategory);
};

export const mapTicketResponse = (ticket: TicketResponse): ITicket => {
  return mapTicket(ticket);
};

export const mapCreateTicketResponse = (
  ticket: CreateTicketResponse,
): { id: string; ticketId: string } => {
  return {
    id: ticket._id,
    ticketId: ticket.ticketId,
  };
};

export const mapTicketsByContractResponse = (tickets: TicketResponse[]): ITicket[] => {
  return tickets.map(mapTicket);
};

export const mapTicketItemsResponse = (
  items: TicketItemResponse[],
): PaginationApiResponse<ITicketItem> => {
  return {
    total: items.length,
    data: items.map(mapTicketItem),
  };
};

const mapTicketListItem = (ticket: TicketListItem): ITicket => ({
  id: ticket._id,
  ticketId: ticket.ticketId,
  contracts: ticket.contract.map((contract) => ({
    id: contract._id,
    title: contract.title,
    upc: contract.upc || '',
    isrc: contract.isrc || '',
    image: contract.image || undefined,
  })),
  subject: ticket.subject,
  description: ticket.description,
  isClosed: ticket.isClosed,
  progress: ticket.progress,
  assignedPayees: [],
  assignedUsers: [],
  category: {
    id: ticket.category._id,
    name: ticket.category.name,
    description: '',
    color: ticket.category.color,
    icon: ticket.category.icon,
  },
  attachments: [],
  createdBy: {
    id: ticket.createdBy._id,
    name: ticket.createdBy.email,
    email: ticket.createdBy.email,
  },
  createdAt: ticket.createdAt,
  updatedAt: ticket.updatedAt,
});

export const mapTicketsListResponse = (
  response: TicketsListResponse,
): PaginationApiResponse<ITicket> => {
  return {
    data: response.data.map(mapTicketListItem),
    total: response.total,
  };
};
