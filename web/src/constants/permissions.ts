export const RESOURCE = {
  // Default resources
  ORGANIZATION: 'organization',
  INVITATION: 'invitation',
  MEMBER: 'member',
  TEAM: 'team',
  AC: 'ac',

  // Custom resources
  SEASON: 'season',
  PAYOUT: 'payout',
  PAYEE: 'payee',
  EXPENSE: 'expense',
  CHAT: 'chat',
  LABEL: 'label',
  MIGRATION: 'migration',
  PAYEE_INVITE: 'payee_invite',
  ADMINISTRATION: 'administration',
  USERS: 'users',
  CONTRACT: 'contract',
  INVOICE: 'invoice',
  ROYALTY: 'royalty',
  TICKET: 'ticket',
} as const;

export const ACTION = {
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
  CANCEL: 'cancel',
} as const;
