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

  const res = await ctx.post('/auth/test-login', {
    data: { handle: 'e2e-default' },
    headers: TEST_AUTH_TOKEN ? { 'x-test-auth': TEST_AUTH_TOKEN } : {},
  });

  if (!res.ok()) {
    throw new Error(
      `e2e global-setup: POST ${SERVER_URL}/auth/test-login returned ` +
        `${res.status()}. Is the server running with AUTH_MODE=test? ` +
        `See e2e/README.md.`
    );
  }

  mkdirSync('.auth', { recursive: true });
  await ctx.storageState({ path: '.auth/default.json' });
  await ctx.dispose();
}
