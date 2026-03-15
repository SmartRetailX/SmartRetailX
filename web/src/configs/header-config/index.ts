import { createRoleBasedConfigFactory, RoleConfig, USER_ROLE } from '../role-factory';

export interface HeaderConfig {
  showLogo: boolean;
  showUserMenu: boolean;
  showNotifications: boolean;
  showSearch: boolean;
  showChatToggle: boolean;
}

// Default header when no specific config is found
const DEFAULT_HEADER: HeaderConfig = {
  showLogo: true,
  showUserMenu: true,
  showNotifications: false,
  showSearch: false,
  showChatToggle: true,
};

// User role configs
const USER_HEADER_CONFIG: RoleConfig<HeaderConfig> = {
  [USER_ROLE.OWNER]: {
    showLogo: true,
    showUserMenu: true,
    showNotifications: true,
    showSearch: true,
    showChatToggle: true,
  },
  [USER_ROLE.ADMIN]: {
    showLogo: true,
    showUserMenu: true,
    showNotifications: true,
    showSearch: true,
    showChatToggle: true,
  },
  [USER_ROLE.MEMBER]: {
    showLogo: true,
    showUserMenu: true,
    showNotifications: true,
    showSearch: false,
    showChatToggle: true,
  },
  // Default for any new roles
  default: DEFAULT_HEADER,
};

// Create header config factory using functional approach
const headerConfigFactory = createRoleBasedConfigFactory(USER_HEADER_CONFIG, DEFAULT_HEADER);

const CHAT_TOGGLE_VISIBLE_PATHS = ['/contracts', '/payees', '/expenses'];

const isChatToggleVisibleOnPath = (path?: string) => {
  if (!path) return true;

  return CHAT_TOGGLE_VISIBLE_PATHS.some(
    (routePath) => path === routePath || path.startsWith(`${routePath}/`),
  );
};

/**
 * Get header configuration based on role
 */
export const getHeaderConfig = (role?: string, path?: string): HeaderConfig => {
  const config = role ? headerConfigFactory.getConfigForRole(role) : DEFAULT_HEADER;

  return {
    ...config,
    showChatToggle: config.showChatToggle && isChatToggleVisibleOnPath(path),
  };
};
