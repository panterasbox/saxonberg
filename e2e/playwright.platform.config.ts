import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for the **platform-only** boot — content packs wave
 * 3's "pack zero" criterion: the platform pack alone is a bootable world.
 *
 * A second config rather than a project inside `playwright.config.ts`,
 * because the `webServer` differs: the server boots with
 * `SAXONBERG_PACKS=platform` (every other pack ignored — not installed,
 * not booted), on its own ports (2011 / 5174) so it never collides with
 * a running full-stack dev server, and its stdout is captured to a log
 * the spec reads for `error` / `failed` lines.
 *
 * The database is whatever the environment names (`MONGODB_DATABASE`
 * from `packages/server/.env` locally, the CI job variable in the
 * pipeline) — deliberately NOT a database of its own (see
 * docs/deployment.md § The Mongo environment policy). CI runs this
 * config FIRST, against the fresh `saxonberg_e2e`, then the main suite.
 * Locally, drop the worktree's database before running it if the
 * landing-room assertion matters: an earlier full-pack boot leaves the
 * lounge's `defaultStartLocation` setting behind, and the founder lands
 * there instead of the void.
 *
 * Run: `pnpm test:e2e:platform` (root) / `pnpm test:platform` (here).
 */

const CLIENT_URL = process.env.E2E_CLIENT_URL ?? 'http://localhost:5174';
const SERVER_URL = process.env.E2E_SERVER_URL ?? 'http://localhost:2011';
// global-setup / teardown / helpers read these at import time.
process.env.E2E_CLIENT_URL = CLIENT_URL;
process.env.E2E_SERVER_URL = SERVER_URL;

/**
 * The founder handle for THIS config — not the main suite's `founder`.
 * Its own handle because a character minted under the full-pack world
 * (a species, a sex) cannot be restored into a world whose species pack
 * is absent, and on a shared local database the main suite's founder
 * is exactly that character. An `e2e-` handle is purged by teardown, so
 * every run mints it fresh under the platform alone.
 */
export const PLATFORM_FOUNDER_HANDLE = 'e2e-platform-founder';

/**
 * Where the server's stdout+stderr land; the spec greps it. ⚠ Written
 * only when THIS run boots the server — a reused local stack leaves the
 * previous run's log in place (CI never reuses).
 */
export const PLATFORM_SERVER_LOG = '.auth/platform-server.log';

export default defineConfig({
  testDir: './tests-platform',
  globalSetup: './global-setup.ts',
  globalTeardown: './global-teardown.ts',
  timeout: 60_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: CLIENT_URL,
    storageState: '.auth/default.json',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      // The server package's `dev` script preflights port 2010 — it
      // would kill a real dev server — so this claims 2011 directly:
      // same preflight, its own port, no watch (nothing edits under a
      // test run). The pipe into `tee` is the log capture.
      command:
        'mkdir -p .auth && cd ../packages/server && ' +
        'node scripts/dev-preflight.mjs 2011 server && ' +
        'SAXONBERG_PACKS=platform AUTH_MODE=test ' +
        `FOUNDER_GOOGLE_EMAIL=${PLATFORM_FOUNDER_HANDLE}@e2e.local PORT=2011 ` +
        `CLIENT_URL=${CLIENT_URL} ` +
        `pnpm exec tsx src/preload.js 2>&1 | tee ../../e2e/${PLATFORM_SERVER_LOG}`,
      url: `${SERVER_URL}/`,
      reuseExistingServer: !process.env.CI,
      timeout: 240_000,
    },
    {
      command:
        'cd ../packages/client && ' +
        'node ../server/scripts/dev-preflight.mjs 5174 client && ' +
        `VITE_SERVER_URL=${SERVER_URL} VITE_WS_URL=${SERVER_URL.replace(/^http/, 'ws')} ` +
        'pnpm exec vite --port 5174 --strictPort',
      url: `${CLIENT_URL}/`,
      reuseExistingServer: !process.env.CI,
      timeout: 240_000,
    },
  ],
});
