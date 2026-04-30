import { readFileSync } from 'fs';
import { join } from 'path';
import { Client } from 'pg';

type SourceProduct = {
  category: string;
  categorySi?: string | null;
  categoryId: number;
  itemID: number;
  itemCode: string;
  name: string;
  nameSi?: string | null;
  description?: string | null;
  descriptionSi?: string | null;
  price: number;
  originalPrice?: number;
  uom?: string;
  imageUrl?: string;
  isAvailable?: boolean;
  discountPercentage?: number;
  stockQuantity?: number;
  brand?: string | null;
  purchaseFrequency?: 'high' | 'medium' | 'low' | string | null;
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

function loadProducts() {
  const filePath = join(process.cwd(), 'scripts/data-insert-scripts/merged-files/products.json');
  return JSON.parse(readFileSync(filePath, 'utf8')) as SourceProduct[];
}

function deriveInitialStock(product: SourceProduct) {
  if (typeof product.stockQuantity === 'number') {
    return Math.max(0, Math.floor(product.stockQuantity));
  }

  return product.isAvailable === false ? 0 : 1;
}

function deriveDescription(product: SourceProduct) {
  if (product.description?.trim()) {
    return product.description.trim();
  }

  return product.uom ? `${product.name.trim()} (${product.uom.trim()})` : null;
}

function deriveBrand(product: SourceProduct) {
  const value = product.brand?.trim();
  return value && value.length > 0 ? value : 'unbranded';
}

function derivePurchaseFrequency(product: SourceProduct) {
  const value = product.purchaseFrequency?.trim().toLowerCase();
  if (value === 'high' || value === 'medium' || value === 'low') {
    return value;
  }
  return 'medium';
}

async function pushToDatabase() {
  const databaseUrl = readEnvValue('DATABASE_URL');
  if (!databaseUrl) {
    throw new Error('DATABASE_URL not found in environment or .env');
  }

  const client = new Client({ connectionString: databaseUrl });
  const products = loadProducts();

  await client.connect();

  try {
    console.log(`Importing ${products.length} products into core catalog tables...`);
    await client.query('BEGIN');

    for (let index = 0; index < products.length; index += 1) {
      const product = products[index];

      const categoryResult = await client.query<{ id: string }>(
        `
          INSERT INTO core.categories (name, name_si, created_at, updated_at)
          VALUES ($1, $2, NOW(), NOW())
          ON CONFLICT (name)
          DO UPDATE SET
            name_si = COALESCE(EXCLUDED.name_si, core.categories.name_si),
            updated_at = NOW()
          RETURNING id
        `,
        [product.category.trim(), product.categorySi?.trim() || null],
      );

      const categoryId = categoryResult.rows[0]?.id;
      if (!categoryId) {
        throw new Error(`Failed to resolve category for ${product.name}`);
      }

      const description = deriveDescription(product);
      const initialStock = deriveInitialStock(product);
      const brand = deriveBrand(product);
      const purchaseFrequency = derivePurchaseFrequency(product);

      const productResult = await client.query<{ id: string; stock_quantity: number }>(
        `
          INSERT INTO core.products (
            sku,
            name,
            name_si,
            description,
            description_si,
            category_id,
            price,
            stock_quantity,
            brand,
            purchase_frequency,
            image_url,
            is_active,
            created_by,
            created_at,
            updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, 0, $8, $9, $10, $11, $12, NOW(), NOW())
          ON CONFLICT (sku)
          DO UPDATE SET
            name = EXCLUDED.name,
            name_si = EXCLUDED.name_si,
            description = EXCLUDED.description,
            description_si = EXCLUDED.description_si,
            category_id = EXCLUDED.category_id,
            price = EXCLUDED.price,
            brand = EXCLUDED.brand,
            purchase_frequency = EXCLUDED.purchase_frequency,
            image_url = EXCLUDED.image_url,
            is_active = EXCLUDED.is_active,
            updated_at = NOW()
          RETURNING id, stock_quantity
        `,
        [
          product.itemCode.trim(),
          product.name.trim(),
          product.nameSi?.trim() || null,
          description,
          product.descriptionSi?.trim() || null,
          categoryId,
          product.price,
          brand,
          purchaseFrequency,
          product.imageUrl?.trim() || null,
          true,
          'db_push_script',
        ],
      );

      const productId = productResult.rows[0]?.id;
      if (!productId) {
        throw new Error(`Failed to upsert product ${product.itemCode}`);
      }

      const stockCountResult = await client.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM core.stock_entries WHERE product_id = $1`,
        [productId],
      );

      if (stockCountResult.rows[0]?.count === '0') {
        await client.query(
          `
            UPDATE core.products
            SET stock_quantity = $2, updated_at = NOW()
            WHERE id = $1
          `,
          [productId, initialStock],
        );

        await client.query(
          `
            INSERT INTO core.stock_entries (
              product_id,
              quantity_change,
              balance_after,
              type,
              note,
              created_by,
              created_at
            )
            VALUES ($1, $2, $2, 'initial', $3, $4, NOW())
          `,
          [productId, initialStock, 'Initial stock from JSON import', 'db_push_script'],
        );
      }

      if ((index + 1) % 100 === 0) {
        console.log(`Processed ${index + 1}/${products.length} products`);
      }
    }

    await client.query('COMMIT');
    console.log('Product import completed successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

pushToDatabase().catch((error) => {
  console.error('Database push failed:', error);
  process.exitCode = 1;
});
