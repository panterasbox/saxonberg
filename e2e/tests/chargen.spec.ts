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
    // cockpit.
    await expect(page.getByTestId('chargen-stage')).toBeVisible();

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

    // Select-then-submit: clicking a card selects it (no auto-advance);
    // the Continue button commits and advances.
    await page.getByTestId('chargen-option-human').click();
    await page.getByTestId('chargen-submit').click();

    // Step — sex. This step is conditional: it only appears for species
    // whose Species template declares a sex-determination system other
    // than `none`. We wait for either the sex option or the next (name)
    // step to land, then drive sex when it is presented — keeping the
    // spec robust if a species ever skips the step.
    const female = page.getByTestId('chargen-option-female');
    const nameInput = page.getByTestId('chargen-name-input');
    await expect(female.or(nameInput).first()).toBeVisible();
    if (await female.isVisible()) {
      // Navigation check: Back returns to the species step (with the
      // pick pre-selected), and Continue brings us forward again.
      await page.getByTestId('chargen-back').click();
      await expect(page.getByTestId('chargen-step')).toHaveText(
        /choose your species/i,
      );
      await page.getByTestId('chargen-submit').click();
      await expect(female).toBeVisible();

      await female.click();
      await page.getByTestId('chargen-submit').click();
    }

    // Step — name. Type a deterministic name rather than asserting the
    // random suggestion. Submitting the form sends `enroll name <name>`.
    await expect(nameInput).toBeVisible();
    await nameInput.fill('Testaril');
    await nameInput.press('Enter');

    // Step — pronouns.
    await expect(page.getByTestId('chargen-option-she')).toBeVisible();
    await page.getByTestId('chargen-option-she').click();
    await page.getByTestId('chargen-submit').click();

    // Step — aspiration.
    await expect(page.getByTestId('chargen-option-healer')).toBeVisible();
    await page.getByTestId('chargen-option-healer').click();
    await page.getByTestId('chargen-submit').click();

    // Step 6 — confirm → the avatar is created and enters the world.
    await expect(page.getByTestId('chargen-confirm')).toBeVisible();
    await page.getByTestId('chargen-confirm').click();

    // Outcome: the server fires `system.connection.established`, the
    // client flips to the in-world cockpit, and its command textbox
    // appears.
    const input = page.getByRole('textbox');
    await expect(input).toBeVisible();

    // Prove the avatar actually spawned: a `look` round-trips and renders
    // the seeded spawn room. We assert on the room's stable identity
    // label, not its flavor prose.
    await input.fill('look');
    await input.press('Enter');
    await expect(page.getByText(/Duncan Hall lobby/i).first()).toBeVisible();
  } finally {
    await context?.close();
  }
});
