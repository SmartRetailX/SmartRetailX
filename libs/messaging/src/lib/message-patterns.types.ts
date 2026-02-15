/**
 * Common message pattern types for microservices communication
 * Use these types to ensure type-safe messaging across services
 */

/**
 * Base message pattern structure
 */
export interface MessagePattern {
  cmd: string;
}

/**
 * Message response wrapper
 */
export interface MessageResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp?: string;
}

/**
 * Health check pattern and response
 */
export const HEALTH_PATTERN = { cmd: 'health' } as const;

export interface HealthResponse {
  status: 'ok' | 'error';
  service?: string;
  timestamp: string;
  details?: Record<string, unknown>;
}

/**
 * Common message patterns
 * Export these from your service-specific libraries
 *
 * @example
 * ```typescript
 * // In libs/shared-types or service-specific lib
 * export const USER_PATTERNS = {
 *   GET_USER: { cmd: 'get_user' },
 *   CREATE_USER: { cmd: 'create_user' },
 *   UPDATE_USER: { cmd: 'update_user' },
 *   DELETE_USER: { cmd: 'delete_user' },
 * } as const;
 *
 * export interface GetUserPayload {
 *   id: string;
 * }
 *
 * export interface UserResponse {
 *   id: string;
 *   email: string;
 *   name: string;
 * }
 * ```
 */

/**
 * Helper type to create message pattern constants
 */
export type PatternCommand<T extends string> = { cmd: T };

/**
 * Helper to create typed message patterns
 */
export function createMessagePattern<T extends string>(cmd: T): PatternCommand<T> {
  return { cmd } as const;
}

/**
 * Example usage in services:
 *
 * ```typescript
 * // Define patterns
 * const PATTERNS = {
 *   GET_USER: createMessagePattern('get_user'),
 *   CREATE_USER: createMessagePattern('create_user'),
 * } as const;
 *
 * // Use in client
 * this.client.send(PATTERNS.GET_USER, { id: '123' });
 *
 * // Use in handler
 * @MessagePattern(PATTERNS.GET_USER)
 * async getUser(@Payload() data: { id: string }) {
 *   return this.usersService.findById(data.id);
 * }
 * ```
 */
