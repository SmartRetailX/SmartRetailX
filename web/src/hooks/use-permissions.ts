import { PERMISSIONS } from '@/configs';
import { USER } from '@/constants';

export const usePermissions = (role?: USER.ORGANIZATION_ROLE | USER.SYSTEM_ROLE) => {
  const hasPermission = (feature: keyof typeof PERMISSIONS) => {
    if (!role) return false;

    // Check if the permission exists and includes the role
    if (feature in PERMISSIONS) {
      const permission = PERMISSIONS[feature as keyof typeof PERMISSIONS];
      // Check if permission is an object with nested roles arrays
      return Object.values(permission).some(
        (roleArray) => Array.isArray(roleArray) && roleArray.flat().includes(role),
      );
    }

    return false;
  };

  return { hasPermission };
};
