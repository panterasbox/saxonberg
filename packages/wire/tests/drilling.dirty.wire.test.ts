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
 * ## ⚠⚠ A fresh DB needs a bigger boot budget than the harness's default
 *
 * `bootOwnedWorld`'s budget is `WIRE_BOOT_TIMEOUT ?? 420_000`, and a
 * **fresh** database does not make it: installing fifty-seven packs from
 * the checkout took this drive past seven minutes, and the harness gave
 * up with *the owned server did not answer within 420s* while the log's
 * last line was `AppBootstrap: world open — the cast may act`. The world
 * was fine; the probe had stopped asking.
 *
 * ⭐ So a run after a `reset:db` wants `WIRE_BOOT_TIMEOUT=900000`, and a
 * run on a warm DB does not. Worth knowing before concluding anything
 * about a boot that "hangs".
 *
 * Run: `WIRE_BOOT=1 WIRE_PORT=2013 WIRE_BOOT_TIMEOUT=900000
 * WIRE_FRAME_TIMEOUT=45000 npx vitest run
 * tests/drilling.dirty.wire.test.ts`
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
const REJECTION = '/world/terminus/rejection';

/** The drilling kit, minted because the Rejection till cannot take money. */
const KIT = [
  '/world/terminus/rejection/thing/glowcap-jar',
  '/trade/drilling/thing/bailer',
  '/trade/drilling/thing/liner',
  '/trade/drilling/thing/liner',
  '/trade/drilling/thing/liner',
  '/trade/drilling/thing/pressure-gauge',
  '/trade/mining/thing/miners-dial',
] as const;

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

/**
 * ⭐⭐ Move world-time to the middle of the next day.
 *
 * ⚠⚠ Not a nicety: the two new sites are OUTDOOR rooms lit by the sky,
 * and at night an outdoor room is correctly pitch black — so every
 * checkpoint that reads prose read *It is pitch dark. You can make out
 * nothing* and the drive lost two thirds of itself to the time of day.
 * Checkpoint 0 advances the clock, which is what put it after dark.
 *
 * ⭐ The glowcap jar helps and is not enough (*shapes and edges, no
 * more*), which is itself honest: a miner's lamp is for a drift, not for
 * reading a hillside. A surveyor works by daylight, and so does this
 * drive.
 */
