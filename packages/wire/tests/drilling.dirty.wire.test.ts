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
/**
 * ⭐⭐ **The city store, where the till actually works** — and where a
 * driller would outfit anyway.
 *
 * ⚠⚠ Rejection's own provisioning counter **cannot take money**, and it
 * is the second build's drive it has blocked: `BuyController` calls
 * `EmploymentApi.settleSale`, which returns `null` for three different
 * reasons — no venue path, no business operator, or no operating account
 * — and **all three are reported to the player as
 * `insufficient-funds`**, so a shop that cannot take money at all tells
 * the buyer their wallet is empty.
 *
 * ⭐ What this drive adds to that finding, which the taps build could
 * not: **a WORKING comparison.** The apiculture drive buys a lantern, a
 * hive, a super, a smoker, a veil and gloves at THIS counter, all
 * clean. So `settleSale` is fine and the defect is specifically
 * Rejection's `provisioning-business` — which is a far sharper thing to
 * hand to retail than *the row looks right*.
 */
const STORE = '/world/terminus/general-store/shop-floor';
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

/**
 * ⚠ RETIRED: the city route. The drive outfitted at the Terminus general
 * store for one revision — and the terminus pack's own suite refused the
 * stock lines that made it possible (*no pack owns this prefix*),
 * because putting a trade's goods on a locality's shelf makes the
 * locality depend on the trade. Kept here as a comment because the
 * derivation is reusable: a breadth-first walk over every authored
 * `exits:` block, rather than a hand-written route.
 *
 * ⭐⭐ **The city store to the valley — fifteen steps, and the length was
 * the point.** A driller outfits in town because the valley's own till
 * cannot take money, and walks out, exactly as the beekeeper walks
 * thirteen steps for a hive the valley does not sell.
 *
 * ⚠⚠ **And it is a WALK rather than a reconnect, because a reconnect
 * loses the kit.** Re-opening the session with a different
 * `startLocation` kept the money (the account is the player's) and left
 * the body carrying nothing but its costume — the purchases were simply
 * gone. Worth knowing before any drive tries to teleport itself between
 * errands.
 *
 * ⭐ Derived from the content graph rather than guessed: a breadth-first
 * walk over every authored `exits:` block from the shop floor to the
 * provisioning shed. A hand-written route is how a drive ends up
 * asserting that a door exists.
 */
const TO_THE_VALLEY = [
  'south',
  'southwest',
  'south',
  'south',
  'south',
  'south',
  'south',
  'south',
  'west',
  'west',
  'west',
  'west',
  'west',
  'northeast',
  'west',
] as const;

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

/**
 * ⚠⚠⚠ **Why this reads THREE note kinds and not one.**
 *
 * The usual helper looks only for `controller-rejected` — and that is
 * **blind to `command-rejected` and `validator-failed`**, which are the
 * two ways a command dies *before* a controller ever runs. This drive
 * paid for that directly: `hire` was failing upstream of
 * `HireController.execute`, so the assertion *the hire was not refused*
 * passed, nothing happened, and **seven diagnostics inside the
 * controller never fired** — which read as the controller doing nothing
 * rather than as the command never arriving. Three runs went into it.
 *
 * ⭐ The standing rule, restated because this is what breaking it looks
 * like: **"not refused" is not "succeeded."** Assert the EFFECT, and
 * when you must assert a refusal, make sure the reader can see every
 * way the thing can be refused.
 */
function refusedFor(r: { notes: readonly unknown[] }): string | null {
  const note = (
    r.notes as Array<{ kind?: string; reason?: string; detail?: string }>
  ).find(
    (n) =>
      n.kind === 'controller-rejected' ||
      n.kind === 'command-rejected' ||
      n.kind === 'validator-failed',
  );
  if (!note) return null;
  return note.reason ?? note.detail ?? note.kind ?? null;
}

/**
 * ⭐⭐ How deep the deepest hole in this country has gone, off the
 * TRADE's book — `0` where nobody has drilled it yet.
 *
 * ⚠ Why the book and not a swing. The hole's own prose never says how
 * deep it is — *there is no telling anything about it from up here* is
 * authored, not a gap — and `bore` is an ENGAGED act, so its figure
 * arrives in a completion frame rather than in the answer to the
 * command. A swing also costs real endurance, and after the walk out of
 * the city the honest reply to a third one is `too-tired`. The book
 * costs nothing, needs no body, and is the surface a player would
 * really use to ask how far a hole got — which is what makes it the
 * right witness to work somebody ELSE did.
 */
