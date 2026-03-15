import { createRoleBasedConfigFactory, RoleConfig, USER_ROLE } from '../role-factory';

interface LayoutConfig {
  showHeader: boolean;
  showSidebar: boolean;
  showTabBar: boolean;
}

// Default layout when no specific config is found
const DEFAULT_LAYOUT: LayoutConfig = {
  showHeader: true,
  showSidebar: false,
  showTabBar: false,
};

// User role configs
const USER_LAYOUT_CONFIG: RoleConfig<LayoutConfig> = {
  [USER_ROLE.OWNER]: {
    showHeader: true,
    showSidebar: true,
    showTabBar: true,
  },
  [USER_ROLE.ADMIN]: {
    showHeader: true,
    showSidebar: true,
    showTabBar: true,
  },
  [USER_ROLE.MEMBER]: {
    showHeader: true,
    showSidebar: true,
    showTabBar: false,
  },
  // Default for any new roles
  default: DEFAULT_LAYOUT,
};

// Create layout config factory using functional approach
const layoutConfigFactory = createRoleBasedConfigFactory(USER_LAYOUT_CONFIG, DEFAULT_LAYOUT);

/**
 * Get layout configuration based on role
 */
export const getLayoutConfig = (role?: string): LayoutConfig => {
  if (!role) return DEFAULT_LAYOUT;
  return layoutConfigFactory.getConfigForRole(role);
};
