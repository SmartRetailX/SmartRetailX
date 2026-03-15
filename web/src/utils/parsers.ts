/** Safe number coercion fallback */
export function toNumberSafe(value: unknown, fallback = 0): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    return Number.isNaN(n) ? fallback : n;
  }
  return fallback;
}

/** Safely parse ISO string to Date, returning null for invalid/empty values */
export function parseIsoToDate(str?: string | null): Date | null {
  if (!str) return null;
  const d = new Date(str);
  return Number.isNaN(d.getTime()) ? null : d;
}
