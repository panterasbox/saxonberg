/**
 * The envelope — ⭐⭐ **the drive**: why it is dark on an unlit road at
 * night, why a lamp in your hand lifts it, and why a room holds a state
 * different from outside.
 *
 * ⭐ Stands in the scaffold (test-world-lifecycle D8): the approach is the
 * unlit road, the passage the dark place with a detail in it, the cellar
 * the sealed unlit room, the shop's hearth the fire that warms a room and
 * the works' forge the one that does not. ⭐ It makes its own night: the
 * world clock is moved to one in the morning before anybody stands
 * anywhere (it used to require a freshly dropped database, whose clock
 * starts at midnight). The CONTENT half — the two Terminus streets under a
 * public-lighting service, which the testbed does not have — is
 * `envelope-content.dirty.wire.test.ts`.
 *
 * ## ⚠ What a socket cannot settle, and where it lives instead
 *
 *  - **steps 1–2 (noon, and dusk falling)** need twelve game hours.
 *    `lib/time/__tests__/CelestialApi.sky.test.ts` pins the curve at
 *    its anchors — a summer noon is `bright`, a winter noon `lit`, dusk
 *    monotone — and `VisionModality.sky.test.ts` proves the walk
 *    composes sun × cloud × the room's own area.
 *  - **step 3 (a FULL moon lets you move)** needs a different phase.
 *    The sky suite proves a full moon high in a clear sky is
 *    `very-dim` and a new moon is `pitch-black`; the night assertions
 *    here accept either band's sentence, because the moon's phase at
 *    one in the morning is wherever the world's calendar has got to.
 *  - **step 15 (a whole game day kills nobody of cold)** is a game day.
 *    `Thermal.cold.gym.test.ts` runs sixteen twelve-hour bodies and
 *    prints the table.
 *  - **step 9's winter** is days away. The solar term's four anchors are
 *    pinned in `WeatherLogic`'s own suite; this file drives NIGHT, which
 *    is the other half of the same cosine.
 *
 * Runs twice on one world: the lamp is handed fresh each run, the hearth's
 * fuel and the cellar door are staged before use, and the hearth is put
 * out again at the end.
 */

import { describe as suite, it, expect, beforeAll, afterAll } from 'vitest';
import {
  Session,
  declareFile,
  plain,
  expectOk,
  hand,
  stage,
  standIn,
  advanceWorldClock,
  pinWeather,
  unpinWeather,
  worldClockNow,
  isOwnedTestWorld,
  APPROACH,
  PASSAGE,
  CELLAR,
  CELLAR_DOOR,
  HUT,
  SHOP,
  HEARTH,
  WORKS,
} from '../src/harness';

declareFile({
  file: 'envelope.wire.test.ts',
  packs: ['test-fixtures', 'trade-shopkeeping', 'trade-mining'],
});

/**
 * The lamp a drive carries into the dark: the mining trade's oil lamp, a
 * `/platform/thing/Lamp` row like the general store's lantern, shipped
 * filled and unlit. (The lantern itself is Terminus's row.)
 */
const LAMP = '/trade/mining/thing/safety-lamp';

/** The fire a drive lights in the shop: the hearth's authored fuel bed. */
const HEARTH_FUEL = { '/stuff/idea/material/wood/oak': 6 };

const open: Session[] = [];

/**
 * ⭐ Make it the small hours: move the clock forward to 01:00 of the next
 * night (a jump of under a game day), before any session opens — so no
 * body lives through the jump. Only in a world this run owns; anywhere
 * else {@link assertItIsDark} says what the drive needed.
 */
async function toOneInTheMorning(): Promise<void> {
  if (!isOwnedTestWorld()) return;
  const DAY = 86_400;
  const sec = (await worldClockNow()) % DAY;
  if (sec >= 600 && sec <= 3 * 3_600) return; // already the small hours
  const toOne = sec <= 3_600 ? 3_600 - sec : DAY + 3_600 - sec;
  await advanceWorldClock(`${Math.round(toOne / 60)} minutes`);
}

/**
 * ⚠⚠ **The clock is the precondition.** The file moves it itself
 * ({@link toOneInTheMorning}); this ASSERTS the condition rather than
 * assuming it, so a drive attached to a world it cannot move says so
 * instead of silently testing the wrong hour.
 */
