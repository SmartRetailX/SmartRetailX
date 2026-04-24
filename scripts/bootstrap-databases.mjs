#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import process from 'node:process';

const commands = [
  {
    label: 'Generate main Prisma client',
    command: 'pnpm',
    args: ['exec', 'prisma', 'generate', '--schema', 'libs/database/prisma/schema.prisma'],
  },
  {
    label: 'Create or update main application schema',
    command: 'pnpm',
    args: ['exec', 'prisma', 'db', 'push', '--schema', 'libs/database/prisma/schema.prisma', '--skip-generate'],
  },
  {
    label: 'Generate BI dashboard Prisma client',
    command: 'pnpm',
    args: ['exec', 'prisma', 'generate', '--schema', 'apps/bi-dashboard-services-gateway/prisma/schema.prisma'],
  },
  {
    label: 'Create or update BI dashboard schema',
    command: 'pnpm',
    args: [
      'exec',
      'prisma',
      'db',
      'push',
      '--schema',
      'apps/bi-dashboard-services-gateway/prisma/schema.prisma',
      '--skip-generate',
    ],
  },
];

const isDryRun = process.argv.includes('--dry-run');
const databaseUrl = process.env.DATABASE_URL?.trim();

if (!databaseUrl) {
  console.error('DATABASE_URL is required before bootstrapping the database.');
  process.exit(1);
}

for (const step of commands) {
  console.log(`\n==> ${step.label}`);
  console.log(`${step.command} ${step.args.join(' ')}`);

  if (isDryRun) {
    continue;
  }

  const result = spawnSync(step.command, step.args, {
    cwd: process.cwd(),
    stdio: 'inherit',
    env: process.env,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

if (isDryRun) {
  console.log('\nDry run complete.');
} else {
  console.log('\nDatabase bootstrap complete.');
}
