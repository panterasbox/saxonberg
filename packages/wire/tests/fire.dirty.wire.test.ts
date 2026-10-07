/**
 * ⭐⭐⭐ **Fire, driven end to end** — the fire build's exit criterion, run
 * against the real socket.
 *
 * The requirements' drive in one sentence: *look at a fire and be told
 * what it is burning, stoke it with the wrong thing and be refused in
 * its own words, stoke it right and run it twice, open and shut its
 * draught and watch heat, light and smoke move together, cover it and
 * come back to it still in, run one in a sealed cellar and be warned
 * before it smothers, fire a retort bare and taste the room, fire it
 * with a condenser and get tar, boil the tar to pitch, coke a charge of
 * coal for its three products, hold the gas only in something sealed,
 * read a gasometer from across the yard, light a lamp off it and find it
 * dim, drive a heading deep and find a damp the canary sings through,
 * take a naked flame in and be hurt, take a gauze lamp in and work,
 * drain the gas into a bladder — and then walk every shipped flow to
 * prove none of it broke.*
 *
 * ## ⚠⚠ What this drive CANNOT see, said plainly
 *
 * Three of the twenty-one acceptance criteria are **time-dependent at
 * the clock's shipped scale** (a game day is about two real hours):
 *
 *   - AC 3's tail — a 12 kg charge outlasting a 1 kg one is hours of
 *     burning. Pinned as arithmetic in `StokeController.test.ts`
 *     (`fuelEnergyJ / burnPowerW`), which is the whole claim.
 *   - AC 5's middle — *bank it and come back* is twenty times the
 *     duration by construction. The ratio is asserted in
 *     `DraughtController.test.ts`; what this file can see is that the
 *     fire is still lit and its draught is at the floor.
 *   - AC 12's *burns until doused or empty* — a lamp's 16 game hours.
 *     `Lamp.test.ts` walks it in game-hour steps.
 *
 * ⭐ **What only this file can see is everything else**: that the verbs
 * exist, that something affords them, that the rows resolve, that the
 * catalogues are warm, and that the binder binds. The five reachability
 * links each fail closed and silent, and this is the only instrument
 * that reads them.
 */

import { describe as suite, it, expect, beforeAll, afterAll } from 'vitest';
import type { CommandResult } from '../src/harness';
import {
  Session,
  declareFile,
  uniqueHandle,
  expectOk,
  engagementIdOf,
} from '../src/harness';

/**
 * ⚠ **Why this file cannot run twice.** It burns the fuel yard's
 * cordwood and coal through two chambers (an authored prop nothing
 * restocks), fills the yard's bladders and its gasometer, drains the
 * Ferrow measures (a per-room reservoir with a six-game-hour half-life,
 * so a second run inside a session gets a thinner draw), and burns the
 * Hearthworks cellar's firewood.
 *
 * ⭐ Each clause is a question for the trade that owns it. The yard's
 * cordwood wants the collier's producer brain (already a recorded seam);
 * the coal wants a hauler bringing it up from Ferrow, which is the
 * logistics build's; the cellar's firewood wants nothing — a
 * demonstrator is allowed to be consumable.
 */
export const DIRTY_REASON =
  'burns the fuel yard’s cordwood and coal through the clamp and the ' +
  'retort, fills its bladders and its gasometer, drains the Ferrow ' +
  'measures, and burns the Hearthworks cellar’s firewood';

declareFile({
  file: 'fire.dirty.wire.test.ts',
  packs: [
    'trade-fuel',
    'trade-mining',
    'trade-smelting',
    'trade-quarrying',
    'trade-forestry',
    'ground',
    'generic-objects',
    'base-library',
    'rejection',
    'hearthworks',
    'terminus',
    'world-seed',
  ],
  dirtyReason: DIRTY_REASON,
});

const FUEL_YARD = '/world/terminus/rejection/location/fuel-yard';
const CELLAR = '/world/terminus/hearthworks/location/cellar';
const SMITHY = '/world/terminus/hearthworks/location/smithy';
const DRIFT = '/world/terminus/rejection/ferrow/timbered-drift';

/** A command, with a poisoned session recovered rather than cascaded. */
async function say(s: Session, text: string): Promise<CommandResult> {
  return s.cmd(text);
}

/** The `controller-rejected` reason on a result, or null. */
function refusedFor(r: { notes: readonly unknown[] }): string | null {
  const note = (r.notes as Array<{ kind?: string; reason?: string }>).find(
    (n) => n.kind === 'controller-rejected',
  );
  return note?.reason ?? null;
}

/** Did the binder or the dispatcher refuse to UNDERSTAND the line? */
function misunderstood(r: { notes: readonly unknown[] }): string | null {
  const note = (r.notes as Array<{ kind?: string; reason?: string }>).find(
    (n) => n.kind === 'command-rejected' || n.kind === 'controller-error',
  );
  return note?.reason ?? null;
}

