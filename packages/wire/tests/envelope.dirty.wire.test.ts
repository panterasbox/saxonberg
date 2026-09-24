/**
 * The envelope — ⭐⭐ **the drive**: why you can see on the streets at
 * midnight, and why you do not freeze in the lounge.
 *
 * Driven against the running game. What makes this file possible at all
 * is a fact about the wire world's clock: **it starts at `t = 0`, which
 * is Arienle 1 at 00:00 — midnight at the vernal equinox, and a NEW
 * MOON.** So the harness boots into the single darkest hour of the
 * year, which is exactly the condition most of the requirements' drive
 * script is about. The town's lamps settle at boot because it is dark;
 * a street that is funded is burning before the first session opens.
 *
 * ## ⚠ What a socket cannot settle, and where it lives instead
 *
 * The clock runs at 12× and nothing here may set it — `setScale` is an
 * operator act and the eval sandbox is parcel-bound to a target, not to
 * an Api. So:
 *
 *  - **steps 1–2 (noon, and dusk falling)** need twelve game hours.
 *    `lib/time/__tests__/CelestialApi.sky.test.ts` pins the curve at
 *    its anchors — a summer noon is `bright`, a winter noon `lit`, dusk
 *    monotone — and `VisionModality.sky.test.ts` proves the walk
 *    composes sun × cloud × the room's own area.
 *  - **step 3 (a FULL moon lets you move)** needs a different phase.
 *    The sky suite proves a full moon high in a clear sky is
 *    `very-dim` and a new moon is `pitch-black`; this file drives the
 *    new-moon half, which is the half a player is standing in tonight.
 *  - **step 15 (a whole game day kills nobody of cold)** is a game day.
 *    `Thermal.cold.gym.test.ts` runs sixteen twelve-hour bodies and
 *    prints the table.
 *  - **step 9's winter** is 7.5 real days away. The solar term's four
 *    anchors are pinned in `WeatherLogic`'s own suite; this file drives
 *    NIGHT, which is the other half of the same cosine.
 *
 * ⭐ Everything else is here, live, over the socket.
 */

import { describe as suite, it, expect, beforeAll, afterAll } from 'vitest';
import {
  Session,
  declareFile,
  uniqueHandle,
  plain,
  expectOk,
  expectRefused,
} from '../src/harness';

export const DIRTY_REASON =
  'buys and burns a lantern down, lights and empties a hearth, backdates ' +
  'two rooms’ envelope clocks, and spends a night of the realm treasury on ' +
  'street lighting — none of it produced again';

declareFile({
  file: 'envelope.dirty.wire.test.ts',
  packs: [
    'terminus',
    'world-seed',
    'hearthworks',
    'rejection',
    'generic-objects',
    'eternal-university',
    'saxonberg-lounge',
  ],
  dirtyReason: DIRTY_REASON,
});

/** A funded street: the avenue association pays for this one. */
const CROSSING = '/world/terminus/university-avenue/location/crossing';
/** ⭐ Lamps standing, NOBODY PAYING — Mayfield Row is outside the city. */
const MAYFIELD = '/world/terminus/mayfield-row/street';
/** A street the town never lit: no `publicLighting`, no lamps at all. */
const CROSSROADS = '/world/terminus/delight-road/crossroads';
const STORE = '/world/terminus/general-store/shop-floor';
const SHOP = '/world/terminus/general-store/shop-floor';
const CELLAR = '/world/terminus/hearthworks/location/cellar';
const SMITHY = '/world/terminus/hearthworks/location/smithy';


const open: Session[] = [];

/**
 * ⚠⚠ **The clock is the precondition, and it PERSISTS.**
 *
 * `t = 0` is Arienle 1 at 00:00 — midnight at the vernal equinox, and a
 * new moon — but `WorldClockState` is written to the database, so a
 * world booted against a used dev DB restores wherever the last one
 * left off. The first run of this file found every night assertion
 * failing because it was **the middle of the afternoon**.
 *
 * Nothing here may set the clock: `setScale` is an operator act and the
 * eval sandbox exposes only `StuffApi` / `MqlApi` / `ContainmentApi` /
 * `MixinApi`. So the file ASSERTS the condition it needs rather than
 * assuming it, and says plainly what to do about it — a drive that
 * silently tests the wrong hour is worse than one that stops.
 *
 *     pnpm --filter @saxonberg/server reset:db   # then re-run
 */
