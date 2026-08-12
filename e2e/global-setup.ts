import { request } from '@playwright/test';
import { mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { recordMintedHandle } from './tests/helpers';

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

/**
 * The shared default session's handle.
 *
 * ⚠ Minted HERE with a direct POST rather than through
 * `mintSession`, so it does not record itself — which is exactly how it
 * survived the first teardown while all four spec-minted characters
 * were removed. It is recorded explicitly below; setup re-mints it
 * every run, so removing it at teardown is correct.
 */
const DEFAULT_HANDLE = 'e2e-default';

export default async function globalSetup(): Promise<void> {
  // Start this run's minted-handle log clean. A leftover list from a
  // crashed run would make teardown ask for handles already gone — the
  // stale sweep is what actually collects those.
  try {
    rmSync(
      resolve(new URL('.', import.meta.url).pathname, '.auth/minted-handles.log'),
      { force: true },
    );
  } catch {
    /* best effort */
  }

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
        // `withCharacter` provisions a ready-to-play avatar so the
        // default session lands in-world (the cockpit), not char-gen.
        // The char-gen spec logs in separately with a fresh handle and
        // no character, so it gets the 0-avatar → intake path.
        data: { handle: DEFAULT_HANDLE, withCharacter: true },
        headers: TEST_AUTH_TOKEN ? { 'x-test-auth': TEST_AUTH_TOKEN } : {},
      });
      if (res.ok()) {
        recordMintedHandle(DEFAULT_HANDLE);
        break;
      }
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
