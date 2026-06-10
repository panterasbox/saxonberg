import { request } from '@playwright/test';
import { mkdirSync } from 'node:fs';

/**
 * Authenticate once via the test-auth seam and persist the session so
 * every test starts logged in.
 *
 * Hits `POST {server}/auth/test-login` (only mounted when the server
 * runs with `AUTH_MODE=test`), then saves the resulting cookies — the
 * `:2010` session cookie the client sends on its credentialed calls —
 * to `.auth/default.json`, which `playwright.config.ts` loads as the
 * default `storageState`.
 */

const SERVER_URL = process.env.E2E_SERVER_URL ?? 'http://localhost:2010';
const TEST_AUTH_TOKEN = process.env.TEST_AUTH_TOKEN;

export default async function globalSetup(): Promise<void> {
  const ctx = await request.newContext({ baseURL: SERVER_URL });

  // Retry briefly: Playwright's webServer gates on the server's `/`
  // health route, but the world bootstrap (seeding) can still be
  // finishing when global-setup fires, so /auth/test-login may 500/404
  // for a moment. Poll up to ~30s.
  let res;
  let lastErr = '';
  for (let i = 0; i < 30; i++) {
    try {
      res = await ctx.post('/auth/test-login', {
        data: { handle: 'e2e-default' },
        headers: TEST_AUTH_TOKEN ? { 'x-test-auth': TEST_AUTH_TOKEN } : {},
      });
      if (res.ok()) break;
      lastErr = `status ${res.status()}`;
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e);
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  if (!res || !res.ok()) {
    throw new Error(
      `e2e global-setup: POST ${SERVER_URL}/auth/test-login never succeeded ` +
        `(${lastErr}). Is the server running with AUTH_MODE=test? ` +
        `See e2e/README.md.`
    );
  }

  mkdirSync('.auth', { recursive: true });
  await ctx.storageState({ path: '.auth/default.json' });
  await ctx.dispose();
}
