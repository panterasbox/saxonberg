import { test, expect } from '@playwright/test';
import { openWorldAs, runCommand } from './helpers';

/**
 * TEMPORARY live-verification spec for the concealment/detection + traps
 * build. Drives the real client against the Sunken Delve demonstrator
 * (`/domain/traps`), spawning the avatar in the zone via the
 * `startLocation` seam. It CAPTURES the rendered output (not just hard
 * asserts) so a human can read what actually happens in-browser.
 */

async function settle(page: import('@playwright/test').Page, ms = 1500) {
  await page.waitForTimeout(ms);
}

/** Dump the tail of the visible page text so the run reports what rendered. */
async function dump(page: import('@playwright/test').Page, label: string) {
  const txt = await page.evaluate(() => document.body.innerText);
  const tail = txt
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(-22)
    .join('\n');
  console.log(`\n========== ${label} ==========\n${tail}\n==========\n`);
  return txt;
}

test('a walk into a trap room: does the trap fire, and is there feedback?', async ({
  browser,
}) => {
  const { page, close } = await openWorldAs(browser, 'delve-walk', {
    startLocation: '/domain/traps/vestibule',
  });
  try {
    await runCommand(page, 'look');
    await settle(page);
    await expect(page.getByText(/mouth of the delve/i).first()).toBeVisible();
    await dump(page, 'LOOK — the vestibule (room renders)');

    await runCommand(page, 'assess');
    await settle(page);
    await dump(page, 'ASSESS (before) — expect no wounds');

    // Walk NORTH into corridor-1 — the hidden step-dart trap room. A
    // fresh untrained avatar should spring it.
    await runCommand(page, 'north');
    await settle(page, 2000);
    await dump(page, 'WALK north into the trap room — ANY wound feedback line?');

    // Prove the trap fired (or not) via the self-assess wound list.
    await runCommand(page, 'assess');
    await settle(page);
    await dump(page, 'ASSESS (after) — did a wound land?');
  } finally {
    await close();
  }
});

test('honest fog: a concealed secret is hidden until searched, then disarm', async ({
  browser,
}) => {
  const { page, close } = await openWorldAs(browser, 'delve-search', {
    // Spawn IN the trap corridor (spawning is not a traverse, so no
    // trap fires) to exercise search/reveal/disarm on an armed trap.
    startLocation: '/domain/traps/corridor-1',
  });
  try {
    await runCommand(page, 'look');
    await settle(page);
    await dump(page, 'LOOK corridor-1 — concealed secrets should be ABSENT');

    // Search is a costed activity — give it a beat to complete.
    await runCommand(page, 'search');
    await settle(page, 4000);
    await dump(page, 'SEARCH — should reveal the concealed secret(s)');

    await runCommand(page, 'disarm dart');
    await settle(page, 4000);
    await dump(page, 'DISARM dart — found-gated defuse');
  } finally {
    await close();
  }
});
