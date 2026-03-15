import { toast } from 'sonner';

import { ErrorResponse, handleApiError } from '@/utils/error-handler';

/**
 * Custom hook for handling API errors consistently across the application
 * Provides methods to process errors and show toast notifications
 */
export function useApiError() {
  /**
   * Handles API errors and optionally shows a toast notification
   * @param error Any error thrown from an API call
   * @param options Configuration options for error handling
   * @returns The processed error response
   */
  const handleError = (
    error: unknown,
    options?: {
      showToast?: boolean;
      fallbackMessage?: string;
      retryFn?: () => void;
    },
  ): ErrorResponse => {
    const { showToast = true, fallbackMessage = undefined, retryFn } = options || {};

    // Process the error to get structured error information
    const errorResponse = handleApiError(error);

    if (showToast) {
      // Create a status-specific error description
      let description = errorResponse.message;
      if (errorResponse.statusCode) {
        description += ` (Status: ${errorResponse.statusCode})`;
      }

      toast.error(fallbackMessage || description, {
        description: !fallbackMessage ? undefined : description,
        action: retryFn
          ? {
              label: 'Retry',
              onClick: retryFn,
            }
          : undefined,
      });
    }

    return errorResponse;
  };

  return {
    handleError,
  };
}