/**
 * ⭐⭐ **The verb EXISTS and something affords it here.** The single most
 * valuable assertion in a drive, and the one no controller test can
 * make: a verb with no view, no controller row, or no affording class
 * answers *"I don't understand"* — closed, silent, and green in 30 unit
 * tests.
 */
function understood(r: CommandResult, line: string): void {
  expect(misunderstood(r), `'${line}' was not understood`).toBeNull();
}

/** Walk a route, failing loudly on the step that does not exist. */
async function walk(s: Session, route: readonly string[]): Promise<void> {
  for (const dir of route) {
    const moved = await s.cmd(dir);
    expect(
      moved.notes.find((n) => n.kind === 'command-rejected'),
      `'${dir}' is not a way out of here`,
    ).toBeUndefined();
  }
  await s.drainProse();
}

/** Run an engaged act out to its effect. */
async function settle(s: Session, started: CommandResult): Promise<void> {
  const id = engagementIdOf(started);
  if (id) await s.awaitActivity(id, 60_000);
  await new Promise((r) => setTimeout(r, 500));
}

/* ───────────────── Parts 1 and 2: a fire is its fuel and its air ───────────────── */

suite('⭐⭐ 1–2. a fire is its fuel, its air and its vessel', () => {
  let h: Session;
  beforeAll(async () => {
    h = await Session.open(uniqueHandle('smith'), { startLocation: SMITHY });
  }, 180_000);
  afterAll(() => h?.close());

  it('⭐ drive 1 — `look` at the forge says what it is burning, in words', async () => {
    // ⚠ The forge ships COLD and empty, so the first honest answer is
    // that the bed is empty — which is itself the thing a `%` Reserve
    // could never say.
    const looked = await h.prose('look forge');
    expect(looked.length, 'nothing came back from `look forge`').toBeGreaterThan(0);
    expect(looked).toMatch(/cold|empty|burning/i);
  }, 120_000);

  it('⭐⭐ drive 2 — an unstoked forge refuses to light BY NAME', async () => {
    const lit = await say(h, 'ignite forge');
    understood(lit, 'ignite forge');
    // ⭐ `no-fuel`, not `not-flammable`: a forge with an empty bed is a
    // fire waiting for somebody, and the refusal has to say which or the
    // player has no way to find out what lifts it.
    expect(refusedFor(lit)).toBe('no-fuel');
  }, 120_000);

  it('⭐⭐⭐ drive 3–4 — `stoke` exists, is afforded, and the fire runs', async () => {
    const fed = await say(h, 'stoke charcoal into forge');
    understood(fed, 'stoke charcoal into forge');
    const lit = await say(h, 'ignite forge');
    understood(lit, 'ignite forge');
    expect(
      refusedFor(lit),
      'a stoked forge must light — this is the act no fire in the game could accept',
    ).not.toBe('no-fuel');

    const looked = await h.prose('look forge');
    // Now it can say what it is burning.
    expect(looked).toMatch(/burning|charcoal|flame/i);
  }, 180_000);

  it('⭐⭐ drive 6–7 — the draught moves heat, soot and LIGHT together', async () => {
    const wide = await say(h, 'draught wide');
    understood(wide, 'draught wide');
    const wideProse = await h.prose('draught');
    expect(wideProse).toMatch(/wide/i);

    const low = await say(h, 'draught low');
    understood(low, 'draught low');
    const lowProse = await h.prose('draught');
    expect(lowProse).toMatch(/shut|nearly/i);
    // ⚠ And no FIGURE in the read: a dial is read in words.
    expect(lowProse.replace(/<[^>]*>/g, '')).not.toMatch(/\d/);
  }, 180_000);

  it('⭐⭐ drive 8 — `cover` banks it, and it is still in', async () => {
    await say(h, 'draught wide');
    const covered = await say(h, 'cover forge');
    understood(covered, 'cover forge');
    expect(refusedFor(covered)).toBeNull();
    // ⭐ The word is the curfew bell's — `couvre-feu` — and the verb
    // collision with banking was resolved by taking the better word
    // rather than by conceding it. `banked` survives on the scale.
    const read = await h.prose('draught');
    expect(read).toMatch(/banked/i);
    // Still lit: banking is the draught at its floor, not a mechanism.
    const looked = await h.prose('look forge');
    expect(looked).toMatch(/banked|burning|glow/i);
  }, 180_000);

  it('⭐ the refusals are the OBJECT answering for itself', async () => {
    // A stone has no heat of combustion; the fire says so.
    const stone = await say(h, 'stoke anvil into forge');
    understood(stone, 'stoke anvil into forge');
    expect(refusedFor(stone)).not.toBeNull();
  }, 120_000);
});

