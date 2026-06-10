import { test, expect, request } from '@playwright/test';
import type { Browser, BrowserContext, Page } from '@playwright/test';

/**
 * Smoke tests — prove the harness works end to end: the test-auth seam
 * (global-setup), the stack boot, and the client rendering. Selectors
 * are intentionally loose; tighten them as the cockpit UI stabilizes.
 *
 * Self-contained session
 * ----------------------
 * These tests establish their OWN session in `beforeAll` (a fresh
 * `withCharacter` user via the test-auth seam) and drive a hand-built
 * browser context from it, rather than leaning on the shared
 * `.auth/default.json` written by global-setup. The shared session lives
 * in the server's in-memory store, and sibling specs that exercise the
 * world (char-gen) can invalidate it mid-run; minting a per-file session
 * keeps these tests isolated and order-independent. (The chargen spec
 * uses the same pattern.)
 *
 * The two tests share that one avatar (one session, one character), so
 * they run serially: two browsers playing the same avatar concurrently
 * collide — the second connection displaces the first.
 */

test.describe.configure({ mode: 'serial' });

const SERVER_URL = process.env.E2E_SERVER_URL ?? 'http://localhost:2010';
const TEST_AUTH_TOKEN = process.env.TEST_AUTH_TOKEN;

const HANDLE = `e2e-smoke-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

let withCharState: Awaited<
  ReturnType<Awaited<ReturnType<typeof request.newContext>>['storageState']>
>;

test.beforeAll(async () => {
  const ctx = await request.newContext({ baseURL: SERVER_URL });
  // Retry briefly: world bootstrap can still be finishing right after the
  // webServer's `/` health route comes up, so a `withCharacter` login may
  // 500 for a moment (same reason global-setup polls). Poll up to ~30s.
  let ok = false;
  let lastErr = '';
  for (let i = 0; i < 30; i++) {
    try {
      const res = await ctx.post('/auth/test-login', {
        // `withCharacter` provisions a ready-to-play avatar so this
        // session has a character (lands on the roster, then the world).
        data: { handle: HANDLE, withCharacter: true },
        headers: TEST_AUTH_TOKEN ? { 'x-test-auth': TEST_AUTH_TOKEN } : {},
      });
      if (res.ok()) {
        ok = true;
        break;
      }
      lastErr = `status ${res.status()}`;
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e);
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  if (!ok) {
    throw new Error(
      `smoke spec: POST ${SERVER_URL}/auth/test-login never succeeded ` +
        `(${lastErr}). Is the server running with AUTH_MODE=test? ` +
        `See e2e/README.md.`
    );
  }
  withCharState = await ctx.storageState();
  await ctx.dispose();
});

/**
 * Open a fresh page on our own (with-character) session and enter the
 * world.
 *
 * Since char-gen shipped, a user with a character lands on the
 * **roster** rather than auto-entering the world — they pick a character
 * to play. So we click the lone "Play" card to reach the cockpit. We
 * only click Play when the roster is actually present, so the check
 * still holds if a future change sends single-character users straight
 * to the cockpit.
 */
async function openInWorld(
  browser: Browser
): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({ storageState: withCharState });
  const page = await context.newPage();
  await page.goto('/');
  const roster = page.getByTestId('roster-screen');
  const cockpitInput = page.getByRole('textbox');
  await expect(roster.or(cockpitInput).first()).toBeVisible();
  if (await roster.isVisible()) {
    await page.getByRole('button', { name: /^Play / }).first().click();
  }
  return { context, page };
}

test('an authenticated visitor lands in the cockpit', async ({ browser }) => {
  let context: BrowserContext | undefined;
  try {
    const opened = await openInWorld(browser);
    context = opened.context;
    const { page } = opened;

    // The cockpit exposes a command input; the login screen does not.
    await expect(page.getByRole('textbox')).toBeVisible();
    await expect(page.getByText('Login with Google')).toHaveCount(0);
  } finally {
    await context?.close();
  }
});

/**
 * Full command round-trip: client → command bus → WebSocket → server →
 * rendered frame. The deterministic world comes from the seed system —
 * a fresh test avatar spawns in the seeded Duncan Hall lobby (the Avatar
 * seed pins `container: /domain/eternal/duncan-hall/lobby`), so `look`
 * presents that room. We assert on the room's stable identity label
 * rather than its flavor prose, which churns as the campus is built.
 */
test('a `look` command round-trips and renders the spawn room', async ({
  browser,
}) => {
  let context: BrowserContext | undefined;
  try {
    const opened = await openInWorld(browser);
    context = opened.context;
    const { page } = opened;

    const input = page.getByRole('textbox');
    await expect(input).toBeVisible();

    await input.fill('look');
    await input.press('Enter');

    // The look response renders into the terminal scrollback. Playwright
    // auto-waits for the WebSocket round-trip to land the text.
    await expect(page.getByText(/Duncan Hall lobby/i).first()).toBeVisible();
  } finally {
    await context?.close();
  }
});
