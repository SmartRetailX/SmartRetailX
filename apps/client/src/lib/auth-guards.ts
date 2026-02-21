/**
 * auth-guards.ts
 *
 * Reusable TanStack Router `beforeLoad` guard factories for role-based and
 * authentication-based route protection.
 *
 * Design:
 * - Guards are safe during the initial session load (`isLoading = true`).
 *   They skip the redirect so the route component can render a loading spinner.
 * - Once `isLoading = false` the guard enforces the policy.
 * - Each protected LAYOUT COMPONENT also re-checks reactively via useEffect +
 *   useNavigate, covering the brief window where `isLoading` was still true
 *   when `beforeLoad` ran.
 *
 * Usage:
 * ```ts
 * export const Route = createFileRoute('/_admin')({
 *   beforeLoad: requireRole('admin'),
 *   component: AdminLayout,
 * });
 * ```
 */

import type { RouterContext } from '@/router';
import { redirect } from '@tanstack/react-router';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

type BeforeLoadArgs = {
  context: RouterContext;
  location: { href: string };
};

/** Parse Better Auth comma-separated roles string into an array. */
function parseRoles(role: string | undefined | null): string[] {
  if (!role) return ['user'];
  return role
    .split(',')
    .map((r) => r.trim())
    .filter(Boolean);
}

// ---------------------------------------------------------------------------
// Guards
// ---------------------------------------------------------------------------

/**
 * requireAuth
 *
 * Ensures the visitor is authenticated before accessing the route.
 * Unauthenticated visitors are redirected to /login with a `redirect` search
 * param so they land back on the intended page after signing in.
 *
 * Safe during initial session load (`isLoading`): skips redirect and lets the
 * component's own loading state handle the UX.
 */
export function requireAuth({ context, location }: BeforeLoadArgs): void {
  if (context.auth.isLoading) return; // not yet resolved – let component handle it
  if (!context.auth.isAuthenticated) {
    throw redirect({
      to: '/login',
      search: { redirect: location.href },
    });
  }
}

/**
 * requireRole
 *
 * Returns a `beforeLoad` handler that ensures the visitor is authenticated
 * AND holds the specified role.
 *
 * - Unauthenticated → /login (with redirect param)
 * - Authenticated but wrong role → / (store home)
 *
 * Supports Better Auth's comma-separated multi-role strings, e.g. "admin,editor".
 */
export function requireRole(role: string) {
  return ({ context, location }: BeforeLoadArgs): void => {
    if (context.auth.isLoading) return;

    if (!context.auth.isAuthenticated) {
      throw redirect({
        to: '/login',
        search: { redirect: location.href },
      });
    }

    const roles = parseRoles(context.auth.user?.role);
    if (!roles.includes(role)) {
      throw redirect({ to: '/' });
    }
  };
}

/**
 * redirectIfAuthenticated
 *
 * Prevents authenticated users from accessing public-only pages (login, signup).
 * Admins are sent to /admin, regular users to /.
 */
export function redirectIfAuthenticated({ context }: BeforeLoadArgs): void {
  if (context.auth.isLoading) return;
  if (!context.auth.isAuthenticated) return;

  const roles = parseRoles(context.auth.user?.role);
  if (roles.includes('admin')) {
    throw redirect({ to: '/admin' });
  }
  throw redirect({ to: '/' });
}
