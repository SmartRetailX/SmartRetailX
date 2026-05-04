import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

type Row = {
  id: string;
  language: string;
  query: string;
  expectedIntent: string;
  expectedContains: string;
  expectedNotContains: string;
  notes: string;
};

const CSV_PATH =
  process.env.TEST_QUERIES_PATH ??
  path.join(process.cwd(), 'scripts/voice-assistant-eval/test-queries.csv');
const OUT_PATH =
  process.env.EXPECTED_MD_PATH ??
  path.join(process.cwd(), 'scripts/voice-assistant-eval/expected-results.md');

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cur = '';
  let q = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      const next = line[i + 1];
      if (q && next === '"') {
        cur += '"';
        i += 1;
      } else {
        q = !q;
      }
      continue;
    }

    if (ch === ',' && !q) {
      cells.push(cur.trim());
      cur = '';
      continue;
    }

    cur += ch;
  }

  cells.push(cur.trim());
  return cells;
}

function asMdList(v: string): string {
  if (!v) return '-';
  return v
    .split('|')
    .map((x) => x.trim())
    .filter(Boolean)
    .join(', ');
}

async function main() {
  const raw = await readFile(CSV_PATH, 'utf8');
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter(Boolean);

  if (lines.length <= 1) {
    throw new Error('No test rows found');
  }

  const headers = parseCsvLine(lines[0]);
  const rows: Row[] = lines.slice(1).map((line) => {
    const vals = parseCsvLine(line);
    const rec = Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? ''])) as Record<string, string>;
    return {
      id: rec.id,
      language: rec.language,
      query: rec.query,
      expectedIntent: rec.expectedIntent,
      expectedContains: rec.expectedContains,
      expectedNotContains: rec.expectedNotContains,
      notes: rec.notes,
    };
  });

  const byIntent = new Map<string, Row[]>();
  for (const row of rows) {
    const key = row.expectedIntent || 'unspecified';
    byIntent.set(key, [...(byIntent.get(key) ?? []), row]);
  }

  const intentSummary = [...byIntent.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([intent, list]) => `- ${intent}: ${list.length}`)
    .join('\n');

  const tableHeader = '| ID | Query (Sinhala) | Expected Intent | Must Include | Must Not Include | Notes |';
  const tableSep = '|---|---|---|---|---|---|';
  const tableRows = rows
    .map(
      (r) =>
        `| ${r.id} | ${r.query.replace(/\|/g, '\\|')} | ${r.expectedIntent || '-'} | ${asMdList(r.expectedContains)} | ${asMdList(r.expectedNotContains)} | ${(r.notes || '-').replace(/\|/g, '\\|')} |`,
    )
    .join('\n');

  const md = [
    '# Voice Assistant Expected Results (Sinhala)',
    '',
    `- Source CSV: \`${CSV_PATH}\``,
    `- Total test cases: **${rows.length}**`,
    '',
    '## Intent Coverage',
    intentSummary,
    '',
    '## Expected Outcomes Per Query',
    tableHeader,
    tableSep,
    tableRows,
    '',
    '## Pass Criteria',
    '- Intent matches `expectedIntent`.',
    '- Response semantically answers the user query in Sinhala-friendly style.',
    '- Response includes all `expectedContains` signals (keywords or equivalent meaning).',
    '- Response avoids all `expectedNotContains` signals.',
    '- No hallucinated claims when data is unavailable.',
    '',
  ].join('\n');

  await writeFile(OUT_PATH, md, 'utf8');
  console.log(`Expected-results markdown generated: ${OUT_PATH}`);
}

main().catch((err) => {
  console.error('Failed to generate expected results markdown:', err);
  process.exit(1);
});
