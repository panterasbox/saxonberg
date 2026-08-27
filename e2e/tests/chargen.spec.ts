import { test, expect, request } from '@playwright/test';
import type { BrowserContext, Page } from '@playwright/test';

/**
 * Char-gen end-to-end: a brand-new player (zero avatars) lands in the
 * dedicated creation stage, walks the closed-choice steps, names the
 * character, confirms, and spawns into the world.
 *
 * Fresh-session strategy
 * ----------------------
 * The default `storageState` (from `global-setup.ts`) belongs to a user
 * that HAS a character (`withCharacter: true`) — that session lands
 * in-world, which is wrong for this spec. So we mint our OWN session:
 * `beforeAll` hits the test-auth seam (`POST {server}/auth/test-login`)
 * with a per-run-unique handle and NO `withCharacter`, so the user has
 * zero avatars and the client routes to char-gen.
 *
 * Rather than override the file-level `storageState` option (which
 * Playwright resolves *before* `beforeAll` runs, so the captured session
 * isn't ready yet), we build a fresh browser context by hand from the
 * captured `storageState` object and drive our own page. The default
 * `page` fixture is bypassed.
 *
 * The handle is suffixed with a timestamp + random so each run is a
 * fresh 0-avatar user even against a persistent local Mongo — a reused
 * handle that already created a character would route to the roster, not
 * char-gen.
 */

const SERVER_URL = process.env.E2E_SERVER_URL ?? 'http://localhost:2010';
const TEST_AUTH_TOKEN = process.env.TEST_AUTH_TOKEN;

