/**
 * ⛔ **A SOAK file** (span steps — `pnpm wire:soak`, run by the soak lane
 * after merge, never in a blocking run). Split from
 * `whiskey.dirty.wire.test.ts` by the soak-harness census (2026-10-30):
 * the ferment is six game days and the cask sixty, and neither can be
 * staged honestly — the CLOCK producing the whiskey is what is checked.
 * The blocking file keeps everything around them.
 *
 * The chain, in order: mash, ferment six days, light the still, charge
 * it from the vat, draw the spirit into the cask, bung it, sixty days,
 * and the cask holds whiskey.
 */

import { describe as suite, it, expect, beforeAll, afterAll } from 'vitest';
import type { CommandResult } from '../src/harness';
import {
  Session,
  declareFile,
  uniqueHandle,
  expectOk,
  engagementIdOf,
  isOwnedTestWorld,
  advanceWorldClock,
} from '../src/harness';

export const DIRTY_REASON =
  'ferments a wash and casks a charge from the still-house that nothing ' +
  'puts back within a run';

declareFile({
  file: 'whiskey.soak.dirty.wire.test.ts',
  packs: [
    'trade-distilling',
    'trade-malting',
    'trade-milling',
    'trade-farming',
    'generic-objects',
    'base-library',
    'terminus',
  ],
  dirtyReason: DIRTY_REASON,
});

const FLOOR = '/world/terminus/goods-yards/crowsfoot/location/floor';
const BANK_HALL = '/world/terminus/counting-houses/banking-hall';

let k: Session;
let handle = '';

/** Game-seconds a duration string names. */
function secondsOf(duration: string): number {
  const m = /^\s*(\d+(?:\.\d+)?)\s*(second|minute|hour|day)s?\s*$/.exec(
    duration,
  );
  expect(m, `unparseable duration '${duration}'`).toBeTruthy();
  const units: Record<string, number> = {
    second: 1,
    minute: 60,
    hour: 3_600,
    day: 86_400,
  };
  return Number(m![1]) * (units[m![2] as string] ?? 0);
}

/**
 * A command, with an unanswered PROMPT recovered from. ⚠ The
 * apiculture drive's shape, and it matters here because the distillery
 * floor holds two vats, three buckets and a cask — several of which
 * answer to overlapping words.
 */
async function say(s: Session, text: string): Promise<CommandResult> {
  try {
    return await s.cmd(text);
  } catch (err) {
    // ⚠⚠ **A timed-out command poisons the session, and the harness says
    // so in one sentence**: *"was sent while another command is still in
    // flight… correlation is by ORDER, so one command per session at a
    // time."* On the first full run ONE slow `look` in the dark took
    // eleven later checkpoints down with it, each reporting the in-flight
    // error rather than anything about whiskey.
    //
    // ⭐ So a stuck session is RECOVERED rather than cascaded: reopen it
    // and send the command again. The checkpoint that was actually slow
    // still fails, which is right — what is wrong is the other eleven
    // failing with it, because a cascade is not diagnostic.
    if (/still in flight/.test(String(err))) {
      k.close();
      k = await Session.open(handle, { startLocation: FLOOR, wizard: true });
      return await k.cmd(text);
    }
    if (!/raised a PROMPT/.test(String(err))) throw err;
    const pending = await s.awaitPrompt(5_000);
    const payload = (
      pending as unknown as {
        payload?: {
          promptId?: string;
          outcome?: { notes?: Array<{ matches?: Array<{ stuffId?: string }> }> };
        };
      }
    ).payload;
    const id = payload?.promptId;
    const first = payload?.outcome?.notes
      ?.map((n) => n.matches?.[0]?.stuffId)
      .find((x): x is string => typeof x === 'string');
    if (id && first) s.answerPrompt(id, first);
    await new Promise((r) => setTimeout(r, 300));
    return await s.cmd(text);
  }
}

async function read(s: Session, text: string): Promise<string> {
  try {
    return await s.prose(text);
  } catch (err) {
    if (!/raised a PROMPT/.test(String(err))) throw err;
    await say(s, text);
    return await s.prose(text);
  }
}

/** The `controller-rejected` reason on a result, or null. */
function refusedFor(r: { notes: readonly unknown[] }): string | null {
  const note = (r.notes as Array<{ kind?: string; reason?: string }>).find(
    (n) => n.kind === 'controller-rejected',
  );
  return note?.reason ?? null;
}

async function carried(s: Session): Promise<string> {
  const rows = await s.query('me:i', { fields: ['displayName'] });
  return rows
    .map((r) => String((r as { displayName?: string }).displayName ?? ''))
    .join(' | ');
}

