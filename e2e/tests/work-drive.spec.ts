/**
 * LIVE DRIVE (scratch, not for CI): the work-contracts loop end to end
 * in a real browser, fully diegetic — boss re-links at Goodkin (his
 * account was DB-mint funded — the one scaffold), BUYS a real torch at
 * the general store, posts a chattel-bound gig at the terminal-hall
 * noticeboard; a fresh worker claims, delivers, fulfills, hits the
 * unbanked refusal, opens an account, completes, gets paid.
 */
import { test, expect, type Page } from '@playwright/test';
import { mintSession, enterWorld, commandInput } from './helpers';

const SHOT = (n: string) =>
  `/tmp/claude-1000/-home-bobalu-play-saxonberg-build-1/7b521696-7891-4cf3-93e6-32c8504f67b0/scratchpad/drive-${n}.png`;

const HALL = '/domain/terminus/terminal/hall';

async function cmd(page: Page, c: string, ms = 2200): Promise<string> {
  const before = await page.evaluate(() => document.body.innerText);
  const input = commandInput(page);
  await input.fill(c);
  await input.press('Enter');
  await page.waitForTimeout(ms);
  const after = await page.evaluate(() => document.body.innerText);
  let i = 0;
  while (i < before.length && i < after.length && before[i] === after[i]) i++;
  const delta = after.slice(Math.max(0, i - 10));
  console.log(
    `\n──── ${c}\n${delta.split('\n').filter((l) => l.trim()).slice(0, 12).join('\n')}`,
  );
  return delta;
}

test('work-contracts live drive', async ({ browser }) => {
  test.setTimeout(420_000);

  // ── BOSS (persistent; funded account; wakes at the hall) ──
  const boss = await mintSession({ handle: 'boss' });
  const b = await enterWorld(browser, boss.state);
  const bp = b.page;
  await bp.waitForTimeout(2000);

  let lookOut = await cmd(bp, 'look');
  if (lookOut.toLowerCase().includes('general store')) {
    // A prior probe left the boss at the store — walk home to the hall.
    await cmd(bp, 'south', 2600);
    await cmd(bp, 'east', 2600);
    await cmd(bp, 'south', 2600);
    await cmd(bp, 'south', 2600);
    lookOut = await cmd(bp, 'look');
  }
  expect(lookOut.toLowerCase()).toContain('noticeboard');
  await bp.screenshot({ path: SHOT('01-boss-hall'), fullPage: true });

  // Walk to Goodkin (current counting-houses): re-link the wallet (bank
  // open is idempotent + auto-links) and read the funded balance (>= the
  // 25 the escrow needs; repeat runs spend it down 2 at a time).
  await cmd(bp, 'north', 2600);
  await cmd(bp, 'north', 2600);
  await cmd(bp, 'west', 2600);
  await cmd(bp, 'west', 2600);
  await cmd(bp, 'bank open', 2600);
  const bal = await cmd(bp, 'bank', 2200);
  const balMatch = bal.match(/balance is (\d+)/i);
  expect(balMatch, 'a readable balance').toBeTruthy();
  expect(Number(balMatch![1])).toBeGreaterThanOrEqual(25);
  await bp.screenshot({ path: SHOT('02-boss-banked'), fullPage: true });

  // Buy a real torch at the general store (retail + settle + chattel) —
  // unless a prior run's torch is still in the pack (repeatability).
  await cmd(bp, 'east', 2600);
  await cmd(bp, 'north', 2600);
  const invBefore = await cmd(bp, 'inventory');
  if (!invBefore.toLowerCase().includes('torch')) {
    await cmd(bp, 'buy torch', 3000);
  }
  await bp.screenshot({ path: SHOT('03-boss-bought'), fullPage: true });
  const inv = await cmd(bp, 'inventory');
  expect(inv.toLowerCase()).toContain('torch');

  // Back to the hall; drop the torch; post the gig.
  await cmd(bp, 'south', 2600);
  await cmd(bp, 'east', 2600);
  await cmd(bp, 'south', 2600);
  await cmd(bp, 'south', 2600);
  await cmd(bp, 'drop torch', 2200);
  const posted = await cmd(
    bp,
    'job post torch to /domain/terminus/terminal/arrival-gate for 25',
    3000,
  );
  await bp.screenshot({ path: SHOT('04-boss-posted'), fullPage: true });
  const browse = await cmd(bp, 'job');
  const idMatch = browse.match(/\[([0-9a-zA-Z_-]{6,10})\]/);
  console.log('GIG SHORT ID:', idMatch?.[1]);
  expect(idMatch, 'gig id visible on the board').toBeTruthy();
  const gigId = idMatch![1]!;

  // ── WORKER (fresh, unbanked) ──
  const worker = await mintSession({
    handle: `worker-${Date.now()}`,
    withCharacter: true,
    startLocation: HALL,
  });
  const w = await enterWorld(browser, worker.state);
  const wp = w.page;
  await wp.waitForTimeout(2000);

  const wBrowse = await cmd(wp, 'job');
  expect(wBrowse).toContain(gigId);
  const claimed = await cmd(wp, `job claim ${gigId}`, 2600);
  expect(claimed.toLowerCase()).toContain('escrow');
  await wp.screenshot({ path: SHOT('05-worker-claimed'), fullPage: true });

  // Deliver: take the torch north to the arrival gate and drop it.
  await cmd(wp, 'get torch', 2200);
  await cmd(wp, 'north', 2600);
  await cmd(wp, 'drop torch', 2200);
  const sealed = await cmd(wp, 'fulfill', 2600);
  expect(sealed.toLowerCase()).toMatch(/seals the record|verifies the delivery/);
  await wp.screenshot({ path: SHOT('06-worker-fulfilled'), fullPage: true });

  // Back to the board: the unbanked-player refusal.
  await cmd(wp, 'south', 2600);
  const refused = await cmd(wp, `job complete ${gigId}`, 2600);
  expect(refused.toLowerCase()).toContain('no account');
  await wp.screenshot({ path: SHOT('07-worker-unbanked'), fullPage: true });

  // Open an account at Goodkin, walk back, get paid.
  await cmd(wp, 'north', 2600);
  await cmd(wp, 'north', 2600);
  await cmd(wp, 'west', 2600);
  await cmd(wp, 'west', 2600);
  await cmd(wp, 'bank open', 2600);
  await cmd(wp, 'east', 2600);
  await cmd(wp, 'east', 2600);
  await cmd(wp, 'south', 2600);
  await cmd(wp, 'south', 2600);
  const paid = await cmd(wp, `job complete ${gigId}`, 3000);
  expect(paid.toLowerCase()).toMatch(/pays out|released from escrow/);
  await wp.screenshot({ path: SHOT('08-worker-paid'), fullPage: true });

  // The closed-gig guard + the worker's balance at the bank.
  const again = await cmd(wp, `job complete ${gigId}`, 2200);
  expect(again.toLowerCase()).toMatch(/closed|no such|isn't done/);
  await cmd(wp, 'north', 2600);
  await cmd(wp, 'north', 2600);
  await cmd(wp, 'west', 2600);
  await cmd(wp, 'west', 2600);
  const wbal = await cmd(wp, 'bank', 2200);
  expect(wbal).toMatch(/25/);
  await wp.screenshot({ path: SHOT('09-worker-balance'), fullPage: true });

  // Boss sees the board bare again.
  const bossBrowse = await cmd(bp, 'job');
  expect(bossBrowse.toLowerCase()).toContain('bare');

  await w.context.close();
  await b.context.close();
});
