ARG NODE_VERSION=22
ARG PNPM_VERSION=10.32.1

FROM node:${NODE_VERSION}-bookworm-slim AS builder
ARG PNPM_VERSION
ARG PUBLIC_BASE_URL=http://localhost:3000
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    PUBLIC_BASE_URL=${PUBLIC_BASE_URL} \
    CI=true \
    NX_CLOUD=false \
    NX_DAEMON=false \
    NX_NO_CLOUD=true
WORKDIR /workspace
RUN corepack enable \
    && corepack prepare pnpm@${PNPM_VERSION} --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml nx.json tsconfig.base.json ./
COPY apps/web/package.json apps/web/package.json
COPY libs/shared-types/package.json libs/shared-types/package.json
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm nx build web \
    && mkdir -p /tmp/web-dist \
    && if [ -d dist/apps/web ]; then cp -R dist/apps/web/. /tmp/web-dist/; \
    elif [ -d apps/web/dist ]; then cp -R apps/web/dist/. /tmp/web-dist/; \
    else find . -maxdepth 4 -type f -name index.html -path '*dist*' -print; exit 1; fi

FROM nginx:1.27-alpine AS runtime
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /tmp/web-dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost/healthz >/dev/null || exit 1
