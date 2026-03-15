/**
 * Type augmentation for Better Auth
 * Extends the default Better Auth types to include custom fields
 */

declare module 'better-auth/types' {
  interface User {
    firstName: string;
    lastName: string;
  }
}

export {};
