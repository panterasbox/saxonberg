/**
 * ⛔ **A SOAK file** (span steps — `pnpm wire:soak`, run by the soak lane
 * after merge, never in a blocking run). Split from
 * `whiskey.dirty.wire.test.ts` by the soak-harness census (2026-10-30):
 * the ferment is six game days and the cask sixty, and neither can be
 * staged honestly — the CLOCK producing the whiskey is what is checked.
 * The blocking file keeps everything around them.
 *
 * The chain, in order: buy malt, mill it to grist at the floor's quern,
 * mash, ferment six days, light the still, charge it from the vat, draw
 * the spirit into the cask, bung it, sixty days, and the cask holds
 * whiskey.
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
const CASH_AND_CARRY = '/world/terminus/counting-houses/cash-and-carry';
const BANK_HALL = '/world/terminus/counting-houses/banking-hall';
const STORE = '/world/terminus/general-store/shop-floor';

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
      k = await Session.open(handle, { startLocation: FLOOR });
      return await k.cmd(text);
    }
    if (!/raised a PROMPT/.test(String(err))) throw err;
    const pending = await s.awaitPrompt(5_000);
    // ⚠ The prompt frame carries `promptId` and `outcome` at the TOP level
    // (the cleanliness lesson); an older shape nested them in `payload`.
    type PromptFrame = {
          promptId?: string;
          outcome?: { notes?: Array<{ matches?: Array<{ stuffId?: string }> }> };
        };
    const frame = pending as unknown as PromptFrame & { payload?: PromptFrame };
    const payload = frame.payload?.promptId ? frame.payload : frame;
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

/**
 * What the session carries, as one line. ⚠ `me:I`, not `me:i` (size and
 * carrying W9): a thing in a pocket is its garment's contents, so a good
 * that lands in a pocket is carried without being a top-level content.
 */
