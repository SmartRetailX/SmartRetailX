import {
  IconBooks,
  IconCrown,
  IconDeviceAnalytics,
  IconFileDescription,
  IconFileDollar,
  IconHome,
  IconTicket,
  IconUserDollar,
} from '@tabler/icons-react';

import type { RoleConfig } from '../role-factory';
import { USER_ROLE } from '../role-factory';
import type { SidebarItemType } from '.';

// User role-specific sidebar items
export const SIDEBAR_CONFIG: RoleConfig<SidebarItemType[]> = {
  [USER_ROLE.OWNER]: [
    {
      title: 'Home',
      url: '/dashboard',
      icon: IconHome,
    },
    {
      title: 'Contracts',
      url: '/contracts',
      icon: IconBooks,
    },
    {
      title: 'Payees',
      url: '/payees',
      icon: IconUserDollar,
    },
    {
      title: 'Expenses',
      url: '/expenses',
      icon: IconFileDescription,
    },
    {
      title: 'Payments',
      url: '/payments',
      icon: IconFileDollar,
    },
    {
      title: 'Royalties',
      url: '/royalties',
      icon: IconCrown,
    },
    {
      title: 'Tickets',
      url: '/tickets',
      icon: IconTicket,
    },
    {
      title: 'Insights',
      url: '/insights',
      icon: IconDeviceAnalytics,
    },
  ],
  [USER_ROLE.ADMIN]: [
    {
      title: 'Home',
      url: '/dashboard',
      icon: IconHome,
    },
    {
      title: 'Contracts',
      url: '/contracts',
      icon: IconBooks,
    },
    {
      title: 'Payees',
      url: '/payees',
      icon: IconUserDollar,
    },
    {
      title: 'Expenses',
      url: '/expenses',
      icon: IconFileDescription,
    },
    {
      title: 'Payments',
      url: '/payments',
      icon: IconFileDollar,
    },
    {
      title: 'Royalties',
      url: '/royalties',
      icon: IconCrown,
    },
    {
      title: 'Tickets',
      url: '/tickets',
      icon: IconTicket,
    },
    {
      title: 'Insights',
      url: '/insights',
      icon: IconDeviceAnalytics,
    },
  ],
  [USER_ROLE.MEMBER]: [
    {
      title: 'Home',
      url: '/dashboard',
      icon: IconHome,
    },
    {
      title: 'Contracts',
      url: '/contracts',
      icon: IconBooks,
    },
    {
      title: 'Payees',
      url: '/payees',
      icon: IconUserDollar,
    },
    {
      title: 'Expenses',
      url: '/expenses',
      icon: IconFileDescription,
    },
    {
      title: 'Payments',
      url: '/payments',
      icon: IconFileDollar,
    },
    {
      title: 'Insights',
      url: '/insights',
      icon: IconDeviceAnalytics,
    },
  ],
  // Default items for any new roles
  default: [
    {
      title: 'Home',
      url: '/dashboard',
      icon: IconHome,
    },
  ],
};
