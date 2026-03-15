import React from 'react';

import { Error } from '../error-ui/error';
import { DefaultLoader } from '../loaders';

interface StateHandlerProps {
  isLoading?: boolean;
  isError?: boolean;
  isEmpty?: boolean;
  error?: Error | null;
  errorMessage?: string;
  emptyMessage?: string;
  loadingComponent?: React.ReactNode;
  errorComponent?: React.ReactNode;
  emptyComponent?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const StateHandler: React.FC<StateHandlerProps> = ({
  isLoading = false,
  isError = false,
  isEmpty = false,
  error = null,
  errorMessage = 'An error occurred',
  emptyMessage = 'No data available',
  loadingComponent,
  errorComponent,
  emptyComponent,
  children,
  className = 'h-full flex items-center justify-center',
}) => {
  // Handle loading state
  if (isLoading) {
    return loadingComponent || <DefaultLoader className={className} />;
  }

  // Handle error state
  if (isError || error) {
    if (errorComponent) {
      return <>{errorComponent}</>;
    }
    return (
      <div className='flex items-center justify-center p-4 w-full min-h-screen'>
        <Error isVisible={true} message={errorMessage} />
      </div>
    );
  }

  // Handle empty state
  if (isEmpty) {
    if (emptyComponent) {
      return <>{emptyComponent}</>;
    }
    return (
      <div className={`flex items-center justify-center p-4 ${className}`}>
        <p className='text-gray-500'>{emptyMessage}</p>
      </div>
    );
  }

  // Render children if no special state needs to be handled
  return <>{children}</>;
};
