import { ZodType, ZodTypeDef } from 'zod';

import { MappingError, ValidationError } from '@/lib/errors';

/**
 * Validates API response data with a Zod schema and transforms it using a mapper function.
 * Throws ValidationError or MappingError on failure.
 *
 * @example
 * ```ts
 * const result = validateAndMap(res, contractSchema, mapContractCount);
 * ```
 */
export function validateAndMap<TInput, TOutput, TMapped>(
  data: unknown,
  schema: ZodType<TOutput, ZodTypeDef, TInput>,
  mapper: (validated: TOutput) => TMapped,
): TMapped {
  // Step 1: Validate
  const parseResult = schema.safeParse(data);

  if (!parseResult.success) {
    if (import.meta.env.DEV) {
      console.error('Validation Error Details:', parseResult.error);
    }
    throw ValidationError.fromZodError(parseResult.error);
  }

  // Step 2: Map
  try {
    return mapper(parseResult.data);
  } catch (error) {
    throw MappingError.fromError(error);
  }
}
