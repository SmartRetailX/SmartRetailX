/// <reference types="@rsbuild/core/types" />

/**
 * Environment variable type definitions
 * Add your environment variables here for type safety
 * Note: Rsbuild uses the same PUBLIC_ or VITE_ prefix for client-side variables
 */
interface ImportMetaEnv {
  // Application
  readonly PUBLIC_APP_NAME: string;
  readonly PUBLIC_APP_VERSION: string;
  readonly PUBLIC_APP_ENV: 'development' | 'staging' | 'production';

  // API Configuration
  readonly PUBLIC_API_BASE_URL: string;
  readonly PUBLIC_API_TIMEOUT: string;

  // Authentication
  readonly PUBLIC_AUTH_TOKEN_KEY: string;
  readonly PUBLIC_AUTH_REFRESH_TOKEN_KEY: string;

  // Feature Flags
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
