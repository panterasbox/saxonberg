import { request, expect } from '@playwright/test';
import type { Browser, BrowserContext, Page } from '@playwright/test';

/**
 * Shared E2E helpers.
 *
 * The governing rule here is **per-test isolation**: every test mints
 * its OWN avatar via the test-auth seam and drives a hand-built browser
 * context from it. Sharing one avatar across tests races on the server's
 * linkdead grace — a just-closed session lingers, so the next browser to
 * play that same avatar gets displaced back to the roster. A fresh
 * avatar per test sidesteps that entirely and lets specs run in
 * parallel. (This is the pattern `chargen.spec.ts` already uses; these
 * helpers generalize it so every spec can lean on it.)
 *
 * URLs come from `E2E_SERVER_URL` / `E2E_CLIENT_URL` (the client `goto`
 * uses Playwright's configured `baseURL`, which is `E2E_CLIENT_URL`).
 */

const SERVER_URL = process.env.E2E_SERVER_URL ?? 'http://localhost:2010';
const TEST_AUTH_TOKEN = process.env.TEST_AUTH_TOKEN;

/** Per-run-unique handle so each login is a guaranteed-fresh user even
 * against a persistent local Mongo. */
export function uniqueHandle(prefix: string): string {
  return `e2e-${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

/** The shape Playwright's `storageState()` returns. */
export type SessionState = Awaited<
  ReturnType<Awaited<ReturnType<typeof request.newContext>>['storageState']>
>;

/**
 * Log in once via the test-auth seam and capture the session cookie.
 *
 * `withCharacter: true` provisions a ready-to-play avatar (lands on the
 * roster → world); omit it for the zero-avatar → char-gen path. Retries
 * briefly because the world bootstrap can still be seeding right after
 * the server's `/` health route comes up (a fresh login may 500 for a
 * moment).
 */
export async function mintSession(
  opts: { handle?: string; withCharacter?: boolean } = {}
): Promise<{ state: SessionState; handle: string }> {
  const handle = opts.handle ?? uniqueHandle('user');
  const ctx = await request.newContext({ baseURL: SERVER_URL });
  let lastErr = '';
  for (let i = 0; i < 30; i++) {
    try {
      const res = await ctx.post('/auth/test-login', {
        data: {
          handle,
          ...(opts.withCharacter ? { withCharacter: true } : {}),
        },
        headers: TEST_AUTH_TOKEN ? { 'x-test-auth': TEST_AUTH_TOKEN } : {},
      });
      if (res.ok()) {
        const state = await ctx.storageState();
        await ctx.dispose();
        return { state, handle };
      }
      lastErr = `status ${res.status()}`;
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e);
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  await ctx.dispose();
  throw new Error(
    `mintSession: POST ${SERVER_URL}/auth/test-login never succeeded ` +
      `(${lastErr}). Is the server running with AUTH_MODE=test? ` +
      `See e2e/README.md.`
  );
}

/** The base command input (placeholder `Enter command...`). More precise
 * than `getByRole('textbox')`, which also matches the compose textarea
 * and prompt-mode inputs. */
export function commandInput(page: Page) {
  return page.getByPlaceholder('Enter command...');
}

/**
 * Build a fresh browser context from a captured session and enter the
 * world: load the client, click the lone roster "Play" card if the
 * roster is showing (a user with a character lands there since char-gen
 * shipped), and wait for the cockpit's command input.
 */
export async function enterWorld(
  browser: Browser,
  state: SessionState
): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({ storageState: state });
  const page = await context.newPage();
  await page.goto('/');
  const roster = page.getByTestId('roster-screen');
  const input = commandInput(page);
  await expect(roster.or(input).first()).toBeVisible();
  if (await roster.isVisible()) {
    await page.getByRole('button', { name: /^Play / }).first().click();
  }
  await expect(input).toBeVisible();
  return { context, page };
}

/**
 * Convenience: mint a fresh with-character avatar and enter the world in
 * one call. Returns the page plus a `close()` that tears the context
 * down (call it in a `finally`).
 */
export async function openWorldAs(
  browser: Browser,
  prefix = 'world'
): Promise<{ page: Page; context: BrowserContext; close: () => Promise<void> }> {
  const { state } = await mintSession({
    handle: uniqueHandle(prefix),
    withCharacter: true,
  });
  const { context, page } = await enterWorld(browser, state);
  return { page, context, close: () => context.close() };
}

/** Type a command into the base input and submit it. */
export async function runCommand(page: Page, cmd: string): Promise<void> {
  const input = commandInput(page);
  await expect(input).toBeVisible();
  await input.fill(cmd);
  await input.press('Enter');
}