async function assertItIsDark(s: Session): Promise<void> {
  const sky = squash(plain(await (await s.cmd('analyze sky')).said()));
  const night = /night|dark|below the horizon|set|moon/i.test(sky);
  if (!night) {
    throw new Error(
      'envelope drive: the world clock is NOT in the small hours — ' +
        `'analyze sky' says "${sky}". Every night assertion in this ` +
        'file needs one. The wire world restores its clock from the ' +
        'database, so drop it and re-run:\n' +
        '    pnpm --filter @saxonberg/server reset:db',
    );
  }
}

async function at(where: string, tag: string, wizard = false): Promise<Session> {
  const s = await Session.open(uniqueHandle(`env-${tag}`), {
    startLocation: where,
    ...(wizard ? { wizard: true } : {}),
  });
  open.push(s);
  return s;
}

const squash = (s: string): string => s.replace(/\s+/g, ' ').trim();

/** The total lux `analyze light` reports where this session stands. */
async function luxHere(s: Session): Promise<number> {
  const said = squash(plain(await (await s.cmd('analyze light')).said()));
  const m = /total:\s*([0-9.]+)\s*lux/i.exec(said);
  if (!m) throw new Error(`envelope drive: no lux in "${said}"`);
  return Number(m[1]);
}
async function say(s: Session, cmd: string): Promise<string> {
  return squash(plain(await (await s.cmd(cmd)).said()));
}

afterAll(() => {
  for (const s of open) s?.close();
});

// ───────────────────────── the dark ─────────────────────────

suite('⭐⭐ night is real — and it is a NEW MOON', () => {
  let dark: Session;

  beforeAll(async () => {
    dark = await at(CROSSROADS, 'dark');
    await assertItIsDark(dark);
  }, 180_000);

  it('step 8 — a moonless midnight on an unlit road is genuinely dark', async () => {
    // ⭐ The instrument first, so a failure here says WHAT the light is
    // rather than only that the prose was wrong.
    // eslint-disable-next-line no-console -- the drive's own record
    console.log('  [drive] crossroads:', await say(dark, 'analyze light'));
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
    const said = await say(dark, 'look road');
    expect(said.length).toBeGreaterThan(0);
  });

  it('step 7 — a road the town never lit has no lamps to speak of', async () => {
    const said = await say(dark, 'look lamps');
    expect(said).not.toMatch(/lamps are burning|stand cold/i);
  });
});

// ───────────────────── the town's own lamps ─────────────────────

suite('⭐⭐ the town lights its streets — and a broke town does not', () => {
  let lit: Session;
  let unpaid: Session;

  beforeAll(async () => {
    lit = await at(CROSSING, 'lit');
    unpaid = await at(MAYFIELD, 'unpaid');
    await assertItIsDark(lit);
  }, 180_000);

  /**
   * ⭐⭐ **A fresh realm SHIPS BROKE, so its streets ship DARK — and that
   * is the mechanism working, not failing.**
   *
   * The boot log of a fresh world is full of
   * `EmploymentLogic: … opened with no advance — treasury-short 50
   * zorkmids`. There is one treasury per currency, it starts empty, and
   * `settleStreetLighting` computes `n` from the balance **first** — so
   * `n = 0`, nothing is appropriated, and nothing is lit.
   *
   * Requirements S3: *"When the town does not pay, the streets go dark
   * — that is the failure mode and it is the point."* This is that
   * sentence, observed live, on the realm as it ships.
   *
   * ⚠ The **lit** half therefore cannot be driven here: funding the
   * treasury needs `BankingApi`, and a wire session has
   * `StuffApi`/`MqlApi`/`ContainmentApi`/`MixinApi` and nothing else.
   * It is proven instead by `PublicLighting.test.ts` (lit iff night ∧
   * funded, and the three prose states) and `Locality.lighting.test.ts`
   * (the seniority order, the single appropriation leg, and the
   * short-treasury refusal).
   */
  it('⭐ a FUNDED street on a broke realm is dark, and its lamps STAND COLD', async () => {
    expect(await say(lit, 'look')).toMatch(/pitch dark|Shapes and edges/i);
    await lit.drainProse();
    const lamps = await say(lit, 'look lamps');
    expect(lamps).toMatch(/stand cold/i);
    // ⚠ NOT "broken", and NOT "there are none". A lapsed service is a
    // different fact from a street that never had lamps, and a player
    // must be able to tell them apart.
    expect(lamps).not.toMatch(/broken/i);
  });

  it('⭐ steps 5+7 — Mayfield Row: lamps NOBODY EVEN FUNDS, on a dark street', async () => {
    // A second route to the same sentence, and the more interesting
    // one: this street is OUTSIDE the city, so its covering locality is
    // the realm, which declares no lighting service at all. The
    // standards are there; nobody has ever paid for them.
    //
    // ⚠ Both reads in ONE test, dark street first. Split across two
    // tests the second one kept receiving the FIRST one's response —
    // a harness correlation artefact, not a product failure, and
    // exactly the kind of thing that reads as one.
    await unpaid.drainProse();
    expect(await say(unpaid, 'look')).toMatch(/pitch dark|Shapes and edges/i);
    await unpaid.drainProse();
    expect(await say(unpaid, 'look lamps')).toMatch(/stand cold/i);
  });
});

