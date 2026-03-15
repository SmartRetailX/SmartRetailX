import {
  PayeeInviteListResponse,
  PayeeInviteResponse,
  PayeeInviteSingleResponse,
} from '@/schemas/response-validation/payee-invite.response';
import { PayeeInvite, PayeeInviteList } from '@/types/payee-invite';

const unwrapSingle = (response: PayeeInviteSingleResponse): PayeeInviteResponse => {
  if ('data' in response && response.data) {
    return response.data as PayeeInviteResponse;
  }
  return response as PayeeInviteResponse;
};

export const mapPayeeInvite = (response: PayeeInviteSingleResponse): PayeeInvite => {
  const invite = unwrapSingle(response);

  return {
    id: invite.id || invite._id || '',
    payeeId: invite.payeeId,
    name: invite.name,
    type: invite.type,
    payee: invite.payee
      ? {
          id: invite.payee.id || invite.payee._id,
          name: invite.payee.name,
          email: invite.payee.email ?? undefined,
          image: invite.payee.image ?? undefined,
        }
      : undefined,
    organization: invite.organization
      ? {
          name: invite.organization.name,
        }
      : undefined,
    createdBy: invite.createdBy
      ? {
          id: invite.createdBy.id || invite.createdBy._id,
          name: invite.createdBy.name,
          email: invite.createdBy.email ?? undefined,
        }
      : undefined,
    updatedBy: invite.updatedBy
      ? {
          id: invite.updatedBy.id || invite.updatedBy._id,
          name: invite.updatedBy.name,
          email: invite.updatedBy.email ?? undefined,
        }
      : undefined,
    email: invite.email ?? undefined,
    rejectedReason: invite.rejectedReason ?? undefined,
    respondedAt: invite.respondedAt ?? undefined,
    payeeImage: invite.payeeImage ?? undefined,
    status: invite.status,
    expiresAt: invite.expiresAt ?? undefined,
    createdAt: invite.createdAt,
    updatedAt: invite.updatedAt,
  };
};

export const mapPayeeInviteList = (response: PayeeInviteListResponse): PayeeInviteList => {
  if (Array.isArray(response)) {
    return {
      data: response.map((item) => mapPayeeInvite(item)),
      total: response.length,
    };
  }

  return {
    data: response.data.map((item) => mapPayeeInvite(item)),
    total: response.total,
  };
};
