ARG NODE_VERSION=20
ARG PNPM_VERSION=10.32.1

FROM node:${NODE_VERSION}-bookworm-slim AS base
ARG PNPM_VERSION
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH
WORKDIR /workspace
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates openssl \
    && rm -rf /var/lib/apt/lists/* \
    && corepack enable \
    && corepack prepare pnpm@${PNPM_VERSION} --activate

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml nx.json tsconfig.base.json ./
COPY apps/web/package.json apps/web/package.json
COPY libs/shared-types/package.json libs/shared-types/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS builder
COPY . .
RUN pnpm exec prisma generate --schema libs/database/prisma/schema.prisma \
    && if [ -f "apps/bi-dashboard-services-gateway/prisma/schema.prisma" ]; then pnpm --dir "apps/bi-dashboard-services-gateway" exec prisma generate; fi \
    && pnpm nx build bi-dashboard-services-gateway \
    && pnpm prune --prod

FROM node:${NODE_VERSION}-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl openssl \
    && rm -rf /var/lib/apt/lists/*
COPY --from=builder /workspace/node_modules ./node_modules
COPY --from=builder /workspace/dist/apps/bi-dashboard-services-gateway/ ./
USER node
CMD ["node", "main.js"]