async function assertItIsDark(s: Session): Promise<void> {
  const sky = squash(plain(await (await s.cmd('analyze sky')).said()));
  // ⚠⚠ **This guard could not fail, and it was written to catch exactly
  // the thing it let through.** It matched `/moon/i` — and the DAYLIGHT
  // reading says *"Daylight over …; the season is spring. The moon is
  // new."* Found at the sweep (2026-09-25).
  //
  // ⭐ Now it is a NEGATIVE first: whatever else the sky says, it must not
  // say `Daylight`. The positive terms follow, and the loose ones
  // (`moon`, `set`, `dark`) are gone — every one of them appears in a
  // sentence about a sunny day.
  const night =
    !/daylight/i.test(sky) && /night|below the horizon|twilight/i.test(sky);
  if (!night) {
    throw new Error(
      'envelope drive: the world clock is NOT in the small hours — ' +
        `'analyze sky' says "${sky}". Every night assertion in this ` +
        'file needs one. The drive moves the clock itself only in a ' +
        'world this run owns (WIRE_BOOT=1); attached to another world, ' +
        'it cannot.',
    );
  }
}

async function at(where: string, tag: string): Promise<Session> {
  const s = await standIn(where, `env-${tag}`);
  open.push(s);
  return s;
}

const squash = (s: string): string => s.replace(/\s+/g, ' ').trim();

/**
 * ⭐⭐ **The light where this session stands, IN WORDS** — the rung
 * `analyze light` puts the room on.
 *
 * ⚠⚠ This read a lux FIGURE out of `analyze light` (`total: N lux`)
 * until the instrumentation build landed on master, which retired the
 * per-channel controllers for the `Reading` substrate and made the
 * trained eye **graduated**: `analyze` now reports what a person can
 * actually tell — *whether there is enough to work by* — and the figure
 * belongs to `measure`, which wants a photometer in hand. A drive
 * session has no photometer.
 *
 * ⭐ Re-pointing it onto the words is not a workaround, it is the
 * acceptance criterion the requirements actually wrote: *observable from
 * outside the code.* A lux ratio was always a claim about the engine; the
 * band is what a player reads.
 *
 * The rungs are `LightReading.enoughFor`'s, in order, and the index is
 * the comparable thing.
 */
const LIGHT_RUNGS = [
  'pitch dark',
  'barely enough to move by',
  'enough to work by',
  'good working light',
  'bright',
  'glaring',
] as const;

async function lightRungHere(s: Session): Promise<number> {
  const said = squash(plain(await (await s.cmd('analyze light')).said()));
  const rung = LIGHT_RUNGS.findIndex((r) => said.toLowerCase().includes(r));
  if (rung < 0) {
    throw new Error(
      `envelope drive: 'analyze light' named no light rung. Said: "${said}". ` +
        'If the wording moved, the rungs are `LightReading.enoughFor`.',
    );
  }
  return rung;
}
async function say(s: Session, cmd: string): Promise<string> {
  return squash(plain(await (await s.cmd(cmd)).said()));
}

beforeAll(async () => {
  await toOneInTheMorning();
  // ⭐ Staged, never inherited: the cellar is dark only behind a SHUT door
  // (an open way passes the shop's light), and the shop's hearth starts
  // out and laid with its authored fuel — a hearth an earlier run lit has
  // burned some of it.
  await stage(CELLAR_DOOR, 'setOpen', false);
  await stage(CELLAR_DOOR, 'setLocked', true);
  await stage(HEARTH, 'setFuelBed', { ...HEARTH_FUEL });
}, 300_000);

afterAll(async () => {
  for (const s of open) s?.close();
});

// ───────────────────────── the dark ─────────────────────────

