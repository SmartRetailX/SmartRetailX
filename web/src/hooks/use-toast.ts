import { useCallback } from 'react';
import { toast } from 'sonner';

interface UseToastOptions {
  successMessage?: string;
  errorMessage?: string;
  loadingMessage?: string;
}

/**
 * A custom hook for consistent toast notifications with loading, success, and error states
 */
export function useToast() {
  /**
   * Shows toast notifications for async operations with loading, success, and error states
   * @param asyncFn The async function to execute
   * @param options Custom messages for different states
   * @returns A wrapped function that handles toast notifications
   */
  const withToast = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <T, Args extends any[]>(
      asyncFn: (...args: Args) => Promise<T>,
      options: UseToastOptions = {},
    ) => {
      return async (...args: Args): Promise<T | undefined> => {
        const {
          loadingMessage = 'Processing...',
          successMessage = 'Operation completed successfully',
          errorMessage = 'An error occurred. Please try again.',
        } = options;

        // Show loading toast
        const loadingToast = toast.loading(loadingMessage);

        try {
          // Execute the async function
          const result = await asyncFn(...args);

          // Dismiss loading toast
          toast.dismiss(loadingToast);

          // Show success toast
          toast.success(successMessage);

          return result;
        } catch (error) {
          // Dismiss loading toast
          toast.dismiss(loadingToast);

          // Handle the error and show error toast
          const errorMsg = error instanceof Error ? error.message : errorMessage;
          toast.error(errorMsg);

          // Re-throw the error for the caller to handle if needed
          throw error;
        }
      };
    },
    [],
  );

  /**
   * Creates a promise-based toast notification
   * @param promise The promise to track
   * @param options Custom messages for different states
   */
  const promiseToast = useCallback(
    <T>(
      promise: Promise<T>,
      options: UseToastOptions & {
        successCallback?: (data: T) => void;
        errorCallback?: (error: unknown) => void;
      } = {},
    ) => {
      const {
        loadingMessage = 'Processing...',
        successMessage = 'Operation completed successfully',
        errorMessage = 'An error occurred. Please try again.',
        successCallback,
        errorCallback,
      } = options;

      toast.promise(promise, {
        loading: loadingMessage,
        success: (data) => {
          if (successCallback) successCallback(data);
          return successMessage;
        },
        error: (err) => {
          if (errorCallback) errorCallback(err);
          const errorMsg = err instanceof Error ? err.message : errorMessage;
          return errorMsg;
        },
      });
    },
    [],
  );

  return {
    withToast,
    promiseToast,
    success: toast.success,
    error: toast.error,
    info: toast.info,
    warning: toast.warning,
    loading: toast.loading,
    dismiss: toast.dismiss,
  };
}
