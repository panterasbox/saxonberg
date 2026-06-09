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

export default defineConfig({
  testDir: './tests',
  globalSetup: './global-setup.ts',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
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
});
