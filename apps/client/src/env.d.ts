/// <reference types="@rsbuild/core/types" />

/**
 * Environment variable type definitions
 * All client-side env vars must be prefixed with PUBLIC_ (Rsbuild convention).
 * Add new variables here and to .env.example.
 *
 * Authentication note:
 *   Better Auth uses HttpOnly session cookies – there are NO client-side auth
 *   tokens/keys stored in env variables or localStorage.
 */
interface ImportMetaEnv {
  // Application metadata
  readonly PUBLIC_APP_NAME: string;
  readonly PUBLIC_APP_VERSION: string;
  readonly PUBLIC_APP_ENV: 'development' | 'staging' | 'production';

  // API
  // The scheme + host of the API gateway, e.g. "http://localhost:3000".
  // – axios apiClient  → <PUBLIC_API_BASE_URL>/api
  // – authClient       → <PUBLIC_API_BASE_URL>/api/auth
  readonly PUBLIC_API_BASE_URL: string;
  readonly PUBLIC_API_TIMEOUT: string; // milliseconds as string

  // Feature flags
  readonly PUBLIC_ENABLE_DEVTOOLS: string;
  readonly PUBLIC_ENABLE_ANALYTICS: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/**
 * Imports the SVG file as a React component.
 * @requires [@rsbuild/plugin-svgr](https://npmjs.com/package/@rsbuild/plugin-svgr)
 */
declare module '*.svg?react' {
  import type React from 'react';
  const ReactComponent: React.FunctionComponent<React.SVGProps<SVGSVGElement>>;
  export default ReactComponent;
}
