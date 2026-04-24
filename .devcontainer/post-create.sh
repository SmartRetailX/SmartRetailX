#!/usr/bin/env bash
set -euo pipefail

cd /workspaces/smart-retail-x

corepack enable
corepack prepare pnpm@10.32.1 --activate
pnpm config set store-dir "${PNPM_STORE_PATH:-/pnpm/store}"

pnpm install --frozen-lockfile
pnpm nx run agent-service:install

if [ ! -f .env ]; then
  cp .env.example .env
fi

pnpm exec prisma generate --schema libs/database/prisma/schema.prisma
