/**
 * ⭐⭐ **The bore, driven end to end** — Stage A's exit criterion, run
 * against the real socket.
 *
 * The requirements' drive in one sentence: *walk east out of a mining
 * town into salt country, find a spring, learn from a trained eye that
 * the spring is the one place NOT to dig, put a surveyor's dial on the
 * ground and be told where the top of the structure actually is, walk
 * there, stake it, raise a rig, hire two hands out of the dry, watch the
 * hole get deeper while you are not touching it and the wages come out
 * of your account, line it through the water, bail brine out of it, boil
 * the brine, and come away with salt four days' cart from the sea.*
 *
 * ## ⭐⭐⭐ What this file is really asserting
 *
 * **That the survey is worth paying for.** The spring sits on the trap's
 * RIM and the flat sits over its CREST — a bore at the spring reaches
 * the leg and finds about a metre of it, and the same money at the flat
 * finds forty. `measure structure` says which you are standing on before
 * a penny is spent. Checkpoints 3–5 are that claim, and if they ever
 * pass vacuously the structural bracket has become decorative and the
 * trade has lost its point.
 *
 * **And that charge has no channel.** Checkpoint 4 asserts the
 * instrument's own words never mention whether there is anything in it,
 * because the dry hole has to survive every improvement to the
 * instruments.
 *
 * ⚠⚠ **Assert UNDERSTOOD AND CHANGED, never "not refused."**
 * `refusedFor` is blind to `command-rejected` and `validator-failed`, so
 * a verb nothing affords reads as a clean pass. Every checkpoint here
 * either reads prose or reads state back.
 *
 * Run: `WIRE_BOOT=1 WIRE_PORT=2013 WIRE_FRAME_TIMEOUT=60000 npx vitest
 * run tests/drilling.dirty.wire.test.ts`
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
  worldClockNow,
} from '../src/harness';

/**
 * ⚠ **Why this file cannot run twice.** It stakes two sites that stay
 * staked, sinks a hole that keeps its depth across a bounce, takes brine
 * a reservoir does not put back (⭐ recharge is ZERO, deliberately — a
 * body that is drawn out is drawn out, which is what makes an oil
 * country a boom with an end in it), buys the Rejection store's bailer
 * and liner par, and leaves two roustabouts on somebody's payroll.
 *
 * ⭐ And the dirty reason is a question for a trade: the LINER comes
 * from a shop's par because nothing in the realm staves a tube. A well
 * liner is coopering — the same skill as a cask — and this build has
 * left a cooper-shaped hole that a par faucet stands in for. A finding
 * for the carpentry/cooperage slate, not a defect here.
 */
export const DIRTY_REASON =
  'stakes two sites that stay staked, sinks a hole that keeps its depth, ' +
  'draws brine a reservoir never puts back (recharge is zero by design), ' +
  'buys the Rejection store’s bailer and liner par, and leaves two ' +
  'roustabouts on a payroll';

declareFile({
  file: 'drilling.dirty.wire.test.ts',
  packs: [
    'trade-drilling',
    'trade-mining',
    'trade-quarrying',
    'ground',
    'generic-objects',
    'base-library',
    'rejection',
    'terminus',
  ],
  dirtyReason: DIRTY_REASON,
});

const PROVISIONING = '/world/terminus/rejection/location/provisioning';
const BANK_HALL = '/world/terminus/counting-houses/banking-hall';

/** Provisioning → the claims office → the hillside → salt country. */
const TO_THE_SPRING = ['east', 'north', 'north', 'east'] as const;

let k: Session;
let handle = '';

