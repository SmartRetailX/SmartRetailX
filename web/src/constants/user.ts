export enum USER_TYPE {
  SYSTEM = 'system',
  ORGANIZATION = 'organization',
  PAYEE = 'payee',
}

export enum SYSTEM_ROLE {
  ADMIN = 'sys_admin',
}

export enum ORGANIZATION_ROLE {
  OWNER = 'org_owner',
  ADMIN = 'org_admin',
  USER = 'org_user',
}

export enum PAYEE_ROLE {
  ARTIST = 'artist',
  COMPANY = 'company',
  COMPOSER = 'composer',
  LABEL = 'label',
}

/**
 * Guest user role for non-members
 */
export const USER_ROLE = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MEMBER: 'member',
  GUEST: 'guest',
} as const;
