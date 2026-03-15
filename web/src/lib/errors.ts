import { ZodError } from 'zod';

/**
 * Base application error class
 * All custom errors should extend this class
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number | null;
  public readonly context?: Record<string, unknown>;

  constructor(
    message: string,
    code: string,
    statusCode: number | null = null,
    context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.context = context;

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * API Error - thrown when API requests fail
 */
export class ApiError extends AppError {
  constructor(
    message: string,
    statusCode: number | null = null,
    context?: Record<string, unknown>,
  ) {
    super(message, 'API_ERROR', statusCode, context);
  }

  static unauthorized(message = 'Unauthorized. Please login again.'): ApiError {
    return new ApiError(message, 401);
  }

  static forbidden(message = 'You do not have permission to perform this action.'): ApiError {
    return new ApiError(message, 403);
  }

  static notFound(message = 'The requested resource was not found.'): ApiError {
    return new ApiError(message, 404);
  }

  static serverError(message = 'Server error. Please try again later.'): ApiError {
    return new ApiError(message, 500);
  }

  static networkError(message = 'Network error. Please check your connection.'): ApiError {
    return new ApiError(message, null);
  }
}

/**
 * Validation Error - thrown when Zod validation fails
 */
export class ValidationError extends AppError {
  public readonly zodError?: ZodError;
  public readonly fieldErrors: Record<string, string[]>;

  constructor(message: string, zodError?: ZodError, context?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', null, context);
    this.zodError = zodError;
    this.fieldErrors = zodError ? this.extractFieldErrors(zodError) : {};
  }

  private extractFieldErrors(error: ZodError): Record<string, string[]> {
    const fieldErrors: Record<string, string[]> = {};

    error.errors.forEach((err) => {
      const path = err.path.join('.');
      if (!fieldErrors[path]) {
        fieldErrors[path] = [];
      }
      fieldErrors[path].push(err.message);
    });

    return fieldErrors;
  }

  static fromZodError(zodError: ZodError): ValidationError {
    const firstError = zodError.errors[0];
    const path = firstError?.path.join('.') || 'unknown';
    const message = `Validation failed at "${path}": ${firstError?.message || 'Invalid data'}`;

    return new ValidationError(message, zodError);
  }
}

/**
 * Mapping Error - thrown when data mapping/transformation fails
 */
export class MappingError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'MAPPING_ERROR', null, context);
  }

  static fromError(error: unknown): MappingError {
    const message = error instanceof Error ? error.message : 'Unknown mapping error';
    return new MappingError(`Mapping failed: ${message}`, { originalError: error });
  }
}

/**
 * Type guard to check if an error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Type guard to check if an error is an ApiError
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/**
 * Type guard to check if an error is a ValidationError
 */
export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}

/**
 * Type guard to check if an error is a MappingError
 */
export function isMappingError(error: unknown): error is MappingError {
  return error instanceof MappingError;
}