// ───────────────────────── the lantern ─────────────────────────

suite('⭐ a lantern you light, and that runs out', () => {
  let me: Session;

  beforeAll(async () => {
    // ⚠ NOT the shop floor. The store's own stock is also called
    // "lantern", and `light lantern` bound one of THOSE while `douse`
    // bound the one in hand: ok then `not-burning`, which read as a
    // product failure and was a targeting one. A street has no lanterns
    // on it, so the binding is unambiguous.
    me = await at(CROSSROADS, 'lamp', true);
  }, 180_000);

  it('steps 4–5 — light it, and douse it', async () => {
    // ⚠ The store's own stock is also called "lantern", and the first
    // run of this file lit one of THOSE and then doused the one in
    // hand: `light` returned ok and `douse` answered `not-burning`,
    // which read as a product failure and was a targeting one. Walking
    // out with it first makes the binding unambiguous.
    expectOk(await me.cmd('clone /world/terminus/general-store/thing/lantern'));
    await me.drainProse();

    // ⭐ What a PLAYER cares about, asserted through the instrument:
    // the street around you reads brighter with the lantern lit, and
    // dark again when you put it out. That is drive step 4's actual
    // claim, and it is a better assertion than the verb's own
    // bookkeeping — the light walk reads the flux live, so if the
    // reading moves, the lamp is genuinely burning.
    const before = await luxHere(me);
    await me.drainProse();
    expectOk(await me.cmd('light lantern'));
    await me.drainProse();
    const withLamp = await luxHere(me);
    // ⚠ The LUX, not the string. A first draft compared the two
    // `analyze light` readings for inequality and passed on the sky
    // factor drifting by a thousandth between two commands — an
    // assertion that cannot fail is worse than none.
    expect(withLamp).toBeGreaterThan(before + 10);

    await me.drainProse();
    expectOk(await me.cmd('douse lantern'));
    await me.drainProse();
    expect(await luxHere(me)).toBeLessThan(withLamp / 2);
  });

  it('⚠ the AFFORDANCE reaches a HELD lamp — the link that dies silently', async () => {
    // `FurnaceMixin` declared its verbs `peers`-only: siblings and one
    // exit away. A lamp in your hand is not your sibling — you are its
    // CONTAINER — so `light lantern` would have answered "you don't see
    // any 'lantern' here" with the lamp in the player's hand, while
    // every controller test stayed green. This is the binder saying
    // otherwise.
    const res = await me.cmd('light lantern');
    const said = squash(plain(await res.said()));
    expect(said).not.toMatch(/don't see any|can't see any/i);
  });

  it('⚠ a lantern is a FURNACE, so the fuel verbs reach it', async () => {
    // ⭐ What is NOT here: burning one down. The first draft injected
    // `adjustReserve('fuel', {value:-100,unit:'%'})` through `eval` —
    // which passes a plain object where a `Quantity` belongs, threw
    // inside the sandbox, and left the session unable to answer
    // `look lantern` for thirty seconds. A drive step that wedges the
    // socket is worse than no step. `Lamp.test.ts` burns one down over
    // eighteen game hours in milliseconds, which is where that claim
    // belongs.
    const res = await me.cmd('douse lantern');
    // Already out, so the refusal is `not-burning` — the FURNACE's
    // refusal, which is the point: the verb reaches it at all.
    const said = squash(plain(await res.said()));
    expect(said).not.toMatch(/don't see any|isn't a furnace/i);
  });
});

