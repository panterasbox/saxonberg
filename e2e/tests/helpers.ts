import { request, expect } from '@playwright/test';
import type { Browser, BrowserContext, Page } from '@playwright/test';
import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

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

/**
 * Where this run's minted handles are recorded, for `global-teardown`
 * to purge. Gitignored (`.auth/`), truncated by `global-setup`.
 */
export const MINTED_HANDLES_LOG = resolve(
  new URL('..', import.meta.url).pathname,
  '.auth/minted-handles.log',
);

/**
 * Record a minted handle so teardown can remove the character.
 *
 * ⚠ **Records only `e2e-` handles.** `openWorldAsFounder` mints the
 * literal handle `founder`, which is a REAL founder by way of
 * `FOUNDER_GOOGLE_EMAIL` — deleting it would break every
 * authority-dependent spec. The purge script refuses it independently;
 * this keeps it out of the log in the first place.
 *
 * ⚠ Appends one line per handle so parallel workers cannot interleave a
 * partial write, and never throws — a harness bookkeeping failure must
 * not fail a test.
 */
export function recordMintedHandle(handle: string): void {
  if (!handle.startsWith('e2e-')) return;
  try {
    mkdirSync(dirname(MINTED_HANDLES_LOG), { recursive: true });
    appendFileSync(MINTED_HANDLES_LOG, `${handle}\n`, 'utf8');
  } catch {
    // Cleanup is best-effort; the stale sweep catches what this misses.
  }
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
  opts: {
    handle?: string;
    withCharacter?: boolean;
    /** Optional spawn-room override (a template path, e.g. a stable
     * singleton room) so co-location tests bypass the elastic lounge
     * Warren. Only meaningful with `withCharacter`. */
    startLocation?: string;
    /** Confer wizard (code-trust) on the provisioned character — the
     * `clone`/`eval`/`goto` axis. Test-auth only; the server adds the
     * character to the managed `wizards` group. */
    wizard?: boolean;
  } = {}
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
          ...(opts.startLocation
            ? { startLocation: opts.startLocation }
            : {}),
          ...(opts.wizard ? { wizard: true } : {}),
        },
        headers: TEST_AUTH_TOKEN ? { 'x-test-auth': TEST_AUTH_TOKEN } : {},
      });
      if (res.ok()) {
        const state = await ctx.storageState();
        await ctx.dispose();
        recordMintedHandle(handle);
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
  state: SessionState,
  /**
   * Extra `newContext` options — in practice a `viewport` (and
   * `hasTouch` / `deviceScaleFactor`) for the phone-chrome specs.
   *
   * ⚠ The viewport has to be set on the CONTEXT, not by resizing after
   * `goto`: the chrome picks its composition from a `matchMedia`
   * subscription at mount, and a page that loaded wide and was resized
   * narrow exercises the resize path rather than the load path. Both
   * are worth driving; a helper that could only do the second would
   * hide a first-paint bug.
   */
  contextOptions: Parameters<Browser['newContext']>[0] = {},
  /**
   * Runs against the fresh context BEFORE its first page is created —
   * the only window in which `addInitScript` can reach the app's own
   * module scope.
   *
   * ⚠ Used by the dropped-link spec to keep a handle on the sockets the
   * page opens. `websocketClient` is module-private and CDP's offline
   * emulation does **not** close an already-open WebSocket (measured:
   * `connection.link` stays `connected` indefinitely), so instrumenting
   * the transport from outside is the only way to drive a real drop
   * without a test-only seam in the product.
   */
  onContext?: (context: BrowserContext) => Promise<void>
): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({
    ...contextOptions,
    storageState: state,
  });
  if (onContext) await onContext(context);
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
 * Re-enter the world on an EXISTING page — after a `page.reload()`.
 *
 * A reload drops the client back to whatever the server says the
 * session is, which for a with-character account is the roster: the
 * WebSocket is new and nothing has sent `play <id>` yet. So a spec that
 * reloads to prove something is server-authoritative has to walk the
 * same resilient path `enterWorld` walks, and this is that path with
 * the context-building half removed.
 */
