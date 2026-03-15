import { USER } from '@/constants';

export const PERMISSIONS = {
  NAVIGATION: {
    DASHBOARD: [Object.values(USER.ORGANIZATION_ROLE)],
    SEARCH: [Object.values(USER.ORGANIZATION_ROLE)],
    ACTIVITY_LOG: [Object.values(USER.ORGANIZATION_ROLE)],
  },
  ACTIONS: {
    INVITE: [Object.values(USER.ORGANIZATION_ROLE)],
  },
} as const;