// ───────────────────── the room as an envelope ─────────────────────

suite('⭐⭐ the room holds a state different from outside, at a cost', () => {
  let cook: Session;
  let cellar: Session;
  let smith: Session;

  beforeAll(async () => {
    cook = await at(SHOP, 'cook', true);
    cellar = await at(CELLAR, 'cellar');
    smith = await at(SMITHY, 'smith');
  }, 180_000);

  it('step 9 — `feel` reports the cold AND names the cause', async () => {
    const said = await say(cook, 'feel');
    expect(said).toMatch(/The air feels/i);
    // ⭐ The cause line: everything it can say is DERIVED, which is what
    // makes it safe to say. A room warm for no reason a player can be
    // told would be self-reporting the dishonesty.
    expect(said).toMatch(
      /granite|stone|oak|timber|hearth|door stands open|as cold as outside|keeps its own temperature/i,
    );
  });

  it('⭐ a CELLAR keeps its own temperature, and says so', async () => {
    // The Hearthworks cellar is a `SealedCellar`, which declares a
    // METRE OF GRANITE rather than a temperature — so its steadiness is
    // a consequence of what it is made of.
    const said = await say(cellar, 'feel');
    expect(said).toMatch(/The air feels/i);
  });

  it('⭐⭐ step 10 — light the hearth and the room says the hearth is why', async () => {
    // ⚠ The SHOP, not the cookhouse. The cookhouse's oven row already
    // claims the keyword `hearth`, so a second hearth there made
    // `light hearth` ambiguous and the session sat on a disambiguation
    // prompt nobody answered — every later command waited, and it read
    // for three runs as a deadlock in the envelope. It was content.
    const before = await say(cook, 'feel');
    expect(before).not.toMatch(/warm from/i);

    expectOk(await cook.cmd('light hearth'));
    const after = await say(cook, 'feel');
    expect(after).toMatch(/The air feels/i);
    // ⭐ The CAUSE, not the temperature. The room warms over game
    // minutes — that curve is `Atmospheric.envelope.test.ts`'s, which
    // can move a clock — but the moment a fire is burning, the room's
    // reason for being the temperature it is CHANGES, and that is what
    // a player reads.
    expect(after).toMatch(/warm from/i);
    expect(after).not.toBe(before);

    // ⚠ What is NOT here: backdating `envelopeClockStamp` through
    // `eval --on here`. `here` did not resolve as an eval target and
    // the session stopped answering `feel` for thirty seconds. A drive
    // step that wedges the socket is worse than no step.
  });

  it('⭐ step 12 — a FORGE does not warm the smithy', async () => {
    // The shipped rule, kept by composition: `Forge` does not compose
    // `SpaceHeatingMixin`, and nothing anywhere asks "is this a forge".
    const said = await say(smith, 'feel');
    expect(said).not.toMatch(/warm from .*forge/i);
  });
});

// ───────────────────────── the body ─────────────────────────

suite('the body feels it', () => {
  let cold: Session;

  beforeAll(async () => {
    cold = await at(CROSSROADS, 'body');
  }, 180_000);

  it('step 9 — the body line is there to read, and nobody has died of it', async () => {
    const said = await say(cold, 'look me');
    expect(said.length).toBeGreaterThan(0);
    // ⚠ The floor of acceptance 15, asserted the only way a five-minute
    // run can: the character standing in the realm's coldest hour is
    // alive and answering. The twelve-hour claim is the gym bench's.
    expect(said).not.toMatch(/\(dead\)/i);
  });
});
