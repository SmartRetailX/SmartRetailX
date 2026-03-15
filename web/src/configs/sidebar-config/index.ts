import { IconProps } from '@tabler/icons-react';
import { ForwardRefExoticComponent, RefAttributes } from 'react';

import { UserRole } from '@/types';

import { createRoleBasedConfigFactory } from '../role-factory';
import { SIDEBAR_CONFIG } from './sidebar-items';

export type SidebarItemType = {
  title: string;
  url: string;
  icon: ForwardRefExoticComponent<IconProps & RefAttributes<SVGSVGElement>>;
  disallowedRoles?: UserRole[];
};

export type ChatCategoryType = {
  title: string;
  url: string;
};

// Default empty sidebar
const DEFAULT_SIDEBAR: SidebarItemType[] = [];

// Create sidebar config factory using functional approach
const sidebarConfigFactory = createRoleBasedConfigFactory(SIDEBAR_CONFIG, DEFAULT_SIDEBAR);

/**
 * Get sidebar items based on role
 */
export function getSidebarItems(role?: string): SidebarItemType[] {
  if (!role) return DEFAULT_SIDEBAR;
  return sidebarConfigFactory.getConfigForRole(role);
}

/**
 * Get a specific sidebar item by URL from all configurations
 */
export function getItemByUrl(url: string): SidebarItemType | undefined {
  const allItems: SidebarItemType[] = [];

  Object.entries(SIDEBAR_CONFIG).forEach(([key, sidebarItems]) => {
    if (key !== 'default' && Array.isArray(sidebarItems)) {
      allItems.push(...sidebarItems);
    }
  });

  return allItems.find((item) => item.url === url);
}