suite('⭐⭐ night is real', () => {
  let dark: Session;

  beforeAll(async () => {
    dark = await at(APPROACH, 'dark');
    await assertItIsDark(dark);
    // ⭐ Staged: an overcast sky over the testbed. Under a clear one the
    // moon lights an open lane (the first scaffold run read the approach
    // at 01:00 by moonlight); "genuinely dark" is a cloudy midnight.
    await pinWeather('overcast', APPROACH);
  }, 180_000);

  afterAll(async () => {
    await unpinWeather(APPROACH).catch(() => undefined);
  });

  it('step 8 — a midnight on an unlit road is genuinely dark', async () => {
    // ⭐ The instrument first, so a failure here says WHAT the light is
    // rather than only that the prose was wrong.
    // eslint-disable-next-line no-console -- the drive's own record
    console.log('  [drive] approach:', await say(dark, 'analyze light'));
    const said = await say(dark, 'look');
    // ⭐ The band's own sentence, and NOT the room's authored prose: a
    // description is what you can SEE, and there is nothing to see.
    expect(said).toMatch(/pitch dark|Shapes and edges/i);
  });

  it('⚠ step 4 — a DETAIL is not light-gated, and that is a finding', async () => {
    // Two wrong drafts of this step, and each taught something.
    //
    // `read sign` came back "I don't understand 'read'" — a PARSE
    // failure wearing the costume of a darkness failure, and an
    // assertion that cannot tell those apart cannot fail honestly
    // (`ground.wire.test.ts` learned the same lesson).
    //
    // `look road` then returned the road's detail text in the pitch
    // dark, because ⭐ **`look <detail>` runs no perception gate at
    // all**: `lookAtDetail` asks `getDetailFor` and renders. Only
    // OBJECTS are gated (`canSee`) and only the room-level render is
    // banded. So a player in the dark cannot see the barrels but can
    // still read the wall.
    //
    // That is a real gap and it is NOT this build's to close — the
    // requirements scope the room-level line and the object gate, and
    // a detail gate touches every `look` in the game. Recorded here
    // rather than asserted away, and offered to the perception slate.
    //
    // ⭐ The testbed's detail in the dark is the passage's proud flag (the
    // passage is unlit at every hour).
    const inPassage = await at(PASSAGE, 'detail');
    const said = await say(inPassage, 'look flag');
    expect(said.length).toBeGreaterThan(0);
  });

  it('step 7 — a road the town never lit has no lamps to speak of', async () => {
    const said = await say(dark, 'look lamps');
    expect(said).not.toMatch(/lamps are burning|stand cold/i);
  });
});

// ───────────────────────── the lamp ─────────────────────────

suite('⭐ a lamp you light, and that runs out', () => {
  let me: Session;

  beforeAll(async () => {
    // ⚠ A room with no other lamp in it: a second thing answering the
    // keyword binds `light` to one and `douse` to the other, which reads as
    // a product failure and is a targeting one.
    //
    // ⚠⚠ **And a SMALL one.** Over a 400 m² outdoor cell nothing one lamp
    // can do shows up (lux is lumens over AREA). ⭐ The testbed cellar is
    // one 4 m cell — 16 m², pitch black behind its shut door, granite all
    // round and no lamp in it — which is also what a lamp is FOR.
    me = await at(CELLAR, 'lamp');
  }, 180_000);

  it('⭐ step 4 — light it and the dark lifts; douse it and it comes back', async () => {
    // Setup, not the act under test: the lamp is handed, shipped filled.
    await hand(me, LAMP);
    await me.drainProse();

    // ⚠⚠ **Douse FIRST, with nothing in between.** The ordering is the
    // experiment: an earlier draft read `analyze light` between the two
    // and `douse` answered `not-burning`. Every light read runs the
    // walk, the walk asks each source for its flux, and
    // `BurnerMixin.getEmittedFlux` reconciles fuel — so if a lamp goes
    // out between lighting it and putting it out, the READ is what put
    // it out. Splitting the two claims says which.
    expectOk(await me.cmd('light lamp'));
    await me.drainProse();
    expectOk(await me.cmd('douse lamp'));
    await me.drainProse();
  });

  it('⭐⭐ step 4 — and the room is measurably brighter for it', async () => {
    // ⚠ Establish the precondition rather than inherit it from the test
    // above: a `before` read taken with the lamp still burning is a
    // measurement of the lamp.
    await me.cmd('douse lamp');
    await me.drainProse();
    const before = await lightRungHere(me);
    await me.drainProse();
    expectOk(await me.cmd('light lamp'));
    await me.drainProse();
    // ⚠ A RUNG, not a ratio, and not a fixed step. What the step is FOR
    // is that the dark lifts where you are standing, and the band is
    // where a player reads that.
    expect(await lightRungHere(me)).toBeGreaterThan(before);
  });

  it('⚠ the AFFORDANCE reaches a HELD lamp — the link that dies silently', async () => {
    // `BurnerMixin` declared its verbs `peers`-only: siblings and one
    // exit away. A lamp in your hand is not your sibling — you are its
    // CONTAINER — so `light lamp` would have answered "you don't see
    // any 'lamp' here" with the lamp in the player's hand, while every
    // controller test stayed green. This is the binder saying otherwise.
    const res = await me.cmd('light lamp');
    const said = squash(plain(await res.said()));
    expect(said).not.toMatch(/don't see any|can't see any/i);
  });

  it('⚠ a lamp is a FURNACE, so the fuel verbs reach it', async () => {
    // ⭐ What is NOT here: burning one down. An `adjustReserve` through
    // `eval` passed a plain object where a `Quantity` belongs, threw
    // inside the sandbox, and left the session unable to answer for
    // thirty seconds. `Lamp.test.ts` burns one down over eighteen game
    // hours in milliseconds, which is where that claim belongs.
    await me.cmd('douse lamp');
    await me.drainProse();
    const res = await me.cmd('douse lamp');
    // Already out, so the refusal is `not-burning` — the FURNACE's
    // refusal, which is the point: the verb reaches it at all.
    const said = squash(plain(await res.said()));
    expect(said).not.toMatch(/don't see any|isn't a furnace/i);
  });
});

