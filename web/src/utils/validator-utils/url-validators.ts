import { z } from 'zod';

const imageUrlSchema = z.string().url({ message: 'Must be a valid URL' });

export const validateImageUrl = (url?: string): boolean => {
  if (!url) return false;

  const result = imageUrlSchema.safeParse(url);
  return result.success;
};