// Per-run-unique handle → guaranteed fresh, character-less user.
const HANDLE = `e2e-chargen-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

// Captured in beforeAll; shape matches Playwright's storageState.
let freshState: Awaited<
  ReturnType<Awaited<ReturnType<typeof request.newContext>>['storageState']>
>;

test.beforeAll(async () => {
  const ctx = await request.newContext({ baseURL: SERVER_URL });
  // Retry briefly: world bootstrap can still be finishing right after the
  // webServer's `/` health route comes up, so the login may 500 for a
  // moment (same reason global-setup polls). Poll up to ~30s.
  let ok = false;
  let lastErr = '';
  for (let i = 0; i < 30; i++) {
    try {
      const res = await ctx.post('/auth/test-login', {
        // No `withCharacter`: this user has zero avatars → char-gen.
        data: { handle: HANDLE },
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
      `chargen spec: POST ${SERVER_URL}/auth/test-login never succeeded ` +
        `(${lastErr}). Is the server running with AUTH_MODE=test? ` +
        `See e2e/README.md.`
    );
  }
  freshState = await ctx.storageState();
  await ctx.dispose();
});

test('a new player creates a character and spawns into the world', async ({
  browser,
}) => {
  // Build our own context from the fresh, character-less session — not
  // the default authed `page` fixture (which has a character).
  let context: BrowserContext | undefined;
  let page: Page;
  try {
    context = await browser.newContext({ storageState: freshState });
    page = await context.newPage();

    await page.goto('/');

    // The zero-avatar user lands in the dedicated creation stage, not the
    // cockpit. Generous timeout: this first assertion waits through the
    // WebSocket connect ("Connecting…"), which can run past the default
    // 5s under parallel load — same connect window `enterWorld` allows for.
    await expect(page.getByTestId('chargen-stage')).toBeVisible({
      timeout: 25_000,
    });

    // Step — species. Each step's options are driven by the server's
    // `system.charactergen.state` frame; clicking a card sends the literal
    // `enroll <field> <value>`. Auto-wait covers the first state frame
    // still being in flight. `human` is used because its Species template
    // (sapiens, sex-determination `xy`) reliably exposes the conditional
    // sex step below, so this spec exercises every step.
    await expect(page.getByTestId('chargen-option-human')).toBeVisible();

    // The species step carries the illustration detail pane: the 3:4
    // portrait slot (a framed placeholder until image assets ship) and
    // the focused option's label. Hovering a card drives the pane.
    await expect(page.getByTestId('chargen-detail-pane')).toBeVisible();
    await expect(page.getByTestId('chargen-detail-image')).toBeVisible();
    await page.getByTestId('chargen-option-human').hover();
    await expect(page.getByTestId('chargen-detail-label')).toHaveText(/human/i);
    // The dossier is derived server-side from the real Species model + its
    // resolved BodyPlan / Material / clade chain: scientific name plus the
    // Linnaean classification ladder (the showcase of the depth).
    await expect(page.getByTestId('chargen-detail-binomial')).toHaveText(
      /Homo sapiens/i,
    );
    await expect(page.getByTestId('chargen-detail-dossier')).toContainText(
      'Animalia',
    );
    await expect(page.getByTestId('chargen-detail-dossier')).toContainText(
      'Lifespan',
    );

    // Live-fire: clicking a card sends `enroll species human` immediately.
    // The pick round-trips through the server, so wait for the card to
    // register as selected (aria-pressed) before Continue — otherwise the
    // client's canAdvance gate is still false and Continue is disabled.
    await page.getByTestId('chargen-option-human').click();
    await expect(page.getByTestId('chargen-option-human')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await page.getByTestId('chargen-next').click();

    // Screen — sex & pronouns share one screen (for sexed species).
    const female = page.getByTestId('chargen-option-female');
    const she = page.getByTestId('chargen-option-she');
    await expect(she).toBeVisible();
    if (await female.isVisible()) {
      // Navigation check: Back returns to the species screen (the live
      // pick is still highlighted), and Continue returns forward.
      await page.getByTestId('chargen-back').click();
      await expect(page.getByTestId('chargen-step')).toHaveText(
        /choose your species/i,
      );
      await page.getByTestId('chargen-next').click();
      await expect(female).toBeVisible();

      await female.click();
      await expect(female).toHaveAttribute('aria-pressed', 'true');
    }
    await she.click();
    await expect(she).toHaveAttribute('aria-pressed', 'true');
    await page.getByTestId('chargen-next').click();

    // Screen — name. Separate given/surname fields, pre-filled with the
    // themed suggestion; overwrite and Continue (which flushes the name).
    const givenInput = page.getByTestId('chargen-given-input');
    await expect(givenInput).toBeVisible();
    await givenInput.fill('Testaril');
    await page.getByTestId('chargen-surname-input').fill('Ashby');
    await page.getByTestId('chargen-next').click();

    // Screen — aspiration.
    await expect(page.getByTestId('chargen-option-healer')).toBeVisible();
    await page.getByTestId('chargen-option-healer').click();
    await expect(page.getByTestId('chargen-option-healer')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await page.getByTestId('chargen-next').click();

    // Screen — review → Create the avatar and enter the world.
    await expect(page.getByTestId('chargen-confirm')).toBeVisible();
    await page.getByTestId('chargen-confirm').click();

    // Outcome: the server fires `system.connection.established`, the
    // client flips to the in-world cockpit, and its command textbox
    // appears.
    const input = page.getByRole('textbox');
    await expect(input).toBeVisible();

    // Prove the avatar actually spawned: a `look` round-trips and renders
    // the seeded spawn room — the lounge (the Avatar seed pins
    // `startLocation: /world/lounge/warren`). We assert on the room's
    // stable identity label, not its flavor prose.
    //
    // Resilient send: right after the cockpit flips in, the WebSocket
    // world session can still be settling, so the first `look` may be
    // dropped. Retry until the room renders.
    const lounge = page.getByText(/the lounge/i).first();
    await expect(async () => {
      await input.fill('look');
      await input.press('Enter');
      await expect(lounge).toBeVisible({ timeout: 2_000 });
    }).toPass({ timeout: 20_000 });
  } finally {
    await context?.close();
  }
});
