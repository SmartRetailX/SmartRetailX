type CorsMatcher = (origin: string | undefined) => boolean;

const normalizeOrigin = (value: string): string | null => {
  try {
    const url = new URL(value.trim());
    return `${url.protocol}//${url.host}`.toLowerCase();
  } catch {
    return null;
  }
};

const isWildcardPattern = (value: string): boolean => {
  try {
    const url = new URL(value);
    return url.hostname.startsWith('*.');
  } catch {
    return false;
  }
};

const matchWildcardOrigin = (requestOrigin: string, wildcardOrigin: string): boolean => {
  try {
    const requestUrl = new URL(requestOrigin);
    const wildcardUrl = new URL(wildcardOrigin);

    if (requestUrl.protocol !== wildcardUrl.protocol) {
      return false;
    }

    const wildcardHost = wildcardUrl.hostname.toLowerCase();
    const suffix = wildcardHost.slice(1); // ".example.com"
    const requestHost = requestUrl.hostname.toLowerCase();

    return requestHost.endsWith(suffix);
  } catch {
    return false;
  }
};

export const parseCorsOrigins = (rawCorsOrigins: string): string[] => {
  return rawCorsOrigins
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
};

export const createCorsMatcher = (allowedOrigins: string[]): CorsMatcher => {
  const hasGlobalWildcard = allowedOrigins.includes('*');

  const exactOrigins = new Set(
    allowedOrigins
      .filter((origin) => origin !== '*' && !isWildcardPattern(origin))
      .map((origin) => normalizeOrigin(origin) ?? origin.toLowerCase()),
  );

  const wildcardOrigins = allowedOrigins.filter((origin) => isWildcardPattern(origin));

  return (origin: string | undefined): boolean => {
    if (!origin) {
      // No Origin header: server-to-server, curl, Postman, mobile webviews, etc.
      return true;
    }

    if (hasGlobalWildcard) {
      return true;
    }

    const normalizedOrigin = normalizeOrigin(origin);
    if (!normalizedOrigin) {
      return false;
    }

    if (exactOrigins.has(normalizedOrigin) || exactOrigins.has(origin.toLowerCase())) {
      return true;
    }

    return wildcardOrigins.some((wildcardOrigin) =>
      matchWildcardOrigin(normalizedOrigin, wildcardOrigin),
    );
  };
};

