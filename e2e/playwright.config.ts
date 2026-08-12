import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for the Saxonberg client E2E suite.
 *
 * The browser drives the CLIENT (Vite, :5173 in dev); the client in
 * turn talks to the SERVER (:2010). `global-setup.ts` logs in once via
 * the test-auth seam (`POST {server}/auth/test-login`) and saves the
 * session into `.auth/default.json`, so every test starts already
 * authenticated. See README.md for how to run.
 */

const CLIENT_URL = process.env.E2E_CLIENT_URL ?? 'http://localhost:5173';
const SERVER_URL = process.env.E2E_SERVER_URL ?? 'http://localhost:2010';

export default defineConfig({
  testDir: './tests',
  globalSetup: './global-setup.ts',
  // Removes the characters this run minted, plus any e2e orphans left
  // by a crashed run. See global-teardown.ts.
  globalTeardown: './global-teardown.ts',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // One local retry (CI keeps 2). A retried-then-passed test is reported
  // as "flaky", NOT "passed" — so a genuine failure still surfaces as
  // "failed" while a transient blip (e.g. a momentary hook-reentry under
  // concurrent test-login mints) doesn't read as a real regression.
  retries: process.env.CI ? 2 : 1,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: CLIENT_URL,
    // Authenticated by default (written by global-setup). Tests that
    // want a fresh visitor override with `test.use({ storageState: ... })`.
    storageState: '.auth/default.json',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // Playwright boots the stack and waits for it before running. The
  // server runs in AUTH_MODE=test so the /auth/test-login seam is
  // mounted (and Google OAuth is skipped). Locally an already-running
  // stack is reused; CI always starts fresh. The server's MONGODB_URI /
  // SESSION_SECRET come from packages/server/.env locally and from CI
  // job variables in the pipeline.
  webServer: [
    {
      // ⭐ `FOUNDER_GOOGLE_EMAIL` is the SHIPPED deploy contract for who
      // the founder is (OfficeRegistry reads it at boot), and the
      // test-auth seam mints synthetic Google profiles at
      // `<handle>@e2e.local`. Pointing it at a fixed handle therefore
      // makes one e2e session a REAL founder — holding the
      // founder-default seats, passing `requiresFoundingAuthority` for
      // the same reason a real founder's session does.
      //
      // That is how this suite gets in-world authority: no test-only
      // backend seam, no widened sandbox. A capability a test needs is a
      // capability somebody in the fiction has, reached the way they
      // reach it. See `founderSession` in tests/helpers.ts.
      command:
        'AUTH_MODE=test FOUNDER_GOOGLE_EMAIL=founder@e2e.local ' +
        'pnpm --filter @saxonberg/server dev',
      url: `${SERVER_URL}/`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: 'pnpm --filter @saxonberg/client dev',
      url: `${CLIENT_URL}/`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