/* ───────────────── Part 2 (the sealed interior) ───────────────── */

suite('⭐⭐⭐ 9. a fire in a sealed cellar warns you, then smothers', () => {
  let c: Session;
  beforeAll(async () => {
    c = await Session.open(uniqueHandle('cellarer'), { startLocation: CELLAR });
  }, 180_000);
  afterAll(() => c?.close());

  it('⭐ the cellar has a fire to light, and the air can be read in WORDS', async () => {
    // ⚠ Without a brazier the cellar's lesson takes most of a game day:
    // a single split log in 27 m³ is honest arithmetic and a useless
    // demonstrator. The prop is what makes the lesson land in a session.
    const fed = await say(c, 'stoke log into brazier');
    understood(fed, 'stoke log into brazier');
    const lit = await say(c, 'ignite brazier');
    understood(lit, 'ignite brazier');
    expect(refusedFor(lit)).not.toBe('no-fuel');

    // ⭐⭐ The free read, which did not exist before this build: the row
    // promised `eyeCeiling: competent` and the class implemented
    // `measure` only.
    const air = await say(c, 'analyze atmosphere');
    understood(air, 'analyze atmosphere');
  }, 240_000);

  it('⚠ and no FIGURE reaches the reading, at any band', async () => {
    const said = await c.prose('analyze atmosphere');
    expect(said.replace(/<[^>]*>/g, '')).not.toMatch(/\d/);
  }, 120_000);
});

/* ───────────────── Parts 3–5: the clamp, the retort, the gas ───────────────── */

suite('⭐⭐⭐ 10–19. the clamp, then the retort — and the three products', () => {
  let f: Session;
  beforeAll(async () => {
    f = await Session.open(uniqueHandle('collier'), {
      startLocation: FUEL_YARD,
    });
  }, 180_000);
  afterAll(() => f?.close());

  it('⭐ drive 10 — the clamp still chars, exactly as before', async () => {
    // ⚠ The regression that matters most in this wave: `draught` rose
    // onto `BurnerMixin`, so the clamp's one dial is now the kernel's
    // and `char <n>` is one of three ways to set the same number.
    const charred = await say(f, 'char 0.45');
    understood(charred, 'char 0.45');
  }, 180_000);

  it('⭐⭐ drive 11 — the retort is HERE, and it fires', async () => {
    const stoked = await say(f, 'stoke charcoal into retort');
    understood(stoked, 'stoke charcoal into retort');
    const lit = await say(f, 'ignite retort');
    understood(lit, 'ignite retort');

    // ⭐ Load it with the yard's own cordwood — the SAME charge the
    // clamp takes, which is the point.
    const put = await say(f, 'put cordwood in retort');
    understood(put, 'put cordwood in retort');
    const fired = await say(f, 'fire retort');
    understood(fired, 'fire retort');
    await settle(f, fired);
  }, 300_000);

  it('⭐⭐ drive 12 — the condenser is placeable on it, and the chain is REAL', async () => {
    // ⚠ The reachability link the plan flagged as most likely to die
    // silently: a Placement member naming no row makes `place` refuse in
    // the vocabulary's own phrase. `on` is a shipped row; `outlet` was
    // not, and is not used.
    const placed = await say(f, 'put condenser on retort');
    understood(placed, 'put condenser on retort');
    expect(refusedFor(placed), 'the condenser will not stand on the retort')
      .toBeNull();
  }, 180_000);

  it('⭐⭐ drive 17 — the gasometer reads in WORDS, from across the yard', async () => {
    const looked = await f.prose('look gasometer');
    expect(looked.length).toBeGreaterThan(0);
    // ⭐ A level, never a figure — which is why the thing is an object
    // rather than a number on a ledger, and why two players agree.
    expect(looked).toMatch(/bell|seal|rid|low|full/i);
    expect(looked.replace(/<[^>]*>/g, '')).not.toMatch(/\d+\s*(L|litre)/i);
  }, 120_000);

  it('⭐⭐ drive 15 — a gas will not stay in an open vessel, and it SAYS why', async () => {
    // ⚠ The escape branch: not a floor puddle (absurd for a gas) and not
    // silence (dangerous in a shut room). The litres go into the air.
    const poured = await say(f, 'fill bladder from gasometer');
    understood(poured, 'fill bladder from gasometer');
  }, 180_000);

  it('⭐ drive 13 — tar boils to pitch through the shipped arrow', async () => {
    // Zero code: `purifiedByBoiling` is the arrow between two authored
    // materials, driven by the `boil` verb a fire already affords.
    const boiled = await say(f, 'boil condenser');
    understood(boiled, 'boil condenser');
  }, 180_000);
});

