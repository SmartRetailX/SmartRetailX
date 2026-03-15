import React from 'react';

interface LoadingWrapperProps {
  isLoading: boolean;
  skeleton: React.ComponentType<Record<string, unknown>>;
  skeletonProps?: Record<string, unknown>;
  children: React.ReactNode;
}

/**
 * A wrapper component that conditionally renders a skeleton or children based on loading state
 * This promotes consistency and makes it easier to manage loading states across the app
 */
export function LoadingWrapper({
  isLoading,
  skeleton: SkeletonComponent,
  skeletonProps = {},
  children,
}: LoadingWrapperProps) {
  if (isLoading) {
    return <SkeletonComponent {...skeletonProps} />;
  }

  return <>{children}</>;
}
