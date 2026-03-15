/**
 * ISRC (International Standard Recording Code) Validator using Zod
 *
 * ISRC Format: CC-XXX-YY-NNNNN
 * - CC: Two-letter country code (ISO 3166-1 alpha-2)
 * - XXX: Three-character alphanumeric registrant code
 * - YY: Two-digit year of registration (00-99)
 * - NNNNN: Five-digit serial number (00000-99999)
 *
 * Examples:
 * - US-S1Z-99-00001
 * - GB-XYZ-20-12345
 * - USSM10001234 (without hyphens)
 */

import { z } from 'zod';

// Helper function to normalize ISRC (remove hyphens, uppercase)
const normalizeISRCInput = (value: string): string => {
  return value.trim().toUpperCase().replace(/-/g, '');
};

// Helper function to format ISRC with hyphens
const formatISRCOutput = (normalized: string): string => {
  return `${normalized.slice(0, 2)}-${normalized.slice(2, 5)}-${normalized.slice(5, 7)}-${normalized.slice(7, 12)}`;
};

// Zod schema for ISRC validation
export const isrcSchema = z
  .string()
  .min(1, 'ISRC is required')
  .transform(normalizeISRCInput)
  .pipe(
    z
      .string()
      .length(12, 'ISRC must be 12 characters (without hyphens) or 15 characters (with hyphens)')
      .regex(
        /^[A-Z]{2}[A-Z0-9]{3}[0-9]{2}[0-9]{5}$/,
        'Invalid ISRC format. Expected: CC-XXX-YY-NNNNN',
      )
      .refine((value) => {
        // Validate year range (70-99 for 1970s-1990s, 00-30 for 2000s-2030s)
        const year = parseInt(value.slice(5, 7), 10);
        const currentYear = new Date().getFullYear() % 100;
        const futureLimit = currentYear + 5;

        return (
          (year >= 70 && year <= 99) || // 1970-1999
          (year >= 0 && year <= Math.min(30, futureLimit)) // 2000-2030 (or current year + 5)
        );
      }, 'Invalid year in ISRC'),
  )
  .transform(formatISRCOutput);

// Optional ISRC schema (for update forms)
export const optionalIsrcSchema = z
  .string()
  .optional()
  .refine((value) => {
    if (!value || value.trim() === '') return true;
    return isrcSchema.safeParse(value).success;
  }, 'Please enter a valid ISRC code (format: CC-XXX-YY-NNNNN)');

// Export validation functions for backward compatibility
export interface ISRCValidationResult {
  isValid: boolean;
  error?: string;
  formatted?: string;
}

/**
 * Validates an ISRC code using Zod schema
 */
export function validateISRC(isrc: string): ISRCValidationResult {
  const result = isrcSchema.safeParse(isrc);

  if (result.success) {
    return {
      isValid: true,
      formatted: result.data,
    };
  }

  return {
    isValid: false,
    error: result.error.errors[0]?.message || 'Invalid ISRC',
  };
}

/**
 * Simple boolean validation
 */
export function isValidISRC(isrc: string): boolean {
  return isrcSchema.safeParse(isrc).success;
}

/**
 * Formats an ISRC code with proper hyphens
 */
export function formatISRC(isrc: string): string | null {
  const result = isrcSchema.safeParse(isrc);
  return result.success ? result.data : null;
}

/**
 * Normalizes an ISRC code (removes hyphens, uppercase)
 */
export function normalizeISRC(isrc: string): string | null {
  try {
    const normalized = normalizeISRCInput(isrc);
    const result = z
      .string()
      .length(12)
      .regex(/^[A-Z]{2}[A-Z0-9]{3}[0-9]{2}[0-9]{5}$/)
      .safeParse(normalized);
    return result.success ? normalized : null;
  } catch {
    return null;
  }
}

/**
 * Gets ISRC components from a valid ISRC code
 */
export function getISRCComponents(isrc: string): {
  countryCode: string;
  registrantCode: string;
  year: string;
  serialNumber: string;
} | null {
  const normalized = normalizeISRC(isrc);
  if (!normalized) return null;

  return {
    countryCode: normalized.slice(0, 2),
    registrantCode: normalized.slice(2, 5),
    year: normalized.slice(5, 7),
    serialNumber: normalized.slice(7, 12),
  };
}

// Export regex for quick checks
export const ISRC_REGEX = /^[A-Z]{2}[-]?[A-Z0-9]{3}[-]?[0-9]{2}[-]?[0-9]{5}$/;
