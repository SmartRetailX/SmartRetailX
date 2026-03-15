import { USER_ROLE } from '@/constants';

/**
 * Generic configuration for all factory implementations
 */
export type RoleConfig<T> = {
  [role: string]: T;
  default: T;
};

/**
 * Base factory interface for role-based configurations
 */
export interface RoleBasedFactory<T> {
  getConfigForRole(role?: string): T;
  hasConfigForRole(role?: string): boolean;
}

/**
 * Create a role-based configuration factory
 * Modern functional approach for managing role-based configurations
 */
export function createRoleBasedConfigFactory<T>(configs: RoleConfig<T>, defaultConfig: T) {
  return {
    getConfigForRole(role?: string): T {
      if (!role) return defaultConfig;
      return configs[role] || configs.default || defaultConfig;
    },
    hasConfigForRole(role?: string): boolean {
      if (!role) return !!configs.default;
      return !!configs[role];
    },
  };
}

export { USER_ROLE };
