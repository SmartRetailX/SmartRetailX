import { PrismaClient } from '@prisma/client';
import { Client } from 'pg';

/**
 * Sync products from core DB (source) into BI schema (target) by SKU.
 *
 * Usage:
 *  DATABASE_URL_SOURCE=postgresql://... DATABASE_URL_TARGET=postgresql://... pnpm tsx apps/bi-dashboard-services-gateway/scripts/sync-products.ts --since="2026-05-01T00:00:00Z"
 *
 * Behavior:
 * - Fetches changed products from source where updated_at > since
 * - Batch upserts into target `bi_dashboard.products` by `sku`
 * - Preserves BI-specific fields by only overwriting core fields
 */

const sourceUrl = process.env.DATABASE_URL_SOURCE || process.env.DATABASE_URL;
const targetUrl = process.env.DATABASE_URL_TARGET || process.env.DATABASE_URL;

if (!sourceUrl || !targetUrl) {
  console.error('Please set DATABASE_URL_SOURCE and DATABASE_URL_TARGET');
  process.exit(1);
}

const sinceArgIndex = process.argv.findIndex((a) => a.startsWith('--since='));
const since = sinceArgIndex >= 0 ? process.argv[sinceArgIndex].split('=')[1] : null;

const BATCH_SIZE = 200; // safe default

async function main() {
  const srcClient = new Client({ connectionString: sourceUrl });
  await srcClient.connect();

  const prisma = new PrismaClient({ datasources: { db: { url: targetUrl } } });

  try {
    console.log('🔁 Starting product sync (by SKU)');
    let whereClause = '';
    const params: any[] = [];
    if (since) {
      params.push(since);
      whereClause = `WHERE updated_at > $${params.length}`;
      console.log('⏱ Incremental sync since', since);
    } else {
      console.log('⚠️ No --since provided, performing full sync (use with care)');
    }

    const countRes = await srcClient.query(`SELECT count(*) FROM products ${whereClause}`, params);
    const total = Number(countRes.rows[0].count || 0);
    console.log(`Found ${total} product(s) to sync`);

    const selectSql = `SELECT id, sku, name, description, brand, category_id, price, is_active, created_by, updated_at FROM products ${whereClause} ORDER BY updated_at ASC`;

    const cursor = srcClient.query(new (require('pg-cursor'))(selectSql, params));

    async function readBatch(): Promise<any[]> {
      return new Promise((resolve, reject) => {
        cursor.read(BATCH_SIZE, (err: any, rows: any[]) => {
          if (err) return reject(err);
          resolve(rows || []);
        });
      });
    }

    while (true) {
      const rows = await readBatch();
      if (!rows.length) break;

      // Build parameterized INSERT ... ON CONFLICT by sku
      // We'll insert core fields and let BI fields remain untouched unless provided
      const values: string[] = [];
      const flat: any[] = [];
      rows.forEach((r, i) => {
        const idx = i * 11;
        values.push(`($${idx + 1}, $${idx + 2}, $${idx + 3}, $${idx + 4}, $${idx + 5}, $${idx + 6}, $${idx + 7}, $${idx + 8}, $${idx + 9}, $${idx + 10}, $${idx + 11})`);
        flat.push(r.id, r.sku, r.name, r.description || null, r.brand || null, r.category_id || null, r.price || null, r.is_active !== undefined ? r.is_active : true, r.created_by || null, r.updated_at || new Date().toISOString(), null);
      });

      // columns: id, sku, name, description, brand, category_id, price, is_active, created_by, updated_at, image_url
      const insertSql = `
        INSERT INTO bi_dashboard.products (id, sku, name, description, brand, category_id, price, is_active, created_by, updated_at, image_url)
        VALUES ${values.join(',')}
        ON CONFLICT (sku) DO UPDATE SET
          name = EXCLUDED.name,
          description = COALESCE(EXCLUDED.description, bi_dashboard.products.description),
          brand = COALESCE(EXCLUDED.brand, bi_dashboard.products.brand),
          category_id = COALESCE(EXCLUDED.category_id, bi_dashboard.products.category_id),
          price = COALESCE(EXCLUDED.price, bi_dashboard.products.price),
          is_active = EXCLUDED.is_active,
          created_by = COALESCE(EXCLUDED.created_by, bi_dashboard.products.created_by),
          updated_at = EXCLUDED.updated_at
      `;

      // Execute raw SQL on target
      // Use prisma.$executeRawUnsafe because parameterized array building is complex here
      // We still pass parameters to the pg client directly for safety
      await prisma.$executeRawUnsafe(insertSql, ...flat);

      console.log(`Upserted ${rows.length} products`);
    }

    console.log('✅ Product sync completed');
  } catch (err) {
    console.error('❌ Sync failed:', err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
    await srcClient.end();
  }
}

main();