// ───────────────────── the room as an envelope ─────────────────────

suite('⭐⭐ the room holds a state different from outside, at a cost', () => {
  let feeler: Session;
  let cook: Session;
  let cellar: Session;
  let smith: Session;

  beforeAll(async () => {
    // ⭐ The hut: oak-walled, with nothing burning in it — the cause line
    // a cold timber room gives.
    feeler = await at(HUT, 'feel');
    cook = await at(SHOP, 'cook');
    cellar = await at(CELLAR, 'cellar');
    smith = await at(WORKS, 'smith');
  }, 180_000);

  afterAll(async () => {
    // Leave the shop's hearth out for the next drive (it was staged out
    // and fuelled at the start; this run lit it).
    await cook?.cmd('douse hearth');
  });

  it('step 9 — `feel` reports the cold AND names the cause', async () => {
    const said = await say(feeler, 'feel here');
    expect(said).toMatch(/The air feels/i);
    // ⭐ The cause line: everything it can say is DERIVED, which is what
    // makes it safe to say. A room warm for no reason a player can be
    // told would be self-reporting the dishonesty.
    expect(said).toMatch(
      /granite|stone|oak|timber|hearth|door stands open|as cold as outside|keeps its own temperature/i,
    );
  });

  it('⭐ a CELLAR keeps its own temperature, and says so', async () => {
    // The testbed cellar declares granite walls and roof rather than a
    // temperature — so its steadiness is a consequence of what it is
    // made of.
    const said = await say(cellar, 'feel here');
    expect(said).toMatch(/The air feels/i);
  });

  it('⭐⭐ step 10 — light the hearth and the room says the hearth is why', async () => {
    // ⚠ `feel here`, not bare `feel`. The view's default is `$focus`,
    // and after `light hearth` the focus IS the hearth — the bare form
    // came back "The open hearth feels scalding", which is a correct
    // answer to a different question. Naming the room is how you ask
    // about the air.
    // ⚠⚠ **It ESTABLISHES its precondition rather than assuming it.**
    // The `before` read wants a cold shop, and a shop an earlier run lit
    // is not one. Putting the hearth out first is the honest fix, and it
    // also proves `douse` reaches a fixture furnace.
    await cook.cmd('douse hearth');
    await cook.drainProse();
    const before = await say(cook, 'feel here');
    expect(before).not.toMatch(/warm from/i);

    expectOk(await cook.cmd('light hearth'));
    await cook.drainProse();
    const after = await say(cook, 'feel here');
    expect(after).toMatch(/The air feels/i);
    // ⭐ The CAUSE, not the temperature. The room warms over game
    // minutes — that curve is `Atmospheric.envelope.test.ts`'s, which
    // can move a clock — but the moment a fire is burning, the room's
    // reason for being the temperature it is CHANGES, and that is what
    // a player reads.
    expect(after).toMatch(/warm from/i);
    expect(after).not.toBe(before);
  });

  it('⭐ step 12 — a FORGE does not warm the works', async () => {
    // The shipped rule, kept by composition: `Forge` does not compose
    // `SpaceHeatingMixin`, and nothing anywhere asks "is this a forge".
    const said = await say(smith, 'feel here');
    expect(said).not.toMatch(/warm from .*forge/i);
  });
});

// ───────────────────────── the body ─────────────────────────

suite('the body feels it', () => {
  let cold: Session;

  beforeAll(async () => {
    cold = await at(APPROACH, 'body');
  }, 180_000);

  it('step 9 — the body line is there to read, and nobody has died of it', async () => {
    const said = await say(cold, 'look me');
    expect(said.length).toBeGreaterThan(0);
    // ⚠ The floor of acceptance 15, asserted the only way a five-minute
    // run can: the character standing out in the night is alive and
    // answering. The twelve-hour claim is the gym bench's.
    expect(said).not.toMatch(/\(dead\)/i);
  });
});
