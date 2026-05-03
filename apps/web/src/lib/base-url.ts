function getDefaultApiBaseUrl(): string {
  if (typeof window === 'undefined') {
    return `http://localhost:${import.meta.env.API_GATEWAY_PORT || 3000}`;
  }

  const { protocol, hostname } = window.location;
  return `${protocol}//${hostname}:3000`;
}

export function getPublicBaseUrl(): string {
  const configured = (import.meta.env.PUBLIC_BASE_URL || '').trim().replace(/\/$/, '');
  return configured || getDefaultApiBaseUrl();
}
