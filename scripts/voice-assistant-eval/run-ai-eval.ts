import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

type QueryRow = {
  id: string;
  language: string;
  query: string;
  expectedIntent: string;
  expectedContains: string;
  expectedNotContains: string;
  notes: string;
};

type VoiceResp = {
  success?: boolean;
  response?: string;
  intent?: string;
  error?: string;
  latencyMs?: number;
};

type JudgeOut = {
  pass: boolean;
  severity: 'critical' | 'high' | 'medium' | 'low';
  issueType:
    | 'intent_mismatch'
    | 'missing_required_content'
    | 'contains_forbidden_content'
    | 'factual_risk'
    | 'language_quality'
    | 'system_error'
    | 'no_issue';
  reasoning: string;
  fixSuggestion: string;
};

type EvalRow = {
  id: string;
  expectedIntent: string;
  actualIntent: string;
  pass: boolean;
  severity: string;
  issueType: string;
  latencyMs: number;
  error: string;
  reasoning: string;
  fixSuggestion: string;
  query: string;
  response: string;
};

const VOICE_ENDPOINT = process.env.VOICE_ENDPOINT ?? 'http://localhost:8000/api/v1/voice/chat';
const TEST_QUERIES_PATH =
  process.env.TEST_QUERIES_PATH ??
  path.join(process.cwd(), 'scripts/voice-assistant-eval/test-queries.csv');
const OUTPUT_DIR =
  process.env.OUTPUT_DIR ?? path.join(process.cwd(), 'scripts/voice-assistant-eval/output');
const OPENAI_API_BASE_URL = process.env.OPENAI_API_BASE_URL ?? 'https://api.openai.com/v1';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL ?? 'gpt-4.1-mini';
const REQUEST_TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS ?? 45000);

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
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

function csv(value: string | number | boolean): string {
  const s = String(value ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function splitTerms(v: string): string[] {
  return (v || '')
    .split('|')
    .map((x) => x.trim())
    .filter(Boolean);
}

async function loadQueries(): Promise<QueryRow[]> {
  const raw = await readFile(TEST_QUERIES_PATH, 'utf8');
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter(Boolean);
  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const vals = parseCsvLine(line);
    const rec = Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? ''])) as Record<string, string>;
    return {
      id: rec.id,
      language: rec.language || 'si-LK',
      query: rec.query,
      expectedIntent: rec.expectedIntent || '',
      expectedContains: rec.expectedContains || '',
      expectedNotContains: rec.expectedNotContains || '',
      notes: rec.notes || '',
    };
  });
}

async function callVoice(query: QueryRow): Promise<VoiceResp> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const form = new FormData();
    form.set('transcriptText', query.query);
    form.set('language', query.language);
    form.set('sessionId', `ai-eval-${query.id}`);
    form.set('userId', 'voice-ai-eval-bot');
    form.set('userRole', 'user');
    form.set('intents', 'offers,order_history,buying_suggestions,prices,product_search,general');

    const res = await fetch(VOICE_ENDPOINT, { method: 'POST', body: form, signal: controller.signal });
    const json = (await res.json()) as VoiceResp;
    if (!res.ok) {
      return {
        success: false,
        error: json.error || `HTTP ${res.status}`,
        intent: json.intent,
        response: json.response,
        latencyMs: json.latencyMs,
      };
    }
    return json;
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'fetch failed' };
  } finally {
    clearTimeout(timeout);
  }
}

function fallbackJudge(query: QueryRow, api: VoiceResp): JudgeOut {
  const txt = (api.response || '').toLowerCase();
  const must = splitTerms(query.expectedContains).map((x) => x.toLowerCase());
  const not = splitTerms(query.expectedNotContains).map((x) => x.toLowerCase());

  if (api.success !== true) {
    return {
      pass: false,
      severity: 'critical',
      issueType: 'system_error',
      reasoning: `Endpoint/system error: ${api.error || 'unknown'}`,
      fixSuggestion: 'Start/fix voice service, verify endpoint availability, and add health checks in CI.',
    };
  }

  if (query.expectedIntent && api.intent !== query.expectedIntent) {
    return {
      pass: false,
      severity: 'high',
      issueType: 'intent_mismatch',
      reasoning: `Expected intent ${query.expectedIntent}, got ${api.intent || '-'}.`,
      fixSuggestion: 'Improve intent routing examples and add contrastive intent training prompts.',
    };
  }

  if (!must.every((m) => txt.includes(m))) {
    return {
      pass: false,
      severity: 'medium',
      issueType: 'missing_required_content',
      reasoning: `Response missing required signals: ${must.filter((m) => !txt.includes(m)).join(', ')}`,
      fixSuggestion: 'Add response template constraints and retrieval hints for required details.',
    };
  }

  if (!not.every((n) => !txt.includes(n))) {
    return {
      pass: false,
      severity: 'medium',
      issueType: 'contains_forbidden_content',
      reasoning: `Response contains forbidden signals: ${not.filter((n) => txt.includes(n)).join(', ')}`,
      fixSuggestion: 'Add guardrails to suppress forbidden/error strings in successful responses.',
    };
  }

  return {
    pass: true,
    severity: 'low',
    issueType: 'no_issue',
    reasoning: 'Matched expected intent and keyword constraints.',
    fixSuggestion: '',
  };
}

