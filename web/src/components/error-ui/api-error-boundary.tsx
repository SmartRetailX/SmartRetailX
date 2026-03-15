import React from 'react';

import { Button } from '@/components/ui/button';
import { ErrorResponse, handleApiError } from '@/utils/error-handler';

interface ApiErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: (error: ErrorResponse, reset: () => void) => React.ReactNode;
  onError?: (error: ErrorResponse) => void;
}

interface ApiErrorBoundaryState {
  hasError: boolean;
  error: ErrorResponse | null;
}

/**
 * A React error boundary specifically for capturing and displaying API errors
 */
export class ApiErrorBoundary extends React.Component<
  ApiErrorBoundaryProps,
  ApiErrorBoundaryState
> {
  constructor(props: ApiErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: unknown): ApiErrorBoundaryState {
    return {
      hasError: true,
      error: handleApiError(error),
    };
  }

  componentDidCatch(error: unknown) {
    const processedError = handleApiError(error);
    if (this.props.onError) {
      this.props.onError(processedError);
    }
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error!, this.reset);
      }

      // Default error UI
      return (
        <div className='p-4 border border-red-200 rounded-md bg-red-50 text-red-800'>
          <h3 className='text-lg font-medium mb-2'>An error occurred</h3>
          <p className='mb-2 text-sm'>{this.state.error?.message}</p>
          {this.state.error?.statusCode && (
            <p className='text-xs text-red-600 mb-3'>Status: {this.state.error.statusCode}</p>
          )}
          <Button
            variant='outline'
            className='bg-white hover:bg-red-100 text-red-700 border-red-300'
            onClick={this.reset}
          >
            Try Again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