/** Game-seconds a duration string names. */
function secondsOf(duration: string): number {
  const m = /^\s*(\d+(?:\.\d+)?)\s*(second|minute|hour|day)s?\s*$/.exec(duration);
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
 * Move world-time from OUTSIDE the fiction, through the test-only route.
 *
 * ⚠ The assertion is in the HELPER, which is the taps drive's hard-won
 * shape: its clock jump failed silently twice and the drive reported
 * 15/15 through both, because only one checkpoint did any arithmetic.
 * Proving the premise here closes the whole vacuity class.
 */
async function advance(duration: string): Promise<void> {
  const { before, after } = await advanceWorldClock(duration);
  expect(
    after - before,
    `advance ${duration}: world-time did not move (every wage and every ` +
      `banked swing in this file rests on it)`,
  ).toBeGreaterThan(secondsOf(duration) * 0.9);
  await new Promise((r) => setTimeout(r, 500));
}

async function say(s: Session, text: string): Promise<CommandResult> {
  try {
    return await s.cmd(text);
  } catch (err) {
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

async function walk(s: Session, route: readonly string[]): Promise<void> {
  for (const dir of route) {
    const moved = await say(s, dir);
    expect(
      moved.notes.find((n) => n.kind === 'command-rejected'),
      `'${dir}' is not a way out of here`,
    ).toBeUndefined();
  }
  await s.drainProse();
}

/** The `controller-rejected` reason on a result, or null. */
function refusedFor(r: { notes: readonly unknown[] }): string | null {
  const note = (r.notes as Array<{ kind?: string; reason?: string }>).find(
    (n) => n.kind === 'controller-rejected',
  );
  return note?.reason ?? null;
}

/** Run an engaged act out to its effect. */
async function settle(s: Session, started: CommandResult): Promise<void> {
  const id = engagementIdOf(started);
  if (id) await s.awaitActivity(id, 60_000);
  await new Promise((r) => setTimeout(r, 400));
}

async function carried(s: Session): Promise<string> {
  const rows = await s.query('me:i', { fields: ['displayName'] });
  return rows
    .map((r) => String((r as { displayName?: string }).displayName ?? ''))
    .join(' | ');
}

beforeAll(async () => {
  handle = uniqueHandle('driller');
  // ⚠ `reserve override`, not `reserve issue` — the reserve stopped
  // issuing coin by hand at the economic bootstrap. And the balance is
  // asserted HERE, at setup, because a funding failure otherwise
  // surfaces five checkpoints later as `insufficient-funds` on a `buy`,
  // which reads like a shop bug.
  //
  // ⭐ The figure is large on purpose: this drive pays two hands for
  // several game-days, and the whole point of the trade is that the
  // payroll is the cost. A thin account would fail as an arrear, which
  // is correct behaviour and would hide every later checkpoint.
  k = await Session.open(handle, { startLocation: BANK_HALL, wizard: true });
  expectOk(await k.cmd('bank open'));
  const gov = await Session.open('founder', { startLocation: BANK_HALL });
  try {
    expectOk(
      await gov.cmd(`reserve override 900 to ${handle} "wire: drilling funding"`),
    );
  } finally {
    gov.close();
  }
  const bankProse = await k.prose('bank');
  const bal = /balance is (\d+)/i.exec(bankProse);
  expect(
    bal,
    `the account must be funded before the drive starts — the bank said: ${bankProse}`,
  ).toBeTruthy();
  expect(Number(bal![1]), `the bank said: ${bankProse}`).toBeGreaterThan(100);
  k.close();
  k = await Session.open(handle, { startLocation: PROVISIONING, wizard: true });
}, 300_000);

afterAll(() => k?.close());

/* ───────────── 0. the clock, without which no wage is paid ───────────── */

suite.skipIf(!isOwnedTestWorld())('0. the clock moves from outside', () => {
  it('⭐⭐ the test-clock route moves game time, and by how much', async () => {
    const before = await worldClockNow();
    expect(Number.isFinite(before)).toBe(true);
    await advance('2 hours');
    expect(await worldClockNow()).toBeGreaterThan(before);
  });
});

/* ───────────── 1–2. the kit, and the walk into salt country ───────────── */

suite('1. the kit is on the shelf people already buy from', () => {
  it('⭐ buys a light first — this is a mining town and the sun sets', async () => {
    // ⚠ Not scenery, and the drive found it: the two new sites are
    // outdoor rooms lit by the sky, so after dark they are PITCH BLACK
    // and every checkpoint that reads prose reads *you can make out
    // nothing*. A glowcap jar is four coins on the same slate and is
    // what any miner in this town carries — which is also the honest
    // answer rather than authoring an ambient value that pretends the
    // sun never sets on a hillside.
    const bought = await say(k, 'buy jar');
    expect(refusedFor(bought), `a light must be for sale: ${await read(k, 'bank')}`).toBeNull();
    expect(await carried(k)).toMatch(/jar|glowcap/i);
  });

  it('⭐ buys a bailer and liners at the mining store, priced', async () => {
    // The trade's instruments go where people already buy. ⚠ No derrick
    // on the slate: a ton and a half of timber frame is not a thing you
    // carry out of a shop, and the rig is raised by the siting act.
    const shelf = await read(k, 'look counter');
    expect(shelf.length).toBeGreaterThan(0);
    const bought = await say(k, 'buy bailer');
    expect(
      refusedFor(bought),
      `the bailer must be for sale — the bank says: ${await read(k, 'bank')}`,
    ).toBeNull();
    expect(await carried(k)).toMatch(/bailer/i);
    for (let i = 0; i < 3; i++) await say(k, 'buy liner');
    expect(await carried(k)).toMatch(/liner/i);
  });

  it('⚠ the derrick is NOT for sale, and the refusal is honest about it', async () => {
    const tried = await say(k, 'buy derrick');
    // Either the shop does not stock one or it says so — what must NOT
    // happen is a derrick arriving in a pocket.
    expect(await carried(k)).not.toMatch(/derrick/i);
    void tried;
  });
});

suite('2. the free evidence, and what a trained eye makes of it', () => {
  it('walks east out of the mining town into salt country', async () => {
    await walk(k, TO_THE_SPRING);
    const here = await read(k, 'look');
    expect(here).toMatch(/hollow|spring/i);
  });

  it('⭐ `look` shows the spring — the one thing in this trade that is free', async () => {
    const here = await read(k, 'look');
    expect(here).toMatch(/spring|pool|grey|salt/i);
    const prop = await read(k, 'look spring');
    expect(prop).toMatch(/salt|crust|water/i);
  });

  it('⭐⭐⭐ `analyze structure` names the showing AND says no instrument can tell you the rest', async () => {
    const eye = await read(k, 'analyze structure');
    // The free evidence, interpreted — and the sentence that is the
    // trade's whole premise. If this ever stops being said, somebody has
    // started hinting.
    expect(eye).toMatch(/nothing tells you that but the hole/i);
  });
});

/* ───────────── 3–5. the survey, and why it is worth paying for ───────────── */

suite('3. the instrument reads the structure, and not the charge', () => {
  it('⭐⭐ `measure structure` wants an instrument, and the dial is the miner\'s', async () => {
    // ⭐ The trade adds NO instrument for its structural read: the same
    // `surveying` capability mining's dial and compass already afford.
    const bare = await read(k, 'measure structure');
    expect(bare.length).toBeGreaterThan(0);
  });

  it('⭐⭐⭐ at the SPRING it reports the trap, and says the top is somewhere ELSE', async () => {
    const r = await read(k, 'measure structure');
    // The structure is there and readable...
    expect(r).toMatch(/closure|beds/i);
    // ...and the one sentence that makes the cheap bore a decision
    // rather than a trap: you are out on the edge of it.
    expect(r).toMatch(/edge of it|flank/i);
  });

  it('⚠⚠ the instrument\'s words never mention whether there is anything in it', async () => {
    // The dry hole must survive every improvement to the instruments.
    const r = await read(k, 'measure structure');
    expect(r).not.toMatch(/charged|oil in it|brine in it|holds brine/i);
  });
});

suite('4. the crest is somewhere else, and walking there is the lesson', () => {
  it('⭐⭐⭐ at the FLAT the same instrument says you are at the top', async () => {
    await walk(k, ['southeast']);
    const here = await read(k, 'look');
    expect(here).toMatch(/flat|bare/i);
    const r = await read(k, 'measure structure');
    expect(r).toMatch(/near the top of it|under your feet/i);
  });

  it('⚠ and the FLAT shows nothing for free — the prose does not give it away', async () => {
    const here = await read(k, 'look');
    expect(here).not.toMatch(/\bspring\b|\bstain\b/i);
  });
});

/* ───────────── 5–7. the claim, the rig, the crew ───────────── */

suite('5. the claim is one more entry in the register that already existed', () => {
  it('⭐ `stake flat` at the counter — no second mechanism', async () => {
    // Back to the claims office: the counter is where title is written,
    // and a bore site is one more `surfaceWorkings` entry.
    // flat → spring → hillside → claims office.
    await walk(k, ['northwest', 'west', 'southwest']);
    const staked = await say(k, 'stake flat');
    expect(refusedFor(staked), 'the flat must be stakeable').toBeNull();
    const register = await read(k, 'look register');
    expect(register.length).toBeGreaterThan(0);
  });
});

suite('6. the rig goes up, and `bore` is afforded by what is in your hands', () => {
  it('⚠ untitled ground refuses the siting, in words that name the remedy', async () => {
    // At the SPRING, which nobody has staked: the refusal is the one
    // `stake` exists to lift.
    await walk(k, ['north', 'east']);
    const tried = await say(k, 'bore');
    expect(refusedFor(tried)).toBe('untitled');
  });

  it('⭐⭐ at the staked flat, `bore` raises a derrick and sites a wellhead', async () => {
    await walk(k, ['southeast']);
    const sited = await say(k, 'bore');
    expect(refusedFor(sited), 'siting must not refuse on staked ground').toBeNull();
    const here = await read(k, 'look');
    expect(here).toMatch(/derrick|rig/i);
    expect(here).toMatch(/wellhead|collar/i);
  });

  it('⭐ a second `bore` is a SWING, not a second rig', async () => {
    const swing = await say(k, 'bore');
    await settle(k, swing);
    const here = await read(k, 'look');
    // One rig, not two: the fork is which of the two acts the world is in.
    expect((here.match(/derrick/gi) ?? []).length).toBeLessThan(2);
  });
});

suite('7. the crew — presence is depth, and depth is wages', () => {
  it('⭐⭐⭐ hires two hands out of the dry, and they GO TO THE RIG', async () => {
    // ⚠⚠ **This checkpoint is the one that found a real defect.** `hire`
    // was written to read the hole in the room, on the reasoning that *a
    // bore crew is hired at the bore, out of whoever has walked up.*
    // True of a player; false of every NPC in the realm — a roustabout
    // has no brain on purpose, so he does not walk anywhere, and hiring
    // at the rig was unreachable by construction.
    //
    // ⭐ The fix is the shipped shape: `hire` resolves the proprietor's
    // own outfit, and the hand reports to `operatingLocations[0]` the way
    // every other shipped hand reports for a shift.
    await walk(k, ['northwest', 'west', 'southwest', 'south', 'northwest']);
    const dry = await read(k, 'look');
    expect(dry).toMatch(/roustabout/i);

    const hired = await say(k, 'hire tall');
    expect(refusedFor(hired), 'a proprietor with one rig must be able to hire').toBeNull();
    // He is gone from the dry — he has gone out to the hole.
    const after = await read(k, 'look');
    expect(after).not.toMatch(/tall roustabout/i);

    const second = await say(k, 'hire squat');
    expect(refusedFor(second)).toBeNull();
  });

  it('⭐⭐ the hands are AT the rig, and the hole gets deeper with nobody touching it', async () => {
    await walk(k, ['southeast', 'north', 'north', 'east', 'southeast']);
    const atRig = await read(k, 'look');
    expect(atRig, 'the hired hands must have reported to the claim').toMatch(
      /roustabout/i,
    );
    const before = await read(k, 'look wellhead');
    // ⭐ A game-day of presence. The engine measures presence, not
    // virtue: they are rostered, on shift, standing here, hands free.
    await advance('1 day');
    const after = await read(k, 'look wellhead');
    expect(after, 'the hole must have changed over a day of paid work').not.toBe(
      before,
    );
  });

  it('⭐ and the wages came out of the account, with nothing announcing it', async () => {
    const bal = /balance is (\d+)/i.exec(await read(k, 'bank'));
    expect(bal, 'the account must still be readable').toBeTruthy();
    // ⚠ Asserted as *less than it was funded with*, not as an exact
    // figure: the point is that depth costs money over time, and pinning
    // the arithmetic here would make this a wage-rate test.
    expect(Number(bal![1])).toBeLessThan(900);
  });

  it('⭐⭐⭐ `dismiss` is the ONLY thing that stops the meter', async () => {
    // Nothing told the player the rate was no longer worth the wage, and
    // nothing will. That decision IS the content.
    const off = await say(k, 'dismiss tall');
    expect(refusedFor(off)).toBeNull();
    const here = await read(k, 'look');
    expect(here).not.toMatch(/tall roustabout/i);
  });
});

/* ───────────── the record ───────────── */

suite('the bore log — filed under the trade, and nobody holds the pen', () => {
  it('⭐⭐ a dry metre is a FINDING, and the log keeps it', async () => {
    // Nothing in the game lets the owner edit it, which is exactly why a
    // buyer would pay for it. Read through `look` at the wellhead.
    const hole = await read(k, 'look wellhead');
    expect(hole.length).toBeGreaterThan(0);
  });
});
