import { readFileSync } from 'fs';
import { join } from 'path';

import { Client } from 'pg';

type ProductRow = {
  id: string;
  sku: string;
  name: string;
  name_si: string | null;
  description: string | null;
  description_si: string | null;
  brand: string | null;
};

type AliasSeed = {
  productId: string;
  alias: string;
  source: string;
  weight: number;
};

function readEnvValue(key: string) {
  if (process.env[key]) {
    return process.env[key];
  }

  const envPath = join(process.cwd(), '.env');
  const envContent = readFileSync(envPath, 'utf8');

  for (const line of envContent.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const currentKey = trimmed.slice(0, separatorIndex).trim();
    if (currentKey !== key) {
      continue;
    }

    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    return rawValue.replace(/^['"]|['"]$/g, '');
  }

  return undefined;
}

function normalizeAlias(value: string): string {
  return value
    .toLowerCase()
    .replace(/([\u0d80-\u0dff])([a-z0-9])/g, '$1 $2')
    .replace(/([a-z0-9])([\u0d80-\u0dff])/g, '$1 $2')
    .replace(/[+_/|,.;:()\[\]{}'"`~!@#$%^&*?<>\\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(value: string): string[] {
  return normalizeAlias(value)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

function addAlias(target: Map<string, AliasSeed>, entry: AliasSeed) {
  const normalized = normalizeAlias(entry.alias);
  if (!normalized || normalized.length < 2) {
    return;
  }

  const current = target.get(normalized);
  if (!current || entry.weight > current.weight) {
    target.set(normalized, { ...entry, alias: normalized });
  }
}

function buildAliases(product: ProductRow): AliasSeed[] {
  const output = new Map<string, AliasSeed>();
  const name = (product.name || '').trim();
  const nameSi = (product.name_si || '').trim();
  const desc = (product.description || '').trim();
  const descSi = (product.description_si || '').trim();
  const brand = (product.brand || '').trim();
  const sku = (product.sku || '').trim();

  addAlias(output, { productId: product.id, alias: sku, source: 'sku', weight: 1.2 });
  addAlias(output, { productId: product.id, alias: name, source: 'name', weight: 1.0 });

  if (nameSi) {
    addAlias(output, { productId: product.id, alias: nameSi, source: 'name_si', weight: 1.0 });
  }

  if (brand) {
    addAlias(output, { productId: product.id, alias: brand, source: 'brand', weight: 0.8 });
    addAlias(output, { productId: product.id, alias: `${brand} ${name}`, source: 'brand_name', weight: 1.05 });
  }

  const nameTokens = tokenize(name);
  const siTokens = tokenize(nameSi);
  const descTokens = tokenize(desc).slice(0, 8);
  const descSiTokens = tokenize(descSi).slice(0, 8);

  for (const token of nameTokens) {
    addAlias(output, { productId: product.id, alias: token, source: 'name_token', weight: 0.62 });
  }

  for (const token of siTokens) {
    addAlias(output, { productId: product.id, alias: token, source: 'name_si_token', weight: 0.62 });
  }

  for (const token of descTokens) {
    addAlias(output, { productId: product.id, alias: token, source: 'desc_token', weight: 0.38 });
  }

  for (const token of descSiTokens) {
    addAlias(output, { productId: product.id, alias: token, source: 'desc_si_token', weight: 0.38 });
  }

  const compactName = normalizeAlias(name).replace(/\s+/g, '');
  const compactNameSi = normalizeAlias(nameSi).replace(/\s+/g, '');
  const compactBrandName = normalizeAlias(`${brand} ${name}`).replace(/\s+/g, '');

  if (compactName.length >= 4) {
    addAlias(output, { productId: product.id, alias: compactName, source: 'name_compact', weight: 0.72 });
  }
  if (compactNameSi.length >= 4) {
    addAlias(output, { productId: product.id, alias: compactNameSi, source: 'name_si_compact', weight: 0.72 });
  }
  if (compactBrandName.length >= 4) {
    addAlias(output, { productId: product.id, alias: compactBrandName, source: 'brand_name_compact', weight: 0.76 });
  }

  return Array.from(output.values());
}

async function insertAliasBatch(client: Client, aliases: AliasSeed[]) {
  if (aliases.length === 0) {
    return;
  }

  const values: unknown[] = [];
  const placeholders: string[] = [];

  aliases.forEach((entry, index) => {
    const base = index * 5;
    placeholders.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, NOW(), NOW())`);
    values.push(entry.productId, entry.alias, entry.alias, entry.weight, entry.source);
  });

  await client.query(
    `
      INSERT INTO core.product_aliases (
        product_id,
        alias,
        alias_normalized,
        weight,
        source,
        created_at,
        updated_at
      )
      VALUES ${placeholders.join(', ')}
      ON CONFLICT (product_id, alias_normalized)
      DO UPDATE SET
        alias = EXCLUDED.alias,
        weight = GREATEST(core.product_aliases.weight, EXCLUDED.weight),
        source = EXCLUDED.source,
        updated_at = NOW()
    `,
    values,
  );
}

async function run() {
  const databaseUrl = readEnvValue('DATABASE_URL');
  if (!databaseUrl) {
    throw new Error('DATABASE_URL not found in environment or .env');
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    await client.query('BEGIN');
    await client.query('CREATE EXTENSION IF NOT EXISTS pg_trgm');

    const productsResult = await client.query<ProductRow>(
      `
        SELECT
          id,
          sku,
          name,
          name_si,
          description,
          description_si,
          brand
        FROM core.products
        WHERE is_active = true
      `,
    );

    const products = productsResult.rows;
    if (products.length === 0) {
      console.log('No active products found.');
      await client.query('COMMIT');
      return;
    }

    await client.query('DELETE FROM core.product_aliases');

    const allAliases: AliasSeed[] = [];
    for (const product of products) {
      allAliases.push(...buildAliases(product));
    }

    const batchSize = 1000;
    for (let i = 0; i < allAliases.length; i += batchSize) {
      await insertAliasBatch(client, allAliases.slice(i, i + batchSize));
    }

    await client.query(
      `
        CREATE INDEX IF NOT EXISTS idx_product_aliases_alias_norm_trgm
        ON core.product_aliases
        USING gin (alias_normalized gin_trgm_ops)
      `,
    );

    await client.query(
      `
        CREATE INDEX IF NOT EXISTS idx_products_name_trgm
        ON core.products
        USING gin (lower(name) gin_trgm_ops)
      `,
    );

    await client.query(
      `
        CREATE INDEX IF NOT EXISTS idx_products_name_si_trgm
        ON core.products
        USING gin (lower(name_si) gin_trgm_ops)
      `,
    );

    await client.query(
      `
        CREATE INDEX IF NOT EXISTS idx_products_brand_trgm
        ON core.products
        USING gin (lower(brand) gin_trgm_ops)
      `,
    );

    await client.query('COMMIT');

    console.log(`Indexed ${products.length} products with ${allAliases.length} aliases.`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

run().catch((error) => {
  console.error('build-product-aliases failed:', error);
  process.exitCode = 1;
});
