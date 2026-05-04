type FuzzyProductInput = {
  sku: string;
  name: string;
  nameSi?: string | null;
  description?: string | null;
  descriptionSi?: string | null;
  brand?: string | null;
  category?: {
    name?: string | null;
    nameSi?: string | null;
  } | null;
};

export type FuzzyProductCandidate = {
  sku: string;
  score: number;
};

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}\p{M}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const buildNgrams = (text: string, min = 2, max = 4): string[] => {
  const compact = normalizeText(text).replace(/\s+/g, '');
  if (!compact) return [];

  const grams: string[] = [];
  for (let n = min; n <= max; n += 1) {
    if (compact.length < n) continue;
    for (let i = 0; i <= compact.length - n; i += 1) {
      grams.push(compact.slice(i, i + n));
    }
  }

  return grams;
};

const compactTokenDiceScore = (left: string, right: string): number => {
  const leftTokens = normalizeText(left).split(/\s+/).filter(Boolean);
  const rightTokens = normalizeText(right).split(/\s+/).filter(Boolean);

  if (leftTokens.length === 0 || rightTokens.length === 0) {
    return 0;
  }

  let best = 0;
  for (const leftToken of leftTokens) {
    if (leftToken.length < 3) {
      continue;
    }

    for (const rightToken of rightTokens) {
      if (rightToken.length < 3) {
        continue;
      }

      best = Math.max(best, diceScore(leftToken, rightToken));
    }
  }

  return best;
};

const diceScore = (left: string, right: string): number => {
  const leftGrams = buildNgrams(left, 2, 3);
  const rightGrams = buildNgrams(right, 2, 3);
  if (leftGrams.length === 0 || rightGrams.length === 0) return 0;

  const counts = new Map<string, number>();
  for (const gram of leftGrams) {
    counts.set(gram, (counts.get(gram) || 0) + 1);
  }

  let intersection = 0;
  for (const gram of rightGrams) {
    const count = counts.get(gram) || 0;
    if (count > 0) {
      counts.set(gram, count - 1);
      intersection += 1;
    }
  }

  return (2 * intersection) / (leftGrams.length + rightGrams.length);
};

const searchableFields = (product: FuzzyProductInput): string[] =>
  [
    product.name,
    product.nameSi,
    product.sku,
    product.brand,
    product.category?.name,
    product.category?.nameSi,
    product.description,
    product.descriptionSi,
  ]
    .map((value) => normalizeText(value || ''))
    .filter(Boolean);

export const findFuzzyProductCandidates = (
  query: string,
  products: FuzzyProductInput[],
  limit = 20,
): FuzzyProductCandidate[] => {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return [];

  return products
    .map((product) => {
      const score = Math.max(
        ...searchableFields(product).map((field) => Math.max(diceScore(normalizedQuery, field), compactTokenDiceScore(query, field))),
        0,
      );
      return { sku: product.sku, score };
    })
    .filter((candidate) => candidate.score >= 0.42)
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, Math.min(limit, 50)));
};
