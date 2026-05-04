type RuntimeConfig = {
  PUBLIC_BASE_URL?: string;
  PUBLIC_WEBSOCKET_URL?: string;
};

function normalizeUrl(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().replace(/\/$/, '');
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
  if (typeof window === 'undefined') {
    return `http://localhost:${import.meta.env.API_GATEWAY_PORT || 3000}`;
  }

  return window.location.origin;
}

export function getPublicBaseUrl(): string {
  const runtimeConfigured = normalizeUrl(getRuntimeConfig().PUBLIC_BASE_URL);
  const configured = normalizeUrl(import.meta.env.PUBLIC_BASE_URL);
  return runtimeConfigured || configured || getDefaultApiBaseUrl();
}

export function getPublicWebsocketUrl(): string {
  const runtimeConfigured = normalizeUrl(getRuntimeConfig().PUBLIC_WEBSOCKET_URL);
  const configured = normalizeUrl(import.meta.env.PUBLIC_WEBSOCKET_URL);
  return runtimeConfigured || configured;
}

export function getDefaultWebsocketBaseUrl(): string {
  const env = import.meta.env ?? {};
  const wsPort = env.WEBSOCKET_SERVICE_PORT || 3004;

  if (typeof window === 'undefined') {
    return `http://localhost:${wsPort}`;
  }

  const { protocol, hostname } = window.location;
  return `${protocol}//${hostname}:${wsPort}`;
}