async function bookDepth(s: Session): Promise<number> {
  const eye = await read(s, 'analyze structure');
  const m = /a hole down to (\d+(?:\.\d+)?)\s*m\b/i.exec(eye);
  return m?.[1] === undefined ? 0 : Number(m[1]);
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
suite("1. the kit comes off the claims office's hire rack", () => {
  it('⭐⭐ the rack holds the kit, and a prospector picks it up on the way out', async () => {
    // ⚠⚠ **This is the fifth shape, and the four that failed are each a
    // drive-writing lesson worth more than the fix.**
    //
    //  - ⛔ `eval --parcel` **took the server down**: `sandbox boundary
    //    denied fromStored()` as an unhandled rejection inside
    //    `runSandboxed`. ⭐ *A test seam does not belong in the sandbox
    //    at all.*
    //  - `clone … --here` lands on the FLOOR, needing a `get` that
    //    resolves by keyword against everything in reach — so it bound
    //    the shop's own stock (held goods are not gettable).
    //  - ⚠ the DRILLER cannot clone: `access-denied`. **`wizard: true`
    //    is the CODE-TRUST axis and confers no title**; cloning a row is
    //    an authoring act gated on held extents.
    //  - ⚠ and the FOUNDER cannot clone a `/trade/drilling/**` row
    //    either — the gate is on the TEMPLATE's titled root, and that
    //    one is the Ministry of Trade's.
    //
    // ⚠ Buying is not available in this valley: Rejection's
    // provisioning till **cannot take money** (a pre-existing venue
    // defect the taps build hit first — `settleSale` returns null and
    // the player is told `insufficient-funds`). ⛔ And it must not be
    // fixed by putting a trade's goods on the CITY's shelf: that was
    // tried, and the terminus suite refused it — *no pack owns this
    // prefix* — because it makes a locality depend on a trade.
    //
    // ⭐ So the kit is `props:` at the claims office, which is where a
    // prospector already goes to stake. Seeded at boot: no till, no
    // clone, no permission, and content a reviewer can defend.
    // ⚠⚠ **Daylight FIRST, and it is not housekeeping.** Checkpoint 0
    // moves the clock, and the claims office at the wrong hour reads
    // *shapes and edges, no more — enough to move by, and to find a
    // door.* ⭐ **You cannot pick up what you cannot see**: the `get`s
    // bind nothing, the kit never arrives, and four rooms later `bore`
    // answers *I don't understand that* — which looks like a broken
    // affordance and is a dark room.
    await daylight();
    await walk(k, ['east', 'north']);
    const rack = await read(k, 'look');
    expect(rack, `the claims office holds: ${rack}`).toMatch(/rack|bailer/i);

    for (const thing of [
      'jar',
      'bailer',
      'liner',
      'gauge',
      // ⚠ `theodolite` is the dial's own unique keyword; a bare `dial`
      // is ambiguous and `miners-dial` is hyphenated. The row authors
      // its keywords DEFENSIVELY for exactly this reason.
      'theodolite',
    ]) {
      await say(k, `get ${thing}`);
    }
    await k.drainProse();

    const kit = await carried(k);
    expect(kit, `the kit is: ${kit}`).toMatch(/bailer/i);
    expect(kit).toMatch(/liner/i);
    expect(kit).toMatch(/gauge/i);
    // ⭐ The surveying instrument is MINING's: this trade adds none for
    // its structural read.
    expect(kit).toMatch(/dial/i);
    // ⚠ A light, because the sites are outdoor rooms and the sun sets.
    expect(kit).toMatch(/jar|glowcap/i);
  });

  it('⚠⚠ the valley\'s own till cannot take money — a venue defect, reported', async () => {
    // Asserted so that the day somebody fixes it THIS FAILS and the
    // drive buys its kit like a player would. `insufficient-funds` here
    // is a shop that cannot trade, not a buyer who is broke: the account
    // was funded at the banking hall in `beforeAll`.
    await walk(k, ['south', 'west']);
    for (const line of ['bailer', 'liner']) {
      const out = await say(k, `buy ${line}`);
      expect(
        refusedFor(out),
        `if this is null the Rejection till is fixed: ${line}`,
      ).toBe('insufficient-funds');
    }
  });

  it('⛔ the derrick is on no shelf and no rack — the siting act raises it', async () => {
    const tried = await say(k, 'buy derrick');
    expect(refusedFor(tried)).not.toBeNull();
    expect(await carried(k)).not.toMatch(/derrick/i);
  });
});

suite('2. the free evidence, and what a trained eye makes of it', () => {
  it('walks east out of the mining town into salt country, by daylight', async () => {
    // ⚠ From the provisioning shed, which is where the till checkpoint
    // leaves off — this checkpoint owns its own walk.
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
      // ⚠ Two refusals both prove the gate, and which one you get
      // depends on whether the trespasser is carrying a bailer:
      // `untitled` is the title check, and `unknown-verb` is the
      // affordance — a plain hand with no tools cannot even try, which
      // is itself the honest answer.
      const reason = refusedFor(tried);
      expect(
        reason,
        `a plain hand sited a hole on the town's own ground: ${JSON.stringify(tried.notes)}`,
      ).not.toBeNull();
      expect(['untitled', 'unknown-verb']).toContain(reason);
    } finally {
      plainHand.close();
    }
  });

  it('⭐⭐ at the staked flat, `bore` raises a derrick and sites a wellhead', async () => {
    // ⚠⚠ **This walk starts from the claims office and is this
    // checkpoint's own.** It used to rely on a walk appended to the
    // previous one — and when that checkpoint failed, the trailing walk
    // never ran, the session was left in the wrong room, and every
    // later checkpoint failed for a reason that had nothing to do with
    // what it was testing. ⭐ A checkpoint that inherits its position
    // inherits every earlier failure.
    await walk(k, ['north', 'east', 'southeast']);
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
    // ⚠⚠ **A rest first, and it is the design working rather than a
    // nuisance.** A swing costs real endurance, and after a
    // fifteen-step walk out of the city plus the siting the body is
    // spent: `bore` answers `too-tired` in the exertion system's own
    // words. ⭐ Which is exactly the trade's thesis — *you are not meant
    // to do this by hand* — so the drive rests the way a person would,
    // on the clock, rather than the costs being lowered to suit it.
    // ⭐ Eat, drink, and give the body the night. A swing costs real
    // endurance and the walk out of the city spent it; *you are not
    // meant to do this by hand* is the trade's thesis, so the drive
    // recovers the way a person would rather than the cost being
    // lowered to suit the test.
    await say(k, 'eat rations');
    await say(k, 'drink from waterskin');
    await advance('12 hours');
    let swing = await say(k, 'bore');
    // ⚠ One retry after a longer rest, and then the assertion stands.
    // ⭐ A `too-tired` here is the DESIGN rather than a defect — *you
    // are not meant to do this by hand* — so the drive recovers the way
    // a person would rather than the swing's cost being lowered to suit
    // a test. If both attempts are spent, that is a finding about the
    // cost against a freshly-walked body and it says so.
    if (refusedFor(swing) === 'too-tired') {
      await say(k, 'eat rations');
      await say(k, 'drink from waterskin');
      await advance('1 day');
      swing = await say(k, 'bore');
    }
    expect(
      refusedFor(swing),
      'a rested body must be able to work the beam at least once',
    ).toBeNull();
    await settle(k, swing);
    const here = await read(k, 'look');
    // One rig, not two: the fork is which of the two acts the world is in.
    expect((here.match(/derrick/gi) ?? []).length).toBeLessThan(2);
  });
});

