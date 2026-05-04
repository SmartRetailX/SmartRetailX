import { readFile } from 'node:fs/promises';
import * as path from 'node:path';
import { Pool } from 'pg';

type CsvUserRow = {
  name?: string;
  email?: string;
  age?: string;
  gender?: string;
  City?: string;
  mobileNumber?: string;
  customerSegment?: string;
};

type CreateUserPayload = {
  name: string;
  email: string;
  password: string;
  age?: number;
  gender?: string;
  City?: string;
  mobileNumber?: string;
  customerSegment?: string;
};

type CreateUserResult = {
  email: string;
  success: boolean;
  status?: number;
  message?: string;
};

const DEFAULT_API_BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:3000';
const DEFAULT_SIGNUP_PATH = process.env.SIGNUP_PATH ?? '/api/auth/sign-up/email';
const CSV_PATH =
  process.env.CSV_PATH ?? path.join(process.cwd(), 'scripts/user-accoun-create/users.csv');
const DEFAULT_PASSWORD = process.env.DEFAULT_PASSWORD ?? 'ChangeMe@123';
const CONCURRENCY = Number(process.env.CONCURRENCY ?? 10);
const REQUEST_TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS ?? 15000);
const MAX_RETRIES = Number(process.env.MAX_RETRIES ?? 2);
const DATABASE_URL = process.env.DATABASE_URL;

let pool: Pool | null = null;

function getDbPool(): Pool {
  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL is required to update customerSegment for existing users.');
  }

  if (!pool) {
    pool = new Pool({
      connectionString: DATABASE_URL,
    });
  }

  return pool;
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      const next = line[i + 1];
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
        continue;
      }

      inQuotes = !inQuotes;
      continue;
    }

    if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current);
  return values.map((value) => value.trim());
}

function toOptionalString(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function createPassword(row: CsvUserRow): string {
  const phoneSuffix = (row.mobileNumber ?? '').replace(/\D/g, '').slice(-4);
  if (!phoneSuffix) return DEFAULT_PASSWORD;
  return `SrX!${phoneSuffix}Aa`;
}

function normalizePayload(row: CsvUserRow): CreateUserPayload | null {
  const name = toOptionalString(row.name);
  const email = toOptionalString(row.email)?.toLowerCase();

  if (!name || !email) {
    return null;
  }

  const ageRaw = toOptionalString(row.age);
  const age = ageRaw && /^\d+$/.test(ageRaw) ? Number(ageRaw) : undefined;

  return {
    name,
    email,
    password: createPassword(row),
    age,
    gender: toOptionalString(row.gender),
    City: toOptionalString(row.City),
    mobileNumber: toOptionalString(row.mobileNumber),
    customerSegment: toOptionalString(row.customerSegment),
  };
}

function isExistingUserError(result: CreateUserResult): boolean {
  const msg = (result.message ?? '').toLowerCase();
  return (
    msg.includes('already') ||
    msg.includes('exists') ||
    msg.includes('duplicate') ||
    msg.includes('use another email')
  );
}

async function updateCustomerSegmentByEmail(
  email: string,
  customerSegment: string | undefined,
): Promise<{ updated: boolean; message?: string }> {
  if (!customerSegment) {
    return { updated: false, message: 'No customerSegment in sheet row' };
  }

  const db = getDbPool();

  try {
    const result = await db.query(
      'UPDATE auth."user" SET "customerSegment" = $1, "updatedAt" = NOW() WHERE "email" = $2',
      [customerSegment, email],
    );

    if (result.rowCount && result.rowCount > 0) {
      return { updated: true };
    }

    return { updated: false, message: 'User not found for segment update' };
  } catch (error) {
    return {
      updated: false,
      message: error instanceof Error ? error.message : 'Unknown DB update error',
    };
  }
}

async function parseCsvFile(filePath: string): Promise<CsvUserRow[]> {
  const raw = await readFile(filePath, 'utf8');
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0);

  if (lines.length === 0) return [];

  const headers = parseCsvLine(lines[0]);
  const rows: CsvUserRow[] = [];

  for (let i = 1; i < lines.length; i += 1) {
    const values = parseCsvLine(lines[i]);
    const row: Record<string, string> = {};

    headers.forEach((header, index) => {
      row[header] = values[index] ?? '';
    });

    rows.push(row as CsvUserRow);
  }

  return rows;
}

