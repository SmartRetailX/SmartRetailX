import { useAuth } from '@/hooks';

import { cn } from '@/lib/utils';
import { USER_ROLE, UserRole } from '@/types/auth';

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
  noMaxHeight?: boolean;
  style?: React.CSSProperties;
}

const roleHeightMap: Record<UserRole, string> = {
  [USER_ROLE.GUEST]: 'min-h-(--h-guest-content-min)',
  [USER_ROLE.USER]: 'min-h-(--h-user-content-min)',
  [USER_ROLE.ADMIN]: 'min-h-(--h-admin-content-min)',
};

const getPageHeight = (role: UserRole, noMaxHeight?: boolean) => {
  if (noMaxHeight) return 'max-h-none';

  return roleHeightMap[role] ?? 'min-h-screen';
};

export function PageContainer({ children, className, noMaxHeight, style }: PageContainerProps) {
  const { user } = useAuth();
  const pageHeightClass = getPageHeight(user?.role || USER_ROLE.GUEST, noMaxHeight);

  return (
    <div style={style} className={cn('flex-1', pageHeightClass, className)}>
      {children}
    </div>
  );
}
