import { mkdir, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';

type TestQueryRow = {
  id: string;
  language: string;
  query: string;
  expectedIntent?: string;
  expectedContains?: string;
  expectedNotContains?: string;
  notes?: string;
};

type EvaluationRow = {
  id: string;
  query: string;
  language: string;
  expectedIntent: string;
  actualIntent: string;
  expectedContains: string;
  containsPass: boolean;
  expectedNotContains: string;
  notContainsPass: boolean;
  intentPass: boolean;
  success: boolean;
  latencyMs: number;
  assistantResponse: string;
  error: string;
  status: 'PASS' | 'FAIL';
};

type VoiceChatApiResponse = {
  success?: boolean;
  response?: string;
  intent?: string;
  error?: string;
  latencyMs?: number;
};

const VOICE_ENDPOINT = process.env.VOICE_ENDPOINT ?? 'http://localhost:8000/api/v1/voice/chat';
const TEST_QUERIES_PATH =
  process.env.TEST_QUERIES_PATH ??
  path.join(process.cwd(), 'scripts/voice-assistant-eval/test-queries.csv');
const OUTPUT_DIR =
  process.env.OUTPUT_DIR ?? path.join(process.cwd(), 'scripts/voice-assistant-eval/output');
const REQUEST_TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS ?? 45000);

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      const next = line[i + 1];
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      cells.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

function toCsvValue(value: string | number | boolean): string {
  const stringValue = String(value ?? '');
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

function parseList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split('|')
    .map((v) => v.trim().toLowerCase())
    .filter((v) => v.length > 0);
}

function containsAll(haystack: string, needles: string[]): boolean {
  if (needles.length === 0) return true;
  const source = haystack.toLowerCase();
  return needles.every((needle) => source.includes(needle));
}

function containsNone(haystack: string, needles: string[]): boolean {
  if (needles.length === 0) return true;
  const source = haystack.toLowerCase();
  return needles.every((needle) => !source.includes(needle));
}

async function loadTestQueries(filePath: string): Promise<TestQueryRow[]> {
  const raw = await readFile(filePath, 'utf8');
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0);

  if (lines.length <= 1) return [];

  const headers = parseCsvLine(lines[0]);
  const rows: TestQueryRow[] = [];

  for (let i = 1; i < lines.length; i += 1) {
    const cells = parseCsvLine(lines[i]);
    const row = Object.fromEntries(headers.map((h, idx) => [h, cells[idx] ?? ''])) as Record<
      string,
      string
    >;

    if (!row.id || !row.query) {
      continue;
    }

    rows.push({
      id: row.id,
      language: row.language || 'si-LK',
      query: row.query,
      expectedIntent: row.expectedIntent || undefined,
      expectedContains: row.expectedContains || undefined,
      expectedNotContains: row.expectedNotContains || undefined,
      notes: row.notes || undefined,
    });
  }

  return rows;
}

async function callVoiceAssistant(query: TestQueryRow): Promise<VoiceChatApiResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const form = new FormData();
    form.set('transcriptText', query.query);
    form.set('language', query.language || 'si-LK');
    form.set('sessionId', `eval-${query.id}`);
    form.set('userId', 'voice-eval-bot');
    form.set('userRole', 'user');
    form.set('intents', 'offers,order_history,buying_suggestions,prices,product_search,user_profile,promotions,general');

    const response = await fetch(VOICE_ENDPOINT, {
      method: 'POST',
      body: form,
      signal: controller.signal,
    });

    const json = (await response.json()) as VoiceChatApiResponse;

    if (!response.ok) {
      return {
        success: false,
        error: json.error || `HTTP ${response.status}`,
        response: json.response,
        intent: json.intent,
        latencyMs: json.latencyMs,
      };
    }

    return json;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown request failure',
    };
  } finally {
    clearTimeout(timeout);
  }
}

function evaluate(query: TestQueryRow, api: VoiceChatApiResponse): EvaluationRow {
  const assistantResponse = api.response ?? '';
  const expectedIntent = query.expectedIntent ?? '';
  const actualIntent = api.intent ?? '';

  const expectedContainsList = parseList(query.expectedContains);
  const expectedNotContainsList = parseList(query.expectedNotContains);

  const intentPass = !expectedIntent || expectedIntent === actualIntent;
  const containsPass = containsAll(assistantResponse, expectedContainsList);
  const notContainsPass = containsNone(assistantResponse, expectedNotContainsList);
  const success = api.success === true;

  const status: 'PASS' | 'FAIL' =
    success && intentPass && containsPass && notContainsPass ? 'PASS' : 'FAIL';

  return {
    id: query.id,
    query: query.query,
    language: query.language,
    expectedIntent,
    actualIntent,
    expectedContains: query.expectedContains ?? '',
    containsPass,
    expectedNotContains: query.expectedNotContains ?? '',
    notContainsPass,
    intentPass,
    success,
    latencyMs: Number(api.latencyMs ?? 0),
    assistantResponse,
    error: api.error ?? '',
    status,
  };
}