export async function reenterWorld(page: Page): Promise<void> {
  const roster = page.getByTestId('roster-screen');
  const input = commandInput(page);
  await expect(roster.or(input).first()).toBeVisible({ timeout: 25_000 });
  await expect(async () => {
    if (await input.isVisible().catch(() => false)) return;
    const play = page.getByRole('button', { name: /^Play / }).first();
    if (await play.isVisible().catch(() => false)) {
      await play.click().catch(() => {});
    }
    await expect(input).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 25_000 });
}

/**
 * Convenience: mint a fresh with-character avatar and enter the world in
 * one call. Returns the page plus a `close()` that tears the context
 * down (call it in a `finally`).
 *
 * `opts.startLocation` pins the spawn room (a template path) — e.g. a
 * stable singleton room — so a test that needs a known starting point
 * sidesteps the elastic lounge Warren.
 */
export async function openWorldAs(
  browser: Browser,
  prefix = 'world',
  opts: {
    startLocation?: string;
    wizard?: boolean;
    /** Reuse a handle already minted by `mintSession` (the seat-then-enter
     *  flow: a character must EXIST before the founder can seat it). */
    handle?: string;
    /** Browser-context options — a phone `viewport` for the mobile
     *  chrome specs. See `enterWorld`. */
    contextOptions?: Parameters<Browser['newContext']>[0];
    /** Runs against the context before its first page. See `enterWorld`. */
    onContext?: (context: BrowserContext) => Promise<void>;
  } = {}
): Promise<{
  page: Page;
  context: BrowserContext;
  handle: string;
  state: SessionState;
  close: () => Promise<void>;
}> {
  const { state, handle } = await mintSession({
    handle: opts.handle ?? uniqueHandle(prefix),
    withCharacter: true,
    startLocation: opts.startLocation,
    wizard: opts.wizard,
  });
  const { context, page } = await enterWorld(
    browser,
    state,
    opts.contextOptions ?? {},
    opts.onContext
  );
  return { page, context, handle, state, close: () => context.close() };
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
 * Open a world session as **the founder** — the fixed handle
 * `playwright.config.ts` names in `FOUNDER_GOOGLE_EMAIL`.
 *
 * This is how the suite obtains in-world authority, and the shape is the
 * whole point: nothing here is test-only. `FOUNDER_GOOGLE_EMAIL` is the
 * shipped deploy contract, `OfficeRegistry` reads it at boot exactly as
 * it does in production, and the resulting session passes
 * `requiresFoundingAuthority` because it genuinely is the founder — not
 * because anything learned it was a test.
 *
 * ⚠ **INTERIM — this should be based on the OFFICE, not the founder.**
 * Founding authority is deliberately narrow (draft constitution Art. XI):
 * the one power above the office system is the power to seat and unseat
 * officeholders. Leaning on it for *every* capability a spec needs is
 * the opposite of that — the founder holds every seat by default, so a
 * founder session is an all-offices session, and a spec that wanted the
 * Governorship quietly gets the Prime Ministership too.
 *
 * The right shape is: the founder seats an ordinary character in the one
 * office the spec needs, and that character acts. It is blocked on the
 * `office assign` defect below, not on a decision.
 */
export async function openWorldAsFounder(
  browser: Browser,
  opts: { startLocation?: string } = {}
) {
  const { state } = await mintSession({
    handle: 'founder',
    withCharacter: true,
    startLocation: opts.startLocation,
  });
  const { context, page } = await enterWorld(browser, state);
  return { page, context, close: () => context.close() };
}

/*
 * ⚠ There is deliberately NO `seatAsGovernor` helper — and its absence
 * is why the founder is doing jobs that belong to officeholders.
 *
 * The obvious shape — the founder seats an ordinary character with
 * `office assign <them> central-bank-governor`, and that character does
 * the minting — does not work, and the reason looks like a real defect
 * rather than a harness quirk: the subcommand's `target` arg is
 * `scope: "online"`, and it resolves NO second session. Two live
 * sessions, both entered, `office assign <handle> …` from the founder →
 * **"No such player."** Reproduced with a randomised handle and with a
 * plain one (`grover`), so it is not name tokenisation.
 *
 * If that is what it looks like, governance's only handoff verb cannot
 * seat anybody, and every office in the game is stuck on its founder
 * default. Worth its own look; routed around here rather than papered
 * over, because a helper that hid it would hide it from the next reader
 * too.
 */
