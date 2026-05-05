type RuntimeConfig = {
  PUBLIC_BASE_URL?: string;
  PUBLIC_WEBSOCKET_URL?: string;
};

type BundledEnv = {
  PUBLIC_BASE_URL?: string;
  PUBLIC_WEBSOCKET_URL?: string;
  API_GATEWAY_PORT?: string | number;
  WEBSOCKET_SERVICE_PORT?: string | number;
};

function normalizeUrl(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().replace(/\/$/, '');
}

function getBundledEnv(): BundledEnv {
  return ((import.meta as ImportMeta & { env?: BundledEnv }).env ?? {}) as BundledEnv;
}

function getRuntimeConfig(): RuntimeConfig {
  if (typeof window === 'undefined') {
    return {};
  }

  const runtime = (window as Window & { __SMART_RETAILX_CONFIG__?: RuntimeConfig })
    .__SMART_RETAILX_CONFIG__;
  return runtime ?? {};
}

function getDefaultApiBaseUrl(): string {
  const env = getBundledEnv();

  if (typeof window === 'undefined') {
    return `http://localhost:${env.API_GATEWAY_PORT || 3000}`;
  }

  return window.location.origin;
}

export function getPublicBaseUrl(): string {
  const runtimeConfigured = normalizeUrl(getRuntimeConfig().PUBLIC_BASE_URL);
  const configured = normalizeUrl(getBundledEnv().PUBLIC_BASE_URL);
  return runtimeConfigured || configured || getDefaultApiBaseUrl();
}

export function getPublicWebsocketUrl(): string {
  const runtimeConfigured = normalizeUrl(getRuntimeConfig().PUBLIC_WEBSOCKET_URL);
  const configured = normalizeUrl(getBundledEnv().PUBLIC_WEBSOCKET_URL);
  return runtimeConfigured || configured;
}

export function getDefaultWebsocketBaseUrl(): string {
  const env = getBundledEnv();
  const wsPort = env.WEBSOCKET_SERVICE_PORT || 3004;

  if (typeof window === 'undefined') {
    return `http://localhost:${wsPort}`;
  }

  return window.location.origin;
}