function toResultsCsv(rows: EvaluationRow[]): string {
  const headers = [
    'id',
    'status',
    'query',
    'language',
    'expectedIntent',
    'actualIntent',
    'intentPass',
    'expectedContains',
    'containsPass',
    'expectedNotContains',
    'notContainsPass',
    'success',
    'latencyMs',
    'error',
    'assistantResponse',
  ];

  const lines = [headers.join(',')];

  for (const row of rows) {
    const cells = [
      row.id,
      row.status,
      row.query,
      row.language,
      row.expectedIntent,
      row.actualIntent,
      row.intentPass,
      row.expectedContains,
      row.containsPass,
      row.expectedNotContains,
      row.notContainsPass,
      row.success,
      row.latencyMs,
      row.error,
      row.assistantResponse,
    ].map(toCsvValue);

    lines.push(cells.join(','));
  }

  return `${lines.join('\n')}\n`;
}

function buildImprovementSheet(rows: EvaluationRow[]): string {
  const total = rows.length;
  const passed = rows.filter((r) => r.status === 'PASS').length;
  const failed = rows.filter((r) => r.status === 'FAIL');
  const avgLatency =
    total > 0
      ? Math.round(rows.reduce((sum, row) => sum + (Number.isFinite(row.latencyMs) ? row.latencyMs : 0), 0) / total)
      : 0;

  const byIntent = new Map<string, { total: number; failed: number }>();

  for (const row of rows) {
    const key = row.expectedIntent || 'unspecified';
    const current = byIntent.get(key) ?? { total: 0, failed: 0 };
    current.total += 1;
    if (row.status === 'FAIL') current.failed += 1;
    byIntent.set(key, current);
  }

  const topFailures = [...byIntent.entries()]
    .sort((a, b) => b[1].failed - a[1].failed)
    .slice(0, 5)
    .map(([intent, stats]) => `- ${intent}: ${stats.failed}/${stats.total} failed`)
    .join('\n');

  const failedRows = failed
    .slice(0, 20)
    .map(
      (row) =>
        `- ${row.id} | expectedIntent=${row.expectedIntent || '-'} actualIntent=${row.actualIntent || '-'} | error=${row.error || '-'} | query=${row.query}`,
    )
    .join('\n');

  return [
    '# Voice Assistant Evaluation - Improvement Sheet',
    '',
    `- Total queries: ${total}`,
    `- Passed: ${passed}`,
    `- Failed: ${failed.length}`,
    `- Pass rate: ${total ? ((passed / total) * 100).toFixed(2) : '0.00'}%`,
    `- Average latency: ${avgLatency} ms`,
    '',
    '## Failure Hotspots By Intent',
    topFailures || '- None',
    '',
    '## Failed Test Cases (Top 20)',
    failedRows || '- None',
    '',
    '## Next Improvement Actions',
    '1. Fix highest-failing intents first (by failure ratio and business value).',
    '2. Add/adjust prompt examples for failed intents and edge phrasings.',
    '3. Expand expectedContains checks per intent to lock correct behavior.',
    '4. Re-run evaluation and compare pass rate + latency trend.',
    '',
  ].join('\n');
}

async function main() {
  console.log(`Loading test queries from: ${TEST_QUERIES_PATH}`);
  console.log(`Voice endpoint: ${VOICE_ENDPOINT}`);

  const queries = await loadTestQueries(TEST_QUERIES_PATH);
  if (queries.length === 0) {
    console.log('No test queries found.');
    return;
  }

  const evaluations: EvaluationRow[] = [];

  for (const query of queries) {
    const apiResponse = await callVoiceAssistant(query);
    const evaluated = evaluate(query, apiResponse);
    evaluations.push(evaluated);

    console.log(
      `${evaluated.id} [${evaluated.status}] intent=${evaluated.actualIntent || '-'} latency=${evaluated.latencyMs}ms`,
    );
  }

  await mkdir(OUTPUT_DIR, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const resultsCsvPath = path.join(OUTPUT_DIR, `voice-eval-results-${timestamp}.csv`);
  const improvementSheetPath = path.join(OUTPUT_DIR, `voice-eval-improvement-${timestamp}.md`);

  await writeFile(resultsCsvPath, toResultsCsv(evaluations), 'utf8');
  await writeFile(improvementSheetPath, buildImprovementSheet(evaluations), 'utf8');

  const passed = evaluations.filter((e) => e.status === 'PASS').length;
  console.log(`\nCompleted: ${passed}/${evaluations.length} passed.`);
  console.log(`Results CSV: ${resultsCsvPath}`);
  console.log(`Improvement sheet: ${improvementSheetPath}`);
}

main().catch((error) => {
  console.error('Voice evaluation failed:', error);
  process.exit(1);
});
