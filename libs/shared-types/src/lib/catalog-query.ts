const DEFAULT_STOP_WORDS = [
  'what',
  'is',
  'the',
  'of',
  'for',
  'show',
  'me',
  'please',
  'can',
  'you',
  'tell',
  'about',
  'do',
  'have',
  'any',
  'with',
  'and',
  'to',
  'in',
  'on',
  'price',
  'details',
  'product',
  'products',
  'මට',
  'වල',
  'සඳහා',
  'දෙන්න',
  'ලබාදෙන්න',
  'බලන්න',
  'මිල',
  'එක',
  'ගේ',
  'ගැන',
] as const;

const CATALOG_STOP_WORDS = new Set<string>(DEFAULT_STOP_WORDS);

export function normalizeCatalogQuery(input: string): string {
  return input.toLowerCase().replace(/\s+/g, ' ').trim();
}

export function buildCatalogQueryTokens(normalizedQuery: string): string[] {
  if (!normalizedQuery) {
    return [];
  }

  const tokens = normalizedQuery
    .split(/\s+/)
    .map((token) => token.replace(/^[^\p{L}\p{N}\p{M}]+|[^\p{L}\p{N}\p{M}]+$/gu, ''))
    .filter((token) => token.length >= 2 && !/^\d+$/.test(token) && !CATALOG_STOP_WORDS.has(token));

  const uniqueTokens = Array.from(new Set(tokens)).slice(0, 8);
  if (!uniqueTokens.length && normalizedQuery.length >= 2) {
    return [normalizedQuery];
  }

  return uniqueTokens;
}
