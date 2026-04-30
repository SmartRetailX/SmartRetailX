ARG VARIANT=20-bookworm
FROM mcr.microsoft.com/devcontainers/typescript-node:1-${VARIANT}

ARG PNPM_VERSION=10.32.1
ARG ANDROID_SDK_VERSION=13114758

ENV PNPM_HOME=/pnpm \
    PNPM_STORE_PATH=/pnpm/store \
    ANDROID_HOME=/opt/android-sdk \
    ANDROID_SDK_ROOT=/opt/android-sdk \
    PATH=/pnpm:/opt/android-sdk/platform-tools:/opt/android-sdk/emulator:/opt/android-sdk/cmdline-tools/latest/bin:$PATH

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential \
        curl \
        ffmpeg \
        openjdk-17-jdk \
        libpq-dev \
        postgresql-client \
        python3 \
        python3-pip \
        python3-venv \
        unzip \
        wget \
    && rm -rf /var/lib/apt/lists/*

RUN corepack enable \
    && corepack prepare pnpm@${PNPM_VERSION} --activate \
    && pnpm config set store-dir ${PNPM_STORE_PATH}

RUN mkdir -p ${ANDROID_HOME}/cmdline-tools \
    && wget -q https://dl.google.com/android/repository/commandlinetools-linux-${ANDROID_SDK_VERSION}_latest.zip -O /tmp/cmdline-tools.zip \
    && unzip -q /tmp/cmdline-tools.zip -d ${ANDROID_HOME}/cmdline-tools \
    && mv ${ANDROID_HOME}/cmdline-tools/cmdline-tools ${ANDROID_HOME}/cmdline-tools/latest \
    && rm -f /tmp/cmdline-tools.zip \
    && yes | sdkmanager --licenses \
    && sdkmanager \
      "platform-tools" \
      "emulator" \
      "platforms;android-35" \
      "build-tools;35.0.0"

USER node
