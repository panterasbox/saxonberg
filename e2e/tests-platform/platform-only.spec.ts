import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { enterWorld, mintSession, runCommand, sendUntil } from '../tests/helpers';
import {
  PLATFORM_FOUNDER_HANDLE,
  PLATFORM_SERVER_LOG,
} from '../playwright.platform.config';

/**
 * Pack zero — the platform pack alone is a bootable world.
 *
 * The server under this config runs `SAXONBERG_PACKS=platform`: no
 * lounge, no species, no generic objects, no world-seed. What must still
 * hold: the boot completes without an error line, the founder (head of
 * the executive, which holds the platform) can log in and land in the
 * shell room — the void, the code fallback when no pack contributed
 * `defaultStartLocation` — and `pack status` knows exactly one pack.
 *
 * The landing room is asserted by what it RENDERS: `/platform/location/void` is a
 * bare Location (no Named, no Visible, no Exitable), and `look` there
 * prints exactly one line — "Your surroundings are indistinct." — the
 * fallback no authored room ever produces.
 *
 * ⚠ Meaningful only on a database no full-pack boot has touched: the
 * lounge's `defaultStartLocation` SETTING survives in `app_settings`, the
 * founder then spawns toward a lounge this world never installed, and
 * the roster alone takes ~10 s to come back (measured 2026-08-27) —
 * past the 5 s expect. CI's database is always fresh; locally, drop the
 * worktree's database first. See playwright.platform.config.ts.
 */

const LOG = resolve(new URL('..', import.meta.url).pathname, PLATFORM_SERVER_LOG);

test('the founder lands in the void (asserted by its rendering) and pack status lists one pack', async ({
  browser,
}) => {
  // The founder by way of `FOUNDER_GOOGLE_EMAIL` — this config's own
  // handle (see playwright.platform.config.ts), minted fresh each run.
  const { state } = await mintSession({
    handle: PLATFORM_FOUNDER_HANDLE,
    withCharacter: true,
  });
  const { page, context } = await enterWorld(browser, state);
  const close = () => context.close();
  try {
    // In the cockpit, not on the front door — the void rendered.
    await expect(page.getByPlaceholder('Enter command...')).toBeVisible();
    await expect(page.getByTestId('start-screen')).toHaveCount(0);

    // `look` — the void, by the one line only the void renders.
    await sendUntil(
      page,
      'look',
      page.getByText('Your surroundings are indistinct.').first()
    );

    // `pack status` — exactly one pack known to this build.
    await expect(async () => {
      await runCommand(page, 'pack status');
      await expect(page.getByText(/pack 'platform'/).first()).toBeVisible({
        timeout: 2_000,
      });
    }).toPass({ timeout: 20_000 });
    // Packs IN THIS BUILD: the filter hides every other pack from
    // discovery, so a record an earlier unfiltered boot left behind (a
    // shared local database) shows as `(NOT in this build)` — and does
    // not count. A fresh database has no such records at all.
    const body = await page.locator('body').innerText();
    const inBuild = new Set(
      [...body.matchAll(/pack '([a-z0-9-]+)'(?! \(NOT in this build\))/g)].map(
        (m) => m[1],
      ),
    );
    expect([...inBuild]).toEqual(['platform']);
  } finally {
    await close();
  }
});

test('the platform-only boot logged no error or failure', async () => {
  const log = readFileSync(LOG, 'utf8');
  const offenders = log
    .split('\n')
    .filter((line) => /error|failed/i.test(line));
  expect(offenders, offenders.join('\n')).toEqual([]);
});