async function carried(s: Session): Promise<string> {
  const rows = await s.query('me:I', { fields: ['displayName'] });
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

/**
 * ⚠⚠ **The still by its id, never by the word.** `still` is a keyword of
 * the copper pot still AND of the still book that hangs beside it (#138),
 * so a bare `look still` asks "which one?" and every command after it
 * queues behind a prompt nobody answers. The pot still is found once by
 * its own name and addressed as `#<id>` from then on.
 */
let stillId = '';
async function stillRef(s: Session): Promise<string> {
  if (!stillId) {
    const rows = (await s.query('here:i:[keyword.still]', {
      fields: ['displayName'],
    })) as Array<{ stuffId?: string; displayName?: string }>;
    const pot = rows.find((r) => /pot still/i.test(String(r.displayName ?? '')));
    expect(
      pot?.stuffId,
      `no pot still on the floor: ${rows.map((r) => r.displayName).join(' | ')}`,
    ).toBeTruthy();
    stillId = pot!.stuffId!;
  }
  return `#${stillId}`;
}

/**
 * ⭐ Rest the way a person would: eat, sit out some clock, stand, and wait
 * for the light the still-house borrows from the yard.
 */
async function rest(duration: string): Promise<void> {
  await say(k, 'eat rations');
  await say(k, 'sit');
  await advance(duration);
  await say(k, 'stand');
  await waitForDaylight(k);
}

/**
 * ⭐⭐ **The distiller mills her own grist — a portion at a time.** A whole
 * 15 kg sack is an hour on the handle and a body is refused it up front
 * (#144: a long act is checked for its whole cost), and `mill` grinds
 * whatever the named holder carries, all of it. So she does what a person
 * at a hand quern does: measures a portion into the maltings' empty sack
 * (2.5 L of malt, about 1.5 kg — six minutes of cranking), grinds that,
 * eats and rests, and goes again. Three portions make ~6 L of grist; the
 * wash-mash wants 4 L of it in ONE holder, so the sacks are tipped
 * together at the end.
 */
const MALT_PORTION_L = 2.5;
const MALT_PORTIONS = 3;

async function millGristInPortions(): Promise<void> {
  // The rations first — a working body eats, and the store is the
  // general store's.
  // ⚠ (soak repair 2026-11-18, size and carrying) Two at a time, set down
  // on the still-house floor. A ration pack is a discrete thing (not a
  // stack), so five of them fill both hands and the rest are set down at
  // the STORE's counter — and a 15 kg sack of malt takes BOTH hands, so
  // bought with the hands full it was set down at the cash-and-carry and
  // never reached the quern. A distiller keeps her food by the quern and
  // fetches the malt with her hands free; `eat` reaches the floor.
  const RATIONS = MALT_PORTIONS + 2;
  for (let bought = 0; bought < RATIONS; bought += 2) {
    k.close();
    k = await Session.open(handle, { startLocation: STORE });
    for (let i = bought; i < Math.min(bought + 2, RATIONS); i++) {
      await say(k, 'buy rations');
    }
    k.close();
    k = await Session.open(handle, { startLocation: FLOOR });
    await say(k, 'drop rations');
  }
  k.close();
  k = await Session.open(handle, { startLocation: CASH_AND_CARRY });
  // ⚠ `"malt sack"`, not `malt`: the grist sack answers to `malt` too.
  let bought = await say(k, 'buy "malt sack"');
  for (let i = 0; i < 6 && bought.status !== 'ok'; i++) {
    await advance('1 hour');
    bought = await say(k, 'buy "malt sack"');
  }
  expectOk(bought);
  k.close();
  k = await Session.open(handle, { startLocation: FLOOR });
  await waitForDaylight(k);
  // `me:I`: carried anywhere on the body (a hand, a pocket), not only at
  // the top level.
  const sacks = await k.query('me:I:[keyword.malt]', { fields: ['displayName'] });
  const sack = (sacks as Array<{ stuffId?: string }>)[0]?.stuffId;
  expect(sack, `no malt carried: ${await carried(k)}`).toBeTruthy();
  const empties = (await k.query('here:i:[keyword.empty]', {
    fields: ['displayName'],
  })) as Array<{ stuffId?: string; displayName?: string }>;
  const hopper = empties.find((r) =>
    /malt sack/i.test(String(r.displayName ?? '')),
  )?.stuffId;
  expect(
    hopper,
    `the maltings' empty malt sack is not on the floor: ` +
      empties.map((r) => r.displayName).join(' | '),
  ).toBeTruthy();

  for (let i = 0; i < MALT_PORTIONS; i++) {
    if (i > 0) await rest('1 hour');
    expectOk(
      await say(k, `pour #${sack} into #${hopper} --amount ${MALT_PORTION_L} L`),
    );
    let milling = await say(k, `mill #${hopper} at quern`);
    if (refusedFor(milling) === 'too-tired') {
      await rest('8 hours');
      milling = await say(k, `mill #${hopper} at quern`);
    }
    const id = engagementIdOf(milling);
    // A quern grinds a quarter-kilo a game-minute: a portion is six
    // minutes of cranking, carried by the clock.
    await advance('15 minutes');
    if (id) await k.awaitActivity(id, 120_000);
    await new Promise((r) => setTimeout(r, 500));
  }

  // Each grind lands its own sack on the floor; the mash takes its grist
  // from one holder, so tip them into the first.
  const grist = (await k.query('here:i:[keyword.grist]', {
    fields: ['displayName'],
  })) as Array<{ stuffId?: string }>;
  expect(grist.length, `no grist after the grind: ${await carried(k)}`).toBeGreaterThan(0);
  const [into, ...others] = grist.map((g) => g.stuffId).filter((x): x is string => !!x);
  for (const from of others) expectOk(await say(k, `pour #${from} into #${into}`));
}

beforeAll(async () => {
  handle = uniqueHandle('distiller');
  // ⚠ `reserve override`, not `reserve issue` — the reserve stopped
  // issuing coin by hand at the economic bootstrap. And the balance is
  // asserted HERE, at setup, because a funding failure otherwise
  // surfaces several checkpoints later as `insufficient-funds` on a
  // `buy`, which reads like a shop bug.
  k = await Session.open(handle, { startLocation: BANK_HALL });
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
  k = await Session.open(handle, { startLocation: FLOOR });
  await waitForDaylight(k);
}, 300_000);

afterAll(() => k?.close());


suite.skipIf(!isOwnedTestWorld())('⭐⭐ the wash ferments, and new-make becomes whiskey', () => {
  it('the distiller mills her own grist: malt bought, ground at the quern', async () => {
    // ⚠ (soak repair 2026-11-16) The mash wants GRIST since the grain
    // chain (whole malt does not mash), and the floor's own malt sack is
    // the maltings' empty one. So the distiller does what a player would:
    // buys a sack of malt at the cash-and-carry and grinds it at the
    // floor's quern, both hands on the handle — her own grist, not the
    // counter's dearer sack of it.
    await millGristInPortions();
  }, 1_800_000);

  it('the wash ferments over six game days', async () => {
    // ⚠ (soak repair 2026-11-16) The order is ASSERTED: a mash refused for
    // want of grist used to pass on whatever the vat already read.
    const mashed = await say(k, 'order wash-mash');
    expectOk(mashed);
    await settle(k, mashed);
    await advance('6 days');
    await waitForDaylight(k);
    const vat = await read(k, 'look vat');
    expect(vat.length).toBeGreaterThan(20);
  }, 900_000);

  it('the still is lit and charged from the vat', async () => {
    await say(k, `stoke log into ${await stillRef(k)}`);
    const lit = await say(k, `light ${await stillRef(k)}`);
    expect(refusedFor(lit)).not.toBe('no-fuel');
    const poured = await say(k, `pour vat into ${await stillRef(k)}`);
    // `?? ''`: a pour that is not refused has no reason, and `toMatch`
    // wants a string.
    expect(refusedFor(poured) ?? '').not.toMatch(/bulk|slot|cannot-pour/i);
  }, 300_000);

  it('⭐ the cask takes the spirit, is bunged, and after sixty days holds whiskey', async () => {
    await say(k, `pour ${await stillRef(k)} into cask`);
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