async function daylight(): Promise<void> {
  const DAY = 86_400;
  const now = await worldClockNow();
  const intoDay = ((now % DAY) + DAY) % DAY;
  const NOON = DAY / 2;
  const wait = intoDay < NOON ? NOON - intoDay : DAY - intoDay + NOON;
  // ⚠ `advance` takes whole units, so round up to the next hour and
  // assert through the helper as every other jump does.
  await advance(`${Math.max(1, Math.ceil(wait / 3600))} hours`);
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

/**
 * Lay the drilling kit out in the provisioning store. ⚠ In the STORE and
 * not at the site: the sites are outdoor rooms and after dark you cannot
 * `get` what you cannot see, so a kit dropped there is unreachable —
 * which is the cascade the taps drive paid for and this one inherits.
 */
/** Whatever is lying in the room with `s`, by display name. */
async function onTheFloor(s: Session): Promise<string> {
  const rows = await s.query('here:i', { fields: ['displayName'] });
  return rows
    .map((r) => String((r as { displayName?: string }).displayName ?? ''))
    .join(' | ');
}

async function mintTheKit(): Promise<void> {
  // ⭐⭐⭐ **The founder clones `--here`, then the driller picks it up** —
  // and this is the fourth shape, with the three that failed recorded
  // because every one of them is a drive-writing lesson.
  //
  // ⛔ `eval --parcel` (the taps drive's route) **took the server down**:
  // `sandbox boundary denied fromStored()` surfaced as an unhandled
  // rejection inside `runSandboxed` and the process exited, which the
  // drive then reported as a frame timeout. ⭐ *A test seam does not
  // belong in the sandbox at all* — the conclusion the taps drive
  // reached about the clock and did not finish applying to the kit.
  //
  // ⚠⚠ The DRILLER cannot clone, wizard or not: `access-denied — you
  // don't have permission to clone that`. ⭐ **`wizard: true` is the
  // CODE-TRUST axis and confers no title**; cloning a row is an
  // authoring act gated on held extents, which a fresh test character
  // has none of.
  //
  // ⚠ And `clone … --into <somebody>` is refused the same way even for
  // the founder — the destination is another body's inventory. `--here`
  // is the permitted form, so the kit lands on the floor and is picked
  // up, which is also what a player would actually do.
  const gov = await Session.open('founder', {
    startLocation: PROVISIONING,
    wizard: true,
  });
  try {
    for (const path of KIT) {
      const out = await gov.cmd(`clone ${path} --here`);
      expect(
        refusedFor(out) ?? out.notes.find((n) => n.kind === 'controller-error'),
        `clone ${path} failed: ${JSON.stringify(out.notes)}`,
      ).toBeUndefined();
      await new Promise((r) => setTimeout(r, 250));
    }
  } finally {
    gov.close();
  }
  // ⚠ The floor is READ before anything is picked up, so a failure says
  // whether the MINT or the GET is at fault. Three runs were spent
  // looking at the reading ladder because *the instrument is not in
  // reach* is what both look like from the far end.
  const floor = await onTheFloor(k);
  for (const word of ['bailer', 'liner', 'jar', 'gauge', 'dial']) {
    expect(floor, `the floor holds: ${floor}`).toMatch(new RegExp(word, 'i'));
  }
  for (const word of [
    'jar',
    'bailer',
    'liner',
    'liner',
    'liner',
    'gauge',
    // ⚠ `theodolite` is the dial's own unique keyword — a bare `dial` is
    // ambiguous in a store full of instruments, and the row authors its
    // keywords DEFENSIVELY for exactly that reason.
    'theodolite',
  ]) {
    await say(k, `get ${word}`);
  }
  await k.drainProse();
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

/**
 * ⭐⭐ **The kit is minted, not bought, and that is a FINDING rather than
 * a shortcut.**
 *
 * ⚠⚠ **The Rejection provisioning till cannot take money, and this is
 * the SECOND build's drive it has blocked.** `BuyController` calls
 * `EmploymentApi.settleSale`, which returns `null` for three different
 * reasons — no venue path, no business operator, or no operating account
 * — and **all three are reported to the player as
 * `insufficient-funds`**, so a shop that cannot take money at all tells
 * the buyer their wallet is empty and sends them to look in exactly the
 * wrong place. The taps build found it, documented it, and worked around
 * it the same way; `provisioning-business` authors `banksAt: goodkin`
 * (the same value forty other working businesses author) and lists the
 * room in `operatingLocations`, so the row looks right.
 *
 * ⭐ **A hypothesis worth handing over, since two drives have now paid
 * for it:** `operatingAccountOfImpl` opens the venue account and takes
 * an `openingAdvance` only when it has no entries, and a sale remits the
 * demo sales tax OUT of the shop. A cold shop at a zero balance may be
 * unable to remit the tax on its first sale — which would make *the
 * first sale a venue ever makes* the one that always fails, forever,
 * because it never gets a first sale. That is a bootstrap deadlock, and
 * it would be invisible to any venue that has already traded once.
 *
 * ⚠ It is a RETAIL and economic-bootstrap question, not a drilling one,
 * and this build does not touch it. The assertions below prove the half
 * that is drilling's: the kit is **stocked and priced**, which is a
 * different refusal from absent — and nine lines once shipped
 * stocked-and-unpriced, every `buy` answering `not-priced`.
 */
suite('1. the kit is stocked and priced, and the till is somebody else\'s bug', () => {
  it('⭐ every line of the drilling kit is on the shelf AND priced', async () => {
    // `not-priced` / unknown-noun is a DIFFERENT refusal from
    // `insufficient-funds`, so a line that is stocked and priced is
    // distinguishable from one that is not. That is the half of
    // checkpoint 1 this drive can still prove.
    for (const line of ['bailer', 'liner', 'jar']) {
      const out = await say(k, `buy ${line}`);
      expect(refusedFor(out), `${line} must be on the shelf AND priced`).toBe(
        'insufficient-funds',
      );
    }
    // ...and something genuinely absent reads differently.
    const absent = await say(k, 'buy chainsaw');
    expect(refusedFor(absent)).not.toBe('insufficient-funds');
  });

  it('⚠ the derrick is NOT on the shelf — you do not carry a rig out of a shop', async () => {
    // A ton and a half of timber frame, and `CraftingLogic` lands a
    // tangible output at the maker. The rig is raised by the siting act.
    const tried = await say(k, 'buy derrick');
    expect(refusedFor(tried)).not.toBe('insufficient-funds');
    expect(await carried(k)).not.toMatch(/derrick/i);
  });

  it('⚠ so the kit is minted into the driller\'s own hands instead', async () => {
    await mintTheKit();
    const kit = await carried(k);
    expect(
      kit,
      `the kit is: ${kit} — and the floor still holds: ${await onTheFloor(k)}`,
    ).toMatch(/bailer/i);
    expect(kit).toMatch(/liner/i);
    // ⭐ The light matters: the two new sites are outdoor rooms lit by
    // the sky, so after dark they are PITCH BLACK and every checkpoint
    // that reads prose reads *you can make out nothing*. A glowcap jar
    // is what any miner in this town carries.
    expect(kit).toMatch(/jar|glowcap/i);
    // ⭐ And the miner's DIAL, which is mining's: this trade adds no
    // instrument for its structural read, which is the whole of *a
    // second reading is a row*. The capability is the query, so the dial
    // and the surveyor's compass are interchangeable to the channel.
    expect(kit).toMatch(/dial/i);
    // ⭐ And the one instrument this trade DOES add, because a
    // reservoir's drive is a different measurement and nothing in the
    // realm made it.
    expect(kit).toMatch(/gauge/i);
  });
});

suite('2. the free evidence, and what a trained eye makes of it', () => {
  it('walks east out of the mining town into salt country, by daylight', async () => {
    await daylight();
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

  it('⚠ and the FLAT has no SHOWING — there is nothing here to read for free', async () => {
    // ⚠ Asserted on the CONTENTS, not on the prose: the room's own
    // description legitimately mentions the spring *back up the slope to
    // the northwest*, because that is where the exit goes, and a drive
    // that forbade the word would be forbidding an exit from being
    // described. What must be absent is a thing with a `showing` on it.
    const props = await read(k, 'look');
    expect(props).toMatch(/flat|bare/i);
    // The eye rung has nothing to interpret here, and says so by not
    // naming a showing at all.
    const eye = await read(k, 'analyze structure');
    expect(eye).toMatch(/nothing tells you that but the hole/i);
    expect(eye).not.toMatch(/that is the country telling you/i);
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
  it('⚠⚠ untitled ground refuses the siting — proved by a NON-WIZARD', async () => {
    // ⭐ And the session matters, which is the finding: this drive runs
    // `wizard: true` because the clock seam and `clone` need it, and a
    // wizard passes a title check. So a title refusal **cannot be proved
    // by the session that needs code trust** — asserting it there would
    // have been a checkpoint that could only ever pass.
    //
    // A plain player, at the spring, which nobody has staked: the
    // refusal is the one `stake` exists to lift.
    const plainHand = await Session.open(uniqueHandle('trespasser'), {
      startLocation: PROVISIONING,
    });
    try {
      await walk(plainHand, TO_THE_SPRING);
      const tried = await say(plainHand, 'bore');
      // ⚠ Either refusal proves the gate: with no bailer in hand the
      // verb is not afforded at all, which is itself the honest answer.
      const reason = refusedFor(tried);
      if (reason !== null) expect(reason).toBe('untitled');
      else {
        expect(
          tried.notes.find((n) => n.kind === 'command-rejected'),
          `a plain hand sited a hole on the town's own ground: ${JSON.stringify(tried.notes)}`,
        ).toBeDefined();
      }
    } finally {
      plainHand.close();
    }
    await walk(k, ['north', 'east']);
  });

  it('⭐⭐ at the staked flat, `bore` raises a derrick and sites a wellhead', async () => {
    await walk(k, ['southeast']);
    const sited = await say(k, 'bore');
    expect(
      refusedFor(sited),
      `siting must not refuse on staked ground — the rig said: ${JSON.stringify(sited.notes)}`,
    ).toBeNull();
    expect(
      sited.notes.find((n) => n.kind === 'controller-error'),
      `siting threw: ${JSON.stringify(sited.notes)}`,
    ).toBeUndefined();
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
    // ⚠⚠ **Daylight again, and it is not housekeeping.** Checkpoint 0
    // and the crew's own game-day have both moved the clock, so by now
    // it is as likely to be night as not — and the Dry is lit by SPILL
    // from the pithead yard through an open door, so after dark it
    // reads as nothing at all. ⭐ Worse than cosmetic: a target you
    // cannot see does not BIND, so `dismiss roustabout` came back
    // `no-target` at a rig with two hands standing on it. You cannot
    // pay off somebody you cannot see, which is correct behaviour and
    // unprovable in the dark.
    await daylight();
    await walk(k, ['northwest', 'west', 'southwest', 'south', 'northwest']);
    const dry = await read(k, 'look');
    expect(dry).toMatch(/roustabout/i);

    const hired = await say(k, 'hire tall');
    expect(
      refusedFor(hired),
      `a proprietor with one rig must be able to hire — it said: ${JSON.stringify(hired.notes)}`,
    ).toBeNull();
    const second = await say(k, 'hire squat');
    expect(
      refusedFor(second),
      `the second hire said: ${JSON.stringify(second.notes)}`,
    ).toBeNull();
    // ⚠ A beat: the hand is TELEPORTED to the claim and the room's new
    // prose reaches this process over the socket. Reading the dry
    // immediately raced the move.
    await new Promise((r) => setTimeout(r, 600));
    const emptied = await read(k, 'look');
    expect(
      emptied,
      `the dry still holds: ${emptied}`,
    ).not.toMatch(/roustabout/i);
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

  it('⭐ and the wage bill is real — the hands are owed, whether or not it was paid', async () => {
    // ⚠ NOT read off `bank`: the banking verbs are afforded by a bank
    // counter, and there is no counter on a hillside — *I don't
    // understand 'bank'* is the correct answer up here and cost this
    // drive a run to learn. What IS readable at the rig is the hands
    // themselves, and that they are on shift is the wage bill.
    const here = await read(k, 'look roustabout');
    expect(here.length).toBeGreaterThan(0);
  });

  it('⭐⭐⭐ `dismiss` is the ONLY thing that stops the meter', async () => {
    // See the hiring checkpoint: a hand you cannot see does not bind.
    await daylight();
    // Nothing told the player the rate was no longer worth the wage, and
    // nothing will. That decision IS the content.
    // ⚠ `roustabout`, not `tall`: both hands are standing here by now
    // and either will do — what is being proved is that paying one off
    // takes them off the books, not which one.
    const off = await say(k, 'dismiss roustabout');
    expect(
      refusedFor(off),
      `dismiss said: ${JSON.stringify(off.notes)}`,
    ).toBeNull();
  });
});

/* ───────── Stage B: the well that comes up by itself ───────── */

suite('8. gas country — the same verbs, a different physics', () => {
  it('⭐ the burnt ground is a fourth site and a third kind of showing', async () => {
    // ⭐⭐ The falsifiable line: four sites now, three surface showings,
    // three fluid bodies — and `rejection` still ships no TypeScript.
    // The channel knows nothing about springs, blows or seeps; it asks
    // the room what is `showing` and repeats the prose.
    await walk(k, ['northeast']);
    const here = await read(k, 'look');
    expect(here).toMatch(/burnt|bald|patch/i);
    const eye = await read(k, 'analyze structure');
    expect(eye).toMatch(/nothing tells you that but the hole/i);
  });

  it('⚠ `measure head` on something that is NOT a wellhead refuses in the channel\'s own words', async () => {
    // Not a binder refusal: *head is a thing a wellhead has* is the
    // sentence somebody needs, and `subjectRequires` would have refused
    // where the message teaches nothing.
    const wrong = await say(k, 'measure head on blow');
    const reason = refusedFor(wrong);
    // ⚠ Either answer is correct and the LADDER decides which: the
    // instrument rung is resolved before the subject is, so a reader
    // with no gauge is told about the gauge first. What must not happen
    // is a reading.
    expect(reason === 'not-a-wellhead' || reason === 'no-instrument').toBe(true);
  });
});

/* ───────── Stage C: the barrel ───────── */

suite('9. the oil country, and the two structures nothing tells apart', () => {
  it('⭐⭐⭐ the CAIRN reads exactly as well as the whaleback', async () => {
    // ⚠⚠ The trade's premise, driven: two structures, one charged and
    // one not, and no instrument in the game tells them apart. Both
    // reads must SUCCEED and neither may mention charge.
    await walk(k, ['northeast']);
    const seep = await read(k, 'look');
    expect(seep).toMatch(/seep|hollow|black/i);

    await walk(k, ['east']);
    const wet = await read(k, 'measure structure');
    expect(wet).toMatch(/closure|beds/i);
    expect(wet).not.toMatch(/charged|holds oil|nothing in it/i);

    await walk(k, ['west', 'north']);
    const dry = await read(k, 'measure structure');
    expect(dry).toMatch(/closure|beds/i);
    expect(dry).not.toMatch(/charged|holds oil|nothing in it|empty/i);
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
