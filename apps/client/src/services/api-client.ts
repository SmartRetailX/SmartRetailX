import axios from 'axios';
import type { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

// ---------------------------------------------------------------------------
// Session-refresh state machine
// ---------------------------------------------------------------------------

/** Queue entry holding a deferred API retry. */
interface PendingEntry {
  resolve: (response: AxiosResponse) => void;
  reject: (reason: unknown) => void;
  config: InternalAxiosRequestConfig;
}

let isRefreshingSession = false;
let pendingRequestQueue: PendingEntry[] = [];

/** Registered by AuthProvider so the client can refresh the session on 401. */
let sessionRefreshCallback: (() => Promise<void>) | null = null;

/**
 * Register the session-refresh function.
 * Called once from AuthProvider on mount.
 */
export function registerSessionRefresh(callback: () => Promise<void>): void {
  sessionRefreshCallback = callback;
}

/**
 * Remove the session-refresh function.
 * Called from AuthProvider on unmount.
 */
export function clearSessionRefresh(): void {
  sessionRefreshCallback = null;
}

/** Flush the queue after a successful (or failed) session refresh. */
function flushQueue(error: unknown = null): void {
  const queue = pendingRequestQueue;
  pendingRequestQueue = [];
  queue.forEach(({ resolve, reject, config }) => {
    if (error) {
      reject(error);
    } else {
      // Re-issue the original request now that the cookie is refreshed.
      apiClient(config).then(resolve).catch(reject);
    }
  });
}

// ---------------------------------------------------------------------------
// Axios instance
// ---------------------------------------------------------------------------

/**
 * Central API client for all backend requests.
 *
 * Key design decisions:
 * - `withCredentials: true`  → sends the Better-Auth HttpOnly session cookie
 *   on every cross-origin request; this is the only auth mechanism used.
 * - No `Authorization` header / localStorage token; Better Auth is cookie-based.
 * - 401 → attempt a silent session refresh then replay the original request once.
 *   Concurrent 401s are queued and replayed together after a single refresh.
 */
export const apiClient = axios.create({
  baseURL: `${import.meta.env.PUBLIC_API_BASE_URL || 'http://localhost:3000'}/api`,
  timeout: parseInt(import.meta.env.PUBLIC_API_TIMEOUT || '30000', 10),
  // Required: instructs the browser to include the session cookie on every request.
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// ---------------------------------------------------------------------------
// Request interceptor
// ---------------------------------------------------------------------------

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // No manual token injection needed – Better Auth session cookie is included
    // automatically because `withCredentials: true` is set on the instance.
    return config;
  },
  (error: AxiosError) => Promise.reject(error),
);

// ---------------------------------------------------------------------------
// Response interceptor – 401 handling with session refresh + request replay
// ---------------------------------------------------------------------------

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,

  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // ── 401 Unauthorized ─────────────────────────────────────────────────────
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true; // prevent infinite retry loops

      // Another refresh is already in flight – queue this request to replay
      // after the refresh completes instead of triggering a second refresh.
      if (isRefreshingSession) {
        return new Promise<AxiosResponse>((resolve, reject) => {
          pendingRequestQueue.push({ resolve, reject, config: originalRequest });
        });
      }

      isRefreshingSession = true;

      try {
        if (sessionRefreshCallback) {
          await sessionRefreshCallback();
          flushQueue(); // replay all queued requests
          return apiClient(originalRequest); // replay original
        }
        // Refresh callback not yet registered (e.g. auth page) – surface error.
        throw error;
      } catch (refreshError) {
        flushQueue(refreshError); // reject queued requests
        // Notify the application that the session has fully expired so it can
        // redirect the user to the login page.
        window.dispatchEvent(new CustomEvent('auth:session-expired'));
        return Promise.reject(refreshError);
      } finally {
        isRefreshingSession = false;
      }
    }

    // ── Enrich error with readable metadata ──────────────────────────────────
    if (error.response) {
      const data = error.response.data as Record<string, unknown> | undefined;
      const statusCode = error.response.status;
      const errorMessage = (data?.message as string) ?? (data?.error as string) ?? error.message;

      if (statusCode !== 401) {
        // Only log non-401 errors; 401s are handled silently above.
        console.error(`[API ${statusCode}]`, errorMessage, error.config?.url);
      }
    } else if (error.request) {
      console.error('[API] No response from server', error.config?.url);
    }

    return Promise.reject(error);
  },
);
