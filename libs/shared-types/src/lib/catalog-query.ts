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
  'available',
  'availability',
  'price',
  'details',
  'product',
  'products',
  'item',
  'items',
  'eka',
  'one',
  'මට',
  'ලබා',
  'ලබාගත',
  'වල',
  'සඳහා',
  'දෙන්න',
  'ලබාදෙන්න',
  'කියන්න',
  'බලන්න',
  'මිල',
  'එක',
  'ගේ',
  'ගැන',
  'වර්ග',
  'වර්ගයේ',
  'කීය',
  'කීයද',
  'මොන',
  'මොනවා',
  'මොනවාද',
  'මොනවද',
  'ද',
  'නිෂ්පාදන',
  'භාණ්ඩ',
  'මිලදී',
  'ගත',
  'හැකි',
  'හැකිද',
  'තියෙනවද',
  'තියෙනවාද',
  'තියෙනවා',
] as const;

const CATALOG_STOP_WORDS = new Set<string>(DEFAULT_STOP_WORDS);

export function normalizeCatalogQuery(input: string): string {
  return input
    .toLowerCase()
    .replace(/([\u0d80-\u0dff])([a-z0-9])/g, '$1 $2')
    .replace(/([a-z0-9])([\u0d80-\u0dff])/g, '$1 $2')
    .replace(/([a-z])([0-9])/g, '$1 $2')
    .replace(/([0-9])([a-z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();
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