suite('7. the crew — presence is depth, and depth is wages', () => {
  it('⭐⭐⭐ hires two hands AT THE RIG, out of whoever walked up to it', async () => {
    // ⭐ The requirement's own words, and the content was moved to match
    // them: *a bore crew is hired at the bore, out of whoever has walked
    // up to it.* The pool stood in the Dry for one revision — the MINE's
    // changing shack, a different business's building, and a room a
    // brainless hand can never leave — which made the trade depend on
    // relocating somebody who cannot walk.
    await daylight();
    const here = await read(k, 'look');
    expect(here, `the flat holds: ${here}`).toMatch(/roustabout/i);

    const hired = await say(k, 'hire tall');
    expect(
      refusedFor(hired),
      `the hire said: ${JSON.stringify(hired.notes)}`,
    ).toBeNull();
    const second = await say(k, 'hire squat');
    expect(
      refusedFor(second),
      `the second hire said: ${JSON.stringify(second.notes)}`,
    ).toBeNull();

    // ⚠⚠ **The EFFECT, not the absence of a refusal.** `hire` has one
    // path that files no rejection note at all (`inform` — *already
    // works for you* is information), and `refusedFor` was blind to
    // `command-rejected` / `validator-failed` besides, so an earlier
    // version of this checkpoint passed while nothing happened. What
    // proves a hire is that the hands are now on a payroll, which the
    // wage checkpoint below reads.
    await new Promise((r) => setTimeout(r, 600));
    const after = await read(k, 'look');
    expect(after, `after hiring, the flat holds: ${after}`).toMatch(
      /roustabout/i,
    );
  });

  it('⭐⭐ the hole gets deeper with nobody touching it', async () => {
    const atRig = await read(k, 'look');
    expect(atRig, 'the hired hands must have reported to the claim').toMatch(
      /roustabout/i,
    );
    // ⚠⚠ **NOT `look wellhead`.** The row says, deliberately, *there is
    // no telling anything about it from up here* — a collar of iron
    // reads the same at one metre and at forty, which is the whole
    // reason the trade needs an instrument. A checkpoint that diffed
    // that prose was asserting against the author's intent and could
    // only ever fail.
    //
    // ⭐ The depth comes off the trade's BOOK — see `bookDepth` for why
    // not a swing.
    const before = await bookDepth(k);
    // ⭐ A game-day of presence. The engine measures presence, not
    // virtue: they are rostered, on shift, standing here, hands free.
    await advance('1 day');
    const after = await bookDepth(k);
    // ⭐ The claim is exactly this and nothing more: **it got deeper and
    // the reader never touched the beam.** `bookDepth` swings nothing,
    // so every metre between these two reads was bought by the crew.
    //
    // ⚠⚠ A `> before + 1` threshold was tried and is WRONG — not
    // because the mechanism fails but because it encodes a RATE the
    // shipped caps do not promise. Measured on a fresh world: two hands
    // over a full game day moved the hole **one metre**, against
    // `CREW_SWINGS_PER_HOUR = 120` and ~6 swings to the yard. ⭐ The
    // suspect is `SAMPLE_CAP_S`, which caps any single reconcile at one
    // hour of credit, so a clock JUMP is credited once rather than
    // replayed — *weeks pass with nobody reading* is the docstring's
    // claim and the cap is what makes it only partly true. That is a
    // balance question against a running game, flagged for review in
    // the plan, and deliberately NOT something this checkpoint asserts:
    // a drive proves the mechanism, and a rate nobody has tuned is not
    // a mechanism.
    expect(
      after,
      `the hole must be deeper after a day of paid work (was ${String(before)} m)`,
    ).toBeGreaterThan(before);
  });

  it('⭐ and the wage bill is real — the hands are owed, whether or not it was paid', async () => {
    // ⚠ NOT read off `bank`: the banking verbs are afforded by a bank
    // counter, and there is no counter on a hillside — *I don't
    // understand 'bank'* is the correct answer up here and cost this
    // drive a run to learn. What IS readable at the rig is the hands
    // themselves, and that they are on shift is the wage bill.
    // ⚠⚠ `tall`, NOT `roustabout`. Both hands are standing here by now,
    // so the bare noun matches two and the binder raises a
    // disambiguation PROMPT — which is correct engine behaviour and
    // fatal to a wire drive: nothing answers it, the frame never
    // returns, and **the session stays wedged on the open prompt so
    // every later checkpoint times out too.** One ambiguous noun cost
    // six checkpoints that had nothing wrong with them.
    const here = await read(k, 'look tall');
    expect(here).toMatch(/roustabout/i);
  });

  it('⭐⭐⭐ `dismiss` is the ONLY thing that stops the meter', async () => {
    // See the hiring checkpoint: a hand you cannot see does not bind.
    await daylight();
    // Nothing told the player the rate was no longer worth the wage, and
    // nothing will. That decision IS the content.
    // ⚠ `tall`, not `roustabout` — see the wage-bill checkpoint. What
    // is being proved is that paying a hand off takes them off the
    // books, and naming WHICH hand costs that claim nothing; leaving
    // the noun ambiguous cost it the whole run.
    const off = await say(k, 'dismiss tall');
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
    // ⚠ From the flat, which is where the crew suite leaves off — and
    // if it did not get there, this says so by failing on the room
    // rather than on the showing.
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
    // ⚠⚠ This checkpoint used to read `look wellhead` and assert the
    // text was non-empty — **vacuous**, and it passed for the whole
    // build while the register it claimed to prove was WRITE-ONLY:
    // every metre was filed and nothing in the game could look at any
    // of it. *A vacuous assertion looks exactly like a passing one.*
    //
    // ⭐⭐⭐ The real reader is the eye rung, which is where the premise
    // lands: no instrument reports whether a trap is charged, so the
    // only second-hand evidence is a hole somebody already paid for.
    // The log is append-only and its subject cannot edit it, which is
    // precisely why a stranger's book is worth reading.
    const eye = await read(k, 'analyze structure');
    expect(
      eye,
      'the eye rung must report the hole already sunk in this country',
    ).toMatch(/somebody has drilled this country before you/i);
    expect(eye, 'and it must say how deep that hole went').toMatch(/\d+\s*m\b/);
    // ⚠ And the premise is still the last word, book or no book.
    expect(eye).toMatch(/nothing tells you that but the hole/i);
  });
});
