import { Link, useMatches } from '@tanstack/react-router';
import { Fragment, useMemo } from 'react';

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { useBreadcrumbStore } from '@/store/breadcrumb.store';

/**
 * Maps known route path segments to human-readable labels.
 * Dynamic segments (e.g. $contractId) are resolved via the breadcrumb store.
 */
const ROUTE_LABELS: Record<string, string> = {
  dashboard: 'Home',
  contracts: 'Contracts',
  payees: 'Payees',
  expenses: 'Expenses',
  payments: 'Payments',
  royalties: 'Royalties',
  tickets: 'Tickets',
  insights: 'Insights',
  invoices: 'Invoices',
  tracks: 'Tracks',
  users: 'Users',
  settings: 'Settings',
  chat: 'Chat',
  activity: 'Activity',
  help: 'Help',
  migration: 'Migration',
  account: 'Account',
  anomaly: 'Anomaly',
  // Nested static segments
  new: 'New',
  add: 'Add',
  merge: 'Merge',
  verify: 'Verify',
  manage: 'Manage',
  invites: 'Invites',
  categories: 'Categories',
  imports: 'Imports',
  import: 'Import',
  history: 'History',
};

interface BreadcrumbSegment {
  label: string;
  path: string;
  isLast: boolean;
}

/**
 * Check if a segment looks like a dynamic ID (ObjectId, UUID, or numeric).
 */
function isDynamicSegment(segment: string): boolean {
  return (
    /^[a-f0-9]{24}$/i.test(segment) || // MongoDB ObjectId
    /^[a-f0-9-]{36}$/i.test(segment) || // UUID
    /^\d+$/.test(segment) // Numeric ID
  );
}

/**
 * Format a segment that isn't in ROUTE_LABELS and isn't a known dynamic ID.
 * Capitalizes kebab-case words.
 */
function formatSegment(segment: string): string {
  return segment
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function buildBreadcrumbs(
  pathname: string,
  storeLabels: Record<string, string>,
): BreadcrumbSegment[] {
  const segments = pathname.replace(/\/$/, '').split('/').filter(Boolean);
  if (segments.length === 0) return [];

  const crumbs: BreadcrumbSegment[] = [];
  let currentPath = '';

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    currentPath += `/${segment}`;
    const isLast = i === segments.length - 1;

    // 1. Known static label
    // 2. Resolved dynamic label from store
    // 3. Fallback: format the segment
    let label: string;
    if (ROUTE_LABELS[segment]) {
      label = ROUTE_LABELS[segment];
    } else if (storeLabels[segment]) {
      label = storeLabels[segment];
    } else if (isDynamicSegment(segment)) {
      label = `${segment.slice(0, 6)}…`;
    } else {
      label = formatSegment(segment);
    }

    crumbs.push({ label, path: currentPath, isLast });
  }

  return crumbs;
}

export function HeaderBreadcrumb() {
  const matches = useMatches();
  const storeLabels = useBreadcrumbStore((s) => s.labels);

  const pathname = useMemo(() => {
    if (matches.length === 0) return '/';
    const lastMatch = matches[matches.length - 1];
    return lastMatch.pathname || '/';
  }, [matches]);

  const crumbs = useMemo(() => buildBreadcrumbs(pathname, storeLabels), [pathname, storeLabels]);

  // Hide only on home / dashboard
  if (crumbs.length === 0) return null;
  if (crumbs.length === 1 && crumbs[0].path === '/dashboard') return null;

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {crumbs.map((crumb, index) => (
          <Fragment key={crumb.path}>
            {index > 0 && <BreadcrumbSeparator />}
            <BreadcrumbItem>
              {crumb.isLast ? (
                <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link to={crumb.path}>{crumb.label}</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
