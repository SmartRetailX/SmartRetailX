import {
  Icon,
  IconBooks,
  IconBrandHipchat,
  IconProps,
  IconSettings,
  IconUser,
  IconUsers,
} from '@tabler/icons-react';
import { ForwardRefExoticComponent, RefAttributes } from 'react';

export type TabInfo = {
  title: string;
  icon: ForwardRefExoticComponent<IconProps & RefAttributes<Icon>>;
};

// Define tab configurations in a constant array
export const TAB_CONFIGS: Array<{
  pathStart: string;
  getTabInfo: (path: string) => TabInfo;
}> = [
  {
    pathStart: '/settings',
    getTabInfo: () => ({
      title: 'Settings',
      icon: IconSettings,
    }),
  },
  {
    pathStart: '/users',
    getTabInfo: () => ({
      title: 'Users',
      icon: IconUsers,
    }),
  },
  {
    pathStart: '/chat',
    getTabInfo: (path: string) => {
      const pathParts = path.split('/');
      const isChatDetail = pathParts.length >= 3 && pathParts[2]?.length > 0;

      if (isChatDetail) {
        return {
          title: 'Chat', // This will be dynamically updated with chat.title
          icon: IconBrandHipchat,
        };
      }

      return {
        title: 'Chats',
        icon: IconBrandHipchat,
      };
    },
  },
  {
    pathStart: '/contracts',
    getTabInfo: (path: string) => {
      const pathParts = path.split('/');
      const isContractDetail = pathParts.length >= 3 && pathParts[2]?.length > 0;

      if (isContractDetail) {
        return {
          title: 'Contract', // This will be dynamically updated with contract.title
          icon: IconBooks,
        };
      }

      return {
        title: 'Contracts',
        icon: IconBooks,
      };
    },
  },
  {
    pathStart: '/payees',
    getTabInfo: () => {
      return {
        title: 'Payees',
        icon: IconUser,
      };
    },
  },
];
