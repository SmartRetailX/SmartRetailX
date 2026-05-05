import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { Client } from 'pg';

function readEnvValue(key: string) {
  if (process.env[key]) {
    return process.env[key];
  }

  const envPath = join(process.cwd(), '.env');
  try {
    const envContent = require('fs').readFileSync(envPath, 'utf8');
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
  } catch {
    return undefined;
  }

  return undefined;
}

type UserRow = {
  id: string;
  name: string;
  email: string;
};

type ProductRow = {
  id: string;
  sku: string;
  name: string;
  name_si: string | null;
  price: string;
};

type CategoryRow = {
  id: string;
  name: string;
  name_si: string | null;
};

type OrderRow = {
  id: string;
  order_number: string;
  user_id: string;
  status: string;
  total: string;
  created_at: string;
};

function csvEscape(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const raw = String(value);
  if (/[,"\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

function writeCsv<T extends Record<string, string | number | null | undefined>>(
  filePath: string,
  headers: Array<keyof T>,
  rows: T[],
) {
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((key) => csvEscape(row[key])).join(','));
  }
  writeFileSync(filePath, `${lines.join('\n')}\n`, 'utf8');
}

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDateWithin(daysBack: number): Date {
  const now = Date.now();
  const offset = randomInt(0, daysBack * 24 * 60 * 60 * 1000);
  return new Date(now - offset);
}

async function run() {
  const databaseUrl = readEnvValue('DATABASE_URL');
  if (!databaseUrl) {
    throw new Error('DATABASE_URL not found in environment or .env');
  }

  const exportDir =
    process.env.EXPORT_DIR ?? join(process.cwd(), 'scripts/data-insert-scripts/exports');
  const transactionCount = Number(process.env.TRANSACTION_COUNT ?? 2000);

  mkdirSync(exportDir, { recursive: true });

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    const usersResult = await client.query<UserRow>(
      'SELECT id, name, email FROM auth."user" ORDER BY "createdAt" ASC',
    );
    const productsResult = await client.query<ProductRow>(
      `
        SELECT id, sku, name, name_si, price
        FROM core.products
        WHERE is_active = true
        ORDER BY created_at ASC
      `,
    );
    const categoriesResult = await client.query<CategoryRow>(
      'SELECT id, name, name_si FROM core.categories ORDER BY created_at ASC',
    );
    const ordersResult = await client.query<OrderRow>(
      `
        SELECT id, order_number, user_id, status, total, created_at
        FROM core.orders
        ORDER BY created_at DESC
        LIMIT 2000
      `,
    );

    if (usersResult.rows.length === 0 || productsResult.rows.length === 0) {
      throw new Error('Need at least one user and one active product to generate transactions.');
    }

    writeCsv(join(exportDir, 'users.csv'), ['id', 'name', 'email'], usersResult.rows);
    writeCsv(join(exportDir, 'products.csv'), ['id', 'sku', 'name', 'name_si', 'price'], productsResult.rows);
    writeCsv(join(exportDir, 'categories.csv'), ['id', 'name', 'name_si'], categoriesResult.rows);
    writeCsv(join(exportDir, 'orders.csv'), ['id', 'order_number', 'user_id', 'status', 'total', 'created_at'], ordersResult.rows);

    console.log(`Exported CSV files to ${exportDir}`);

    const users = usersResult.rows;
    const products = productsResult.rows;

    await client.query('BEGIN');

    for (let i = 0; i < transactionCount; i += 1) {
      const user = pick(users);
      const product = pick(products);
      const quantity = randomInt(1, 5);
      const unitPrice = Number(product.price);
      const grossTotal = unitPrice * quantity;
      const discountAmount = Math.random() < 0.25 ? Number((grossTotal * 0.05).toFixed(2)) : 0;
      const totalAmount = Number((grossTotal - discountAmount).toFixed(2));
      const txnDate = randomDateWithin(90);
      const orderNumber = `ORD-${txnDate.getTime()}-${i}`;
      const invoiceNo = `INV-${txnDate.getTime()}-${i}`;

      const orderResult = await client.query<{ id: string }>(
        `
          INSERT INTO core.orders (
            order_number,
            user_id,
            status,
            subtotal,
            discount,
            tax,
            total,
            shipping_address,
            billing_address,
            notes,
            created_at,
            updated_at
          )
          VALUES ($1, $2, 'delivered', $3, $4, 0, $5, NULL, NULL, NULL, $6, $6)
          RETURNING id
        `,
        [orderNumber, user.id, grossTotal, discountAmount, totalAmount, txnDate],
      );

      const orderId = orderResult.rows[0]?.id;
      if (!orderId) {
        throw new Error('Failed to create order for transaction');
      }

      await client.query(
        `
          INSERT INTO core.order_items (
            order_id,
            product_id,
            product_name,
            product_name_si,
            product_sku,
            quantity,
            unit_price,
            total_price,
            created_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `,
        [
          orderId,
          product.id,
          product.name,
          product.name_si,
          product.sku,
          quantity,
          unitPrice,
          totalAmount,
          txnDate,
        ],
      );

      await client.query(
        `
          INSERT INTO core.transactions (
            order_id,
            invoice_no,
            customer_id,
            product_id,
            quantity,
            unit_price,
            total_amount,
            transaction_date,
            discount_amount,
            promotion_id
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NULL)
        `,
        [
          orderId,
          invoiceNo,
          user.id,
          product.id,
          quantity,
          unitPrice,
          totalAmount,
          txnDate,
          discountAmount,
        ],
      );

      if ((i + 1) % 100 === 0) {
        console.log(`Inserted ${i + 1}/${transactionCount} transactions...`);
      }
    }

    await client.query('COMMIT');
    console.log(`Inserted ${transactionCount} transactions successfully.`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

run().catch((error) => {
  console.error('Transaction generation failed:', error);
  process.exitCode = 1;
});
