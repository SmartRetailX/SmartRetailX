import type { AxiosResponse } from 'axios';
import { z } from 'zod';

/**
 * Utility function to process API responses using a validation schema and a mapper.
 *
 * @param responsePromise The Promise containing the Axios response.
 * @param schema The Zod schema to validate the API response data.
 * @param mapper A function that maps the validated API data to a frontend type.
 * @returns The final mapped frontend response.
 */
export async function processApiResponse<TApiData, TMapResult>(
  responsePromise: Promise<AxiosResponse<unknown>>,
  schema: z.ZodType<TApiData>,
  mapper: (data: TApiData) => TMapResult,
): Promise<TMapResult> {
  try {
    const response = await responsePromise;
    const validatedData = schema.parse(response.data);
    return mapper(validatedData);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Validation Error for API Response:', error.errors);
      throw new Error(`API Response Validation Failed: ${error.message}`);
    }
    throw error;
  }
}