/** Run an engaged act out to its effect. */
async function settle(s: Session, started: CommandResult): Promise<void> {
  const id = engagementIdOf(started);
  if (id) await s.awaitActivity(id, 60_000);
  await new Promise((r) => setTimeout(r, 500));
}

/**
 * ⭐⭐⭐ Move world-time from OUTSIDE the fiction, and **prove it moved**.
 * The premise of every clocked checkpoint below, asserted in the helper
 * so no single checkpoint can be vacuous about it.
 */
async function advance(duration: string): Promise<void> {
  const { before, after } = await advanceWorldClock(duration);
  expect(
    after - before,
    `advance ${duration}: world-time did not move (the clock is the ` +
      `premise of every clocked checkpoint in this file)`,
  ).toBeGreaterThan(secondsOf(duration) * 0.9);
  await new Promise((r) => setTimeout(r, 400));
}

/**
 * ⭐⭐ **Wait for daylight, because the still-house has no lamp.**
 *
 * Crowsfoot's floor authors no ambient light at all, deliberately — its
 * own row says so: *"this room is LIT BY SPILL from the yard, through a
 * doorway that stands open… bright by day and DARK at night, which is
 * the whole point, and it costs no authored number at all."*
 *
 * ⚠⚠ So the first run of this drive opened with `it is pitch dark. you
 * can…` and every `look` checkpoint failed on a premise that had nothing
 * to do with whiskey. **A drive that walks into an interior lit by spill
 * has to know what time it is** — the taps drive never learned this
 * because a sugarbush is outdoors. Recorded here because the next indoor
 * drive will hit it too.
 *
 * ⭐ Advancing the clock is the honest fix rather than conjuring a
 * lantern: the house is dark at night because somebody decided it should
 * be, and a distiller works in the day.
 */
async function waitForDaylight(s: Session): Promise<void> {
  for (let i = 0; i < 6; i++) {
    const here = await read(s, 'look');
    if (!/pitch dark|too dark/i.test(here)) return;
    await advance('4 hours');
  }
  throw new Error(
    'wire: the still-house floor stayed dark across a whole game day — ' +
      'the spill-lighting walk from the yard is not reaching it',
  );
}

beforeAll(async () => {
  handle = uniqueHandle('distiller');
  // ⚠ `reserve override`, not `reserve issue` — the reserve stopped
  // issuing coin by hand at the economic bootstrap. And the balance is
  // asserted HERE, at setup, because a funding failure otherwise
  // surfaces several checkpoints later as `insufficient-funds` on a
  // `buy`, which reads like a shop bug.
  k = await Session.open(handle, { startLocation: BANK_HALL, wizard: true });
  expectOk(await k.cmd('bank open'));
  const gov = await Session.open('founder', { startLocation: BANK_HALL });
  try {
    expectOk(
      await gov.cmd(`reserve override 400 to ${handle} "wire: whiskey funding"`),
    );
  } finally {
    gov.close();
  }
  const bal = /balance is (\d+)/i.exec(await k.prose('bank'));
  expect(bal, 'the account must be funded before the drive starts').toBeTruthy();
  expect(Number(bal![1])).toBeGreaterThan(30);
  k.close();
  k = await Session.open(handle, { startLocation: FLOOR, wizard: true });
  await waitForDaylight(k);
}, 300_000);

afterAll(() => k?.close());


suite.skipIf(!isOwnedTestWorld())('⭐⭐ the wash ferments, and new-make becomes whiskey', () => {
  it('the wash ferments over six game days', async () => {
    const mashed = await say(k, 'order wash-mash');
    await settle(k, mashed);
    await advance('6 days');
    await waitForDaylight(k);
    const vat = await read(k, 'look vat');
    expect(vat.length).toBeGreaterThan(20);
  }, 900_000);

  it('the still is lit and charged from the vat', async () => {
    await say(k, 'stoke log into still');
    const lit = await say(k, 'ignite still');
    expect(refusedFor(lit)).not.toBe('no-fuel');
    const poured = await say(k, 'pour vat into still');
    expect(refusedFor(poured)).not.toMatch(/bulk|slot|cannot-pour/i);
  }, 300_000);

  it('⭐ the cask takes the spirit, is bunged, and after sixty days holds whiskey', async () => {
    await say(k, 'pour still into cask');
    await say(k, 'close cask');
    // Forty-five game-days is the authored profile; take sixty.
    await advance('60 days');
    await waitForDaylight(k);
    const cask = await read(k, 'look cask');
    expect(
      cask.toLowerCase(),
      'the cask does not report whiskey after its profile\'s time — ' +
        'either the aging profile never matched or the roster is cold',
    ).toContain('whiskey');
  }, 1_800_000);
});
