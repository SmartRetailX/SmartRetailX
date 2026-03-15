import {
  ApiError,
  AppError,
  isApiError,
  isMappingError,
  isValidationError,
  MappingError,
  ValidationError,
} from '@/lib/errors';

/**
 * Error response interface
 */
export interface ErrorResponse {
  message: string;
  statusCode: number | null;
  code: string;
  originalError?: unknown;
  fieldErrors?: Record<string, string[]>;
  messages?: string[];
}

interface StandardizedErrorLike {
  message: string;
  statusCode: number | null;
  code: string;
  fieldErrors?: Record<string, string[]>;
  messages?: string[];
  originalError?: unknown;
}

function isStandardizedError(error: unknown): error is StandardizedErrorLike {
  if (typeof error !== 'object' || error === null) return false;

  const candidate = error as Partial<StandardizedErrorLike>;
  return (
    typeof candidate.message === 'string' &&
    typeof candidate.code === 'string' &&
    (typeof candidate.statusCode === 'number' || candidate.statusCode === null)
  );
}

function extractMessagesFromData(data: unknown): string[] | null {
  if (!data) return null;

  if (typeof data === 'string') {
    return [data];
  }

  if (typeof data === 'object' && data !== null) {
    const dataObj = data as Record<string, unknown>;

    if (Array.isArray(dataObj.message)) {
      return dataObj.message.map((entry) => String(entry)).filter(Boolean);
    }

    if (typeof dataObj.message === 'string') {
      return [dataObj.message];
    }

    if (typeof dataObj.error === 'string') {
      return [dataObj.error];
    }
  }

  return null;
}

/**
 * Extracts error message from Axios error response data
 */
function extractMessageFromData(data: unknown): string | null {
  const messages = extractMessagesFromData(data);
  if (!messages || messages.length === 0) return null;
  return messages.join('\n');
}

/**
 * Creates an ApiError from an Axios error response
 */
function createApiErrorFromAxios(error: unknown): ApiError {
  // Type guard for axios-like error
  const isAxiosError = (
    err: unknown,
  ): err is {
    response?: { data: unknown; status: number };
    request?: unknown;
    message?: string;
  } => {
    return typeof err === 'object' && err !== null;
  };

  if (!isAxiosError(error)) {
    return new ApiError('An unexpected error occurred', null, { originalError: error });
  }

  // Handle Axios error response
  if (error.response) {
    const { data, status } = error.response;

    // Try to extract message from response data
    const extractedMessage = extractMessageFromData(data);
    const extractedMessages = extractMessagesFromData(data);
    if (extractedMessage) {
      return new ApiError(extractedMessage, status, {
        originalError: error,
        messages: extractedMessages,
      });
    }

    // Generic error based on status code
    switch (status) {
      case 401:
        return ApiError.unauthorized();
      case 403:
        return ApiError.forbidden();
      case 404:
        return ApiError.notFound();
      case 500:
        return ApiError.serverError();
      default:
        return new ApiError('An error occurred', status, { originalError: error });
    }
  }

  // Handle network errors
  if (error.request && !error.response) {
    return ApiError.networkError();
  }

  // Handle error with a message property
  if (error.message) {
    return new ApiError(error.message, null, { originalError: error });
  }

  return new ApiError('An unexpected error occurred', null, { originalError: error });
}

/**
 * Converts any error to an appropriate AppError subclass
 * Use this to normalize errors throughout the application
 */
export function normalizeError(error: unknown): AppError {
  // Already an AppError, return as-is
  if (error instanceof AppError) {
    return error;
  }

  if (isStandardizedError(error)) {
    return new ApiError(error.message, error.statusCode, {
      originalError: error.originalError ?? error,
      code: error.code,
      fieldErrors: error.fieldErrors,
      messages: error.messages,
    });
  }

  // Handle Axios errors
  if (typeof error === 'object' && error !== null) {
    const hasAxiosProps = (err: object): err is { response?: unknown; request?: unknown } => {
      return 'response' in err || 'request' in err;
    };
    if (hasAxiosProps(error)) {
      return createApiErrorFromAxios(error);
    }
  }

  // Handle string errors
  if (typeof error === 'string') {
    return new ApiError(error, null);
  }

  // Handle generic Error objects
  if (error instanceof Error) {
    return new ApiError(error.message, null, { originalError: error });
  }

  return new ApiError('An unexpected error occurred', null, { originalError: error });
}

/**
 * Extracts error message and status code from various API error formats
 * @param error Any error thrown from an API call
 * @returns An object containing the error message and status code
 *
 * @deprecated Use normalizeError() for new code. This function is kept for backward compatibility.
 */
export const handleApiError = (error: unknown): ErrorResponse => {
  // First, normalize the error to an AppError
  const appError = normalizeError(error);

  // Build the response object
  const response: ErrorResponse = {
    message: appError.message,
    statusCode: appError.statusCode,
    code: appError.code,
    originalError: appError.context?.originalError ?? error,
    messages: Array.isArray(appError.context?.messages)
      ? (appError.context.messages as string[])
      : undefined,
  };

  // Add field errors for validation errors
  if (isValidationError(appError)) {
    response.fieldErrors = appError.fieldErrors;
  }

  if (!response.messages?.length && response.message) {
    response.messages = response.message
      .split('\n')
      .map((message) => message.trim())
      .filter(Boolean);
  }

  return response;
};

/**
 * Type guard to check if an ErrorResponse is from a validation error
 */
export function isValidationErrorResponse(response: ErrorResponse): boolean {
  return response.code === 'VALIDATION_ERROR';
}

/**
 * Type guard to check if an ErrorResponse is from a mapping error
 */
export function isMappingErrorResponse(response: ErrorResponse): boolean {
  return response.code === 'MAPPING_ERROR';
}

/**
 * Type guard to check if an ErrorResponse is from an API error
 */
export function isApiErrorResponse(response: ErrorResponse): boolean {
  return response.code === 'API_ERROR';
}

// Re-export error classes and type guards for convenience
export {
  ApiError,
  AppError,
  isApiError,
  isMappingError,
  isValidationError,
  MappingError,
  ValidationError,
};