async function aiJudge(query: QueryRow, api: VoiceResp): Promise<JudgeOut> {
  if (!OPENAI_API_KEY) {
    return fallbackJudge(query, api);
  }

  const prompt = {
    query,
    assistantOutput: {
      success: api.success ?? false,
      intent: api.intent ?? '',
      response: api.response ?? '',
      error: api.error ?? '',
    },
    task:
      'Evaluate if assistant output satisfies expected behavior. Return strict JSON with keys: pass(boolean), severity(critical|high|medium|low), issueType(intent_mismatch|missing_required_content|contains_forbidden_content|factual_risk|language_quality|system_error|no_issue), reasoning(string), fixSuggestion(string).',
  };

  try {
    const res = await fetch(`${OPENAI_API_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'You are a strict QA judge for Sinhala retail assistant outputs. Be concise, deterministic, and conservative. Output JSON only.',
          },
          { role: 'user', content: JSON.stringify(prompt) },
        ],
      }),
    });

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const content = json.choices?.[0]?.message?.content ?? '{}';
    const parsed = JSON.parse(content) as Partial<JudgeOut>;

    return {
      pass: Boolean(parsed.pass),
      severity: (parsed.severity as JudgeOut['severity']) ?? 'medium',
      issueType: (parsed.issueType as JudgeOut['issueType']) ?? 'language_quality',
      reasoning: parsed.reasoning ?? 'No reasoning.',
      fixSuggestion: parsed.fixSuggestion ?? '',
    };
  } catch {
    return fallbackJudge(query, api);
  }
}

function buildBugFixMd(rows: EvalRow[]): string {
  const failed = rows.filter((r) => !r.pass);
  const total = rows.length;
  const pass = rows.filter((r) => r.pass).length;

  const byType = new Map<string, EvalRow[]>();
  for (const row of failed) {
    byType.set(row.issueType, [...(byType.get(row.issueType) ?? []), row]);
  }

  const blocks = [...byType.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .map(([type, group]) => {
      const sample = group.slice(0, 5)
        .map((g) => `- ${g.id} (${g.severity}): ${g.reasoning}`)
        .join('\n');
      const topFix = group[0]?.fixSuggestion || 'Investigate failure cluster and add targeted prompt/tooling constraints.';
      return `### ${type}\n- Count: ${group.length}\n- Suggested Fix: ${topFix}\n- Samples:\n${sample || '- None'}`;
    })
    .join('\n\n');

  return [
    '# AI-Based Voice Assistant Bug Fix Backlog',
    '',
    `- Total: ${total}`,
    `- Passed: ${pass}`,
    `- Failed: ${failed.length}`,
    `- Pass Rate: ${total ? ((pass / total) * 100).toFixed(2) : '0.00'}%`,
    '',
    '## Prioritized Failure Clusters',
    blocks || '- No failures',
    '',
    '## Immediate Fix Plan',
    '1. Fix `system_error` failures first (service availability, endpoint routing, timeout handling).',
    '2. Fix `intent_mismatch` next (intent prompts, routing rules, disambiguation examples).',
    '3. Fix content-quality classes (`missing_required_content`, `language_quality`) using response templates and retrieval constraints.',
    '4. Re-run AI eval after each fix batch and compare pass-rate deltas.',
    '',
  ].join('\n');
}

async function main() {
  const queries = await loadQueries();
  await mkdir(OUTPUT_DIR, { recursive: true });

  const rows: EvalRow[] = [];

  for (const q of queries) {
    const api = await callVoice(q);
    const judge = await aiJudge(q, api);

    rows.push({
      id: q.id,
      expectedIntent: q.expectedIntent,
      actualIntent: api.intent ?? '',
      pass: judge.pass,
      severity: judge.severity,
      issueType: judge.issueType,
      latencyMs: Number(api.latencyMs ?? 0),
      error: api.error ?? '',
      reasoning: judge.reasoning,
      fixSuggestion: judge.fixSuggestion,
      query: q.query,
      response: api.response ?? '',
    });

    console.log(`${q.id} [${judge.pass ? 'PASS' : 'FAIL'}] ${judge.issueType}`);
  }

  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const csvPath = path.join(OUTPUT_DIR, `voice-ai-eval-results-${ts}.csv`);
  const bugPath = path.join(OUTPUT_DIR, `voice-ai-bugfix-backlog-${ts}.md`);

  const csvOut = [
    'id,pass,severity,issueType,expectedIntent,actualIntent,latencyMs,error,reasoning,fixSuggestion,query,response',
    ...rows.map((r) =>
      [
        r.id,
        r.pass,
        r.severity,
        r.issueType,
        r.expectedIntent,
        r.actualIntent,
        r.latencyMs,
        r.error,
        r.reasoning,
        r.fixSuggestion,
        r.query,
        r.response,
      ]
        .map(csv)
        .join(','),
    ),
  ].join('\n');

  await writeFile(csvPath, `${csvOut}\n`, 'utf8');
  await writeFile(bugPath, buildBugFixMd(rows), 'utf8');

  console.log(`AI eval results: ${csvPath}`);
  console.log(`Bug-fix backlog: ${bugPath}`);
}

main().catch((e) => {
  console.error('AI eval failed:', e);
  process.exit(1);
});
