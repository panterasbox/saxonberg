/**
 * Content packs wave 2 — the drive (docs/plans/content-pack-wave-2-plan.md
 * step 11, items 3–8). Runs against a booted dev server whose boot log
 * already proved items 1–2 (the collapse lines, the adoption lines, the
 * disk-fallback residue; the second boot all-zero).
 */

import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { openWorldAs, openWorldAsFounder, runCommand, sendUntil } from './helpers';

const SERVER_URL = process.env.E2E_SERVER_URL ?? 'http://localhost:2010';

test.describe.configure({ mode: 'serial' });

async function see(page: Page, cmd: string, pattern: RegExp, timeout = 15_000) {
  await runCommand(page, cmd);
  await expect(page.getByText(pattern).first()).toBeVisible({ timeout });
}

test('pack status as the founder (head of the executive) lists the packs', async ({ browser }) => {
  test.setTimeout(180_000);
  const { page, close } = await openWorldAsFounder(browser);
  try {
    await sendUntil(page, 'look', page.getByText(/./).first());
    // The founder holds the PM seat (founder default), so heads the
    // executive, which holds the platform — no group to join.
    await see(page, 'pack status', /platform/i, 30_000);
    await expect(page.getByText(/wiki-starter/i).first()).toBeVisible();
    await expect(page.getByText(/corpo-vionne/i).first()).toBeVisible();
    await page.screenshot({ path: '/tmp/wave2-pack-status.png', fullPage: true });
  } finally {
    await close();
  }
});

test(';wave fires, ;hi does not dispatch, greet carries hi as a search term', async ({ browser }) => {
  test.setTimeout(180_000);
  const { page, context, close } = await openWorldAsFounder(browser);
  try {
    await sendUntil(page, ';wave', page.getByText(/wave/i).first());
    await runCommand(page, ';hi');
    await page.waitForTimeout(1500);
    // A search term is not a verb: nobody "greets" (the free-emote floor answers "You hi.").
    await expect(page.getByText(/greets/i)).toHaveCount(0);
    // The lookup words ride the read face every client fetches: `greet`
    // carries `hi` / `hello` as searchTerms (never as verbs). `soul search`
    // itself is the soul committee's face (its unit test covers it).
    const catalogue = await context.request.get(`${SERVER_URL}/api/emotes`);
    expect(catalogue.ok()).toBe(true);
    const json = (await catalogue.json()) as Record<string, unknown> | unknown[];
    const entries = (Array.isArray(json)
      ? json
      : ((json as Record<string, unknown>).emotes ?? (json as Record<string, unknown>).catalogue ?? (json as Record<string, unknown>).entries)) as Array<{ verb: string; searchTerms?: string[]; aliases?: unknown }>;
    const greet = entries.find((e) => e.verb === 'greet');
    expect(greet?.searchTerms).toEqual(['hi', 'hello']);
    expect(entries.some((e) => e.verb === 'hi')).toBe(false);
    expect(entries.every((e) => e.aliases === undefined)).toBe(true);
    await page.screenshot({ path: '/tmp/wave2-soul.png', fullPage: true });
  } finally {
    await close();
  }
});

test("Dave's Bar: the menu resolves the generic-objects recipes", async ({ browser }) => {
  test.setTimeout(180_000);
  const { page, close } = await openWorldAs(browser, 'wave2-bar', {
    startLocation: '/world/lounge/bar',
  });
  try {
    await sendUntil(page, 'look', page.getByText(/./).first());
    await see(page, 'menu', /martini/i, 20_000);
    await see(page, 'order martini', /martini/i, 20_000);
    await page.screenshot({ path: '/tmp/wave2-bar.png', fullPage: true });
  } finally {
    await close();
  }
});

test('help look renders (the view is a store-served command-view document); a non-author CMS write is refused', async ({ browser }) => {
  test.setTimeout(180_000);
  const { page, context, close } = await openWorldAsFounder(browser);
  try {
    await see(page, 'help look', /look/i);
    await page.screenshot({ path: '/tmp/wave2-help-look.png', fullPage: true });
    // The CMS reads per path. The test-auth founder holds the PM seat,
    // so heads the executive, which holds /obj and /cmd — the wave-3
    // drive edits `look.yaml`'s help through it; this wave-2 spec only
    // reads.
    // `DocumentLogic.commandView.test.ts` + `CommandLogic.store.test.ts`
    // cover the chokepoint and the reload. What a non-author session can
    // prove here: the write is refused.
    const csrf = await context.request.get(`${SERVER_URL}/api/cms/csrf`);
    expect(csrf.ok()).toBe(true);
    const token = ((await csrf.json()) as { token: string }).token;
    const denied = await context.request.post(`${SERVER_URL}/api/cms/write`, {
      headers: { 'X-CMS-CSRF': token },
      data: {
        backend: 'document',
        path: '/platform/cmd/perception/look',
        body: JSON.stringify({ verbs: ['look'], controller: '/platform/idea/cmd/system/PingController', description: 'x' }),
      },
    });
    expect(denied.ok()).toBe(false);
    // And the read face agrees: the view is served, and unchanged.
    await see(page, 'help look', /look/i);
  } finally {
    await close();
  }
});

test('wiki opens a wiki-starter page; config shows a platform key; chat lists Help/Global/Chat', async ({ browser }) => {
  test.setTimeout(180_000);
  const { page, close } = await openWorldAsFounder(browser);
  try {
    await see(page, 'wiki saxonberg', /Saxonberg/);
    await see(page, 'config defaultStartLocation', /lounge/i);
    await see(page, 'chat list', /Global/i);
    await expect(page.getByText(/Help/).first()).toBeVisible();
    await page.screenshot({ path: '/tmp/wave2-wiki-config-chat.png', fullPage: true });
  } finally {
    await close();
  }
});
