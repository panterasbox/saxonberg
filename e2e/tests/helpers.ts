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

  // Enter the world, resiliently. Clicking "Play" sends `play <id>` over
  // the WebSocket; if the socket isn't open yet the command is dropped
  // and the roster just stays up. So we retry the click until the
  // cockpit's command input actually appears (the "Play" button only
  // exists on the real picker, not the transient "Connecting…" state, so
  // a missing button between attempts is fine — the next poll re-checks).
  await expect(async () => {
    if (await input.isVisible().catch(() => false)) return;
    const play = page.getByRole('button', { name: /^Play / }).first();
    if (await play.isVisible().catch(() => false)) {
      await play.click().catch(() => {});
    }
    await expect(input).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 25_000 });
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

/**
 * Send a command and wait for `locator` to become visible, RE-SENDING if
 * it doesn't land. The first command sent right after world-entry can be
 * dropped while the WebSocket session is still settling, so a single
 * send is racy. Safe for idempotent commands (`look`, `inventory`) and
 * for commands whose effect or echo is stable under a duplicate send
 * (`say`, `smile`, a one-way `north`): once the locator is visible the
 * retry stops, so a successful first send never sends twice.
 */
export async function sendUntil(
  page: Page,
  cmd: string,
  locator: import('@playwright/test').Locator,
  timeout = 20_000
): Promise<void> {
  await expect(async () => {
    await runCommand(page, cmd);
    await expect(locator).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout });
}

/**
 * Walk an avatar into Dave's Bar, whatever lounge room it spawned in.
 *
 * The lounge is an elastic Warren in a depth-1 STAR topology: only the
 * HOST room has the `north` exit to Dave's Bar; every satellite hangs off
 * the host by a single back-exit. A fresh avatar lands in the host while
 * it's under the bud threshold, but linkdead avatars from earlier tests
 * pile up there across a suite run and push it over — so a later test's
 * avatar can bud into a satellite instead, where a bare `north` goes
 * nowhere. (That made the old "just send north" approach fail only after
 * the suite had minted a dozen-odd avatars — a false failure that had
 * nothing to do with the messaging path under test.)
 *
 * This walks the exit graph instead of assuming a fixed direction: each
 * step it reads the room's exit buttons (rendered as `go <dir>` clicks),
 * prefers `north` (host→bar), and otherwise takes the lone back-exit to
 * the host. Star depth-1 means that converges in at most two hops from
 * any spawn room.
 */
export async function walkToBar(page: Page, timeout = 30_000): Promise<void> {
  const barHeading = page.getByRole('heading', { name: /Dave's Bar/i });
  // Exit affordances are buttons titled "Click to send: go <dir>"; their
  // label text is the bare direction. Contents (e.g. "a human") are also
  // buttons but carry a different command, so the title prefix isolates
  // exits cleanly.
  const exitButtons = page.locator(
    'button[title^="Click to send: go "]'
  );
  await expect(async () => {
    if (await barHeading.isVisible().catch(() => false)) return;
    const n = await exitButtons.count();
    let chosen = n > 0 ? exitButtons.first() : null;
    for (let i = 0; i < n; i++) {
      const label = (await exitButtons.nth(i).textContent())?.trim();
      if (label === 'north') {
        chosen = exitButtons.nth(i);
        break;
      }
    }
    if (chosen) await chosen.click().catch(() => {});
    await expect(barHeading).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout });
}
