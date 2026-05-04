ARG NODE_VERSION=22
ARG PNPM_VERSION=10.32.1

FROM node:${NODE_VERSION}-bookworm-slim AS base
ARG PNPM_VERSION
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    CI=true \
    NX_CLOUD=false \
    NX_DAEMON=false \
    NX_NO_CLOUD=true
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
    && if [ -f "apps/websocket-service/prisma/schema.prisma" ]; then pnpm exec prisma generate --schema apps/websocket-service/prisma/schema.prisma; fi \
    && pnpm nx build websocket-service \
    && pnpm prune --prod

FROM node:${NODE_VERSION}-bookworm-slim AS runtime
ARG PNPM_VERSION
ENV NODE_ENV=production
WORKDIR /app
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl openssl \
    && rm -rf /var/lib/apt/lists/* \
    && corepack enable \
    && corepack prepare pnpm@${PNPM_VERSION} --activate
COPY --from=builder /workspace/node_modules ./node_modules
COPY --from=builder /workspace/dist/apps/websocket-service/ ./
RUN pnpm add --prod --ignore-scripts tslib@2
USER node
CMD ["node", "main.js"]
