import { defineConfig, devices } from '@playwright/test';

/**
 * Drive config — the live-drive variant of `playwright.config.ts`.
 *
 * ⚠⚠ The ONE difference that matters: **no `webServer`.** The main
 * config's server entry runs `pnpm --filter @saxonberg/server dev`,
 * whose first step is `dev-preflight.mjs 2010 server` — and the
 * preflight's whole job is to KILL any Saxonberg dev process already
 * holding the port. So when Playwright decides to start its own server
 * (it does whenever the reuse probe misses), it does not politely lose
 * the race: it terminates the operator's running world mid-drive, and
 * every command after that lands on a booting server and silently
 * returns nothing. That is exactly what a first attempt at this drive
 * looked like — commands echoing with no response, no error anywhere.
 *
 * A live drive is run against a world the operator has already stood up
 * (and, here, one whose clock scale was set in `world_state` before
 * boot). Owning the process is the harness's job in CI and nobody's
 * job here.
 */

const CLIENT_URL = process.env.E2E_CLIENT_URL ?? 'http://localhost:5173';

export default defineConfig({
  testDir: './tests',
  globalSetup: './global-setup.ts',
  globalTeardown: './global-teardown.ts',
  timeout: 3_000_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: CLIENT_URL,
    storageState: '.auth/default.json',
    trace: 'off',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
