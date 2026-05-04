ARG VARIANT=20-bookworm
FROM mcr.microsoft.com/devcontainers/typescript-node:1-${VARIANT}

ARG PNPM_VERSION=10.32.1

ENV PNPM_HOME=/pnpm \
    PNPM_STORE_PATH=/pnpm/store \
    PATH=/pnpm:$PATH

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    ffmpeg \
    libpq-dev \
    python3 \
    python3-pip \
    python3-venv \
    && rm -rf /var/lib/apt/lists/*

RUN corepack enable \
    && corepack prepare pnpm@${PNPM_VERSION} --activate \
    && pnpm config set store-dir ${PNPM_STORE_PATH}

USER node
