/**
 * Client-side endpoint resolution.
 *
 * In development the client (Vite on :5173) and the server (:2010) are
 * separate origins, so we point at the dev server explicitly. In a
 * production build the server serves the client from its own origin, so
 * the endpoints are derived from `window.location` and no build-time URL
 * is baked in. Either can be overridden at build time with
 * `VITE_SERVER_URL` / `VITE_WS_URL`.
 */

const DEV_SERVER_URL = 'http://localhost:2010';

function resolveServerUrl(): string {
  const override = import.meta.env.VITE_SERVER_URL;
  if (override) return override;
  if (import.meta.env.DEV) return DEV_SERVER_URL;
  return window.location.origin;
}

function resolveWsUrl(): string {
  const override = import.meta.env.VITE_WS_URL;
  if (override) return override;
  if (import.meta.env.DEV) return DEV_SERVER_URL.replace(/^http/, 'ws');
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://${window.location.host}`;
}

/** HTTP origin for auth links and REST calls (no trailing slash). */
export const SERVER_URL = resolveServerUrl();

/** WebSocket origin for the game connection. */
export const WS_URL = resolveWsUrl();