async function createUser(payload: CreateUserPayload): Promise<CreateUserResult> {
  const url = new URL(DEFAULT_SIGNUP_PATH, DEFAULT_API_BASE_URL).toString();

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (response.ok) {
        return { email: payload.email, success: true, status: response.status };
      }

      let responseMessage = `HTTP ${response.status}`;
      try {
        const body = (await response.json()) as { message?: string; error?: { message?: string } };
        responseMessage = body?.error?.message ?? body?.message ?? responseMessage;
      } catch {
        // Ignore body parsing failures and keep the default message.
      }

      const retriable = response.status === 429 || response.status >= 500;
      if (retriable && attempt < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
        continue;
      }

      return {
        email: payload.email,
        success: false,
        status: response.status,
        message: responseMessage,
      };
    } catch (error) {
      clearTimeout(timeout);

      if (attempt < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
        continue;
      }

      return {
        email: payload.email,
        success: false,
        message: error instanceof Error ? error.message : 'Unknown network error',
      };
    }
  }

  return {
    email: payload.email,
    success: false,
    message: 'Unknown error',
  };
}

async function runWithConcurrency<TInput, TOutput>(
  items: TInput[],
  limit: number,
  worker: (item: TInput) => Promise<TOutput>,
): Promise<TOutput[]> {
  const results: TOutput[] = new Array(items.length);
  let index = 0;

  async function runner() {
    while (index < items.length) {
      const current = index;
      index += 1;
      results[current] = await worker(items[current]);
    }
  }

  const workers = Array.from({ length: Math.max(1, limit) }, () => runner());
  await Promise.all(workers);

  return results;
}

async function main() {
  console.log(`Reading CSV: ${CSV_PATH}`);
  console.log(`API endpoint: ${new URL(DEFAULT_SIGNUP_PATH, DEFAULT_API_BASE_URL).toString()}`);

  const rows = await parseCsvFile(CSV_PATH);
  const payloads = rows
    .map(normalizePayload)
    .filter((payload): payload is CreateUserPayload => payload !== null);

  if (payloads.length === 0) {
    console.log('No valid rows found.');
    return;
  }

  console.log(`Creating ${payloads.length} users with concurrency=${CONCURRENCY} ...`);

  const results = await runWithConcurrency(payloads, CONCURRENCY, async (payload) => {
    const createResult = await createUser(payload);

    if (createResult.success) {
      return createResult;
    }

    if (!isExistingUserError(createResult)) {
      return createResult;
    }

    const updateResult = await updateCustomerSegmentByEmail(payload.email, payload.customerSegment);
    if (updateResult.updated) {
      return {
        email: payload.email,
        success: true,
        status: createResult.status,
        message: 'User existed; customerSegment updated from sheet',
      };
    }

    return {
      email: payload.email,
      success: false,
      status: createResult.status,
      message:
        updateResult.message ??
        'User existed but failed to update customerSegment from sheet',
    };
  });

  const success = results.filter((result) => result.success);
  const failed = results.filter((result) => !result.success);

  console.log(`\nDone. Success: ${success.length}, Failed: ${failed.length}`);

  if (failed.length > 0) {
    console.log('\nFailed rows:');
    for (const failure of failed) {
      console.log(
        `- ${failure.email} | status=${failure.status ?? 'n/a'} | message=${failure.message ?? 'unknown'}`,
      );
    }

    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('Fatal error while creating users:', error);
  process.exit(1);
}).finally(async () => {
  if (pool) {
    await pool.end();
  }
});