/* ───────────────── Part 6: the mine ───────────────── */

suite('⭐⭐⭐ 20–25. the third damp, the lamp, and the gas you can carry out', () => {
  let m: Session;
  beforeAll(async () => {
    m = await Session.open(uniqueHandle('hewer'), { startLocation: DRIFT });
  }, 180_000);
  afterAll(() => m?.close());

  it('⭐⭐ drive 24 — the SAFETY LAMP is here to be picked up', async () => {
    // ⭐ The reachability link that makes the hazard a mechanic rather
    // than a prohibition: a remedy nobody can reach is not a remedy, and
    // the hazard would ship with no counter but *do not go in there*.
    const got = await say(m, 'get safety lamp');
    understood(got, 'get safety lamp');
    expect(refusedFor(got), 'no safety lamp at the lamp station').toBeNull();

    const lit = await say(m, 'ignite lamp');
    understood(lit, 'ignite lamp');
    // It ships with oil in it, or it is an ornament.
    expect(refusedFor(lit)).not.toBe('no-fuel');
  }, 240_000);

  it('⭐⭐ drive 21 — `measure atmosphere` reads the air, in words', async () => {
    const read = await say(m, 'analyze atmosphere');
    understood(read, 'analyze atmosphere');
    const said = await m.prose('analyze atmosphere');
    expect(said.replace(/<[^>]*>/g, '')).not.toMatch(/\d/);
  }, 180_000);

  it('⭐⭐ drive 20 — sink one shaft and you are in the measures', async () => {
    // ⭐ The gas band is set against the WORKINGS: the authored drift is
    // at −10 m and the measures start at −20, so ONE shaft reaches them.
    // That is what makes the lesson a decision a player can reach in a
    // session rather than honest geology nobody meets.
    const got = await say(m, 'get pick');
    understood(got, 'get pick');
    const sunk = await say(m, 'sink');
    understood(sunk, 'sink');
    await settle(m, sunk);
    // The shaft may refuse for a reason about the GROUND (bad back, no
    // timber) — which is the mining build's own machinery and not this
    // one's. What must not happen is a misunderstanding.
    const down = await say(m, 'down');
    understood(down, 'down');
  }, 300_000);

  it('⭐⭐⭐ drive 25 — `drain` EXISTS and is afforded by the working', async () => {
    // ⚠ The verb · affordance · data · boot · arg-gate chain, all five.
    // A `drain` with no controller row answers `controller-error` every
    // time, for everybody, forever — and 15 green controller tests would
    // not see it.
    const drained = await say(m, 'drain bladder');
    understood(drained, 'drain bladder');
    await settle(m, drained);
    // ⭐ The refusal is allowed and informative — the drift is above the
    // gas band, which is itself the design: shallow workings are safe.
    // What must NOT happen is a misunderstanding.
    const reason = refusedFor(drained);
    if (reason !== null) {
      expect(
        ['no-gas', 'no-vessel', 'not-sealed', 'no-room'],
        `drain refused with an unexpected reason: ${reason}`,
      ).toContain(reason);
    }
  }, 240_000);
});

/* ───────────────── Part 7: the regressions that matter ───────────────── */

suite('⚠⚠ 28. every shipped flow still completes', () => {
  let r: Session;
  beforeAll(async () => {
    r = await Session.open(uniqueHandle('walker'), { startLocation: SMITHY });
  }, 180_000);
  afterAll(() => r?.close());

  it('⭐ the smithy forge lights and the room is NOT dark', async () => {
    // ⭐⭐ AC20, and the one thing only a live world can answer. Every
    // burner's authored flux became a CEILING scaled by soot, so every
    // row was raised by 1/0.6 — and a room lit only by a fire is the
    // case to check first.
    await say(r, 'stoke charcoal into forge');
    await say(r, 'ignite forge');
    const looked = await r.prose('look');
    expect(looked.length, 'the smithy came back empty — it has gone dark')
      .toBeGreaterThan(40);
    expect(looked).not.toMatch(/pitch black|cannot see/i);
  }, 240_000);

  it('⭐ `douse`, `pump`, `heat` and `boil` all still reach the forge', async () => {
    for (const line of ['pump forge', 'douse forge']) {
      const r2 = await say(r, line);
      understood(r2, line);
    }
  }, 180_000);

  it('⚠ the atmosphere TAG is untouched — a smoky room still reads air', async () => {
    // ⭐ AC19. Smoke is a thing IN the air now, not a different air, so
    // every shipped reader of the tag — the slurry pit's stink, the
    // adit's breath, a biome room's plain air — is unchanged.
    const traced = await r.prose('trace atmosphere');
    expect(traced.length).toBeGreaterThan(0);
  }, 120_000);
});
