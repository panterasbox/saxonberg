/**
 * Energy — ⭐⭐ **the drive**: the same street-lighting service, two epochs.
 *
 * Driven against the running game. Stage A is the combustion half: Heart's
 * Delight is oil-lit, and — unlike Terminus in the envelope drive, which
 * needed a treasury nobody had funded — the valley lights from its **own oil
 * store at cost 0**, so its lamps burn at boot on a fresh realm with no money
 * moved. That is the one thing this harness can show live that envelope could
 * not, and it is the headline: *a town's lamps burn because it bought and
 * stored real fuel.*
 *
 * ## ⚠⚠ What a socket cannot settle, and where it lives instead
 *
 * Two walls, both structural, both the same ones the envelope drive met:
 *
 *  1. **The boot settle races the install.** The town's lamps settle 60 game-
 *     seconds after the clock starts — five real seconds at 12× — which is
 *     BEFORE a ~100s pack install has finished resolving each street's covering
 *     locality (`getLightingLocalityPath`, set at `onCreate`). So a
 *     freshly-booted midnight world settles nothing, and the next settle is the
 *     following sunset — ~1.5 real hours away, past any drive. The live game
 *     lights the valley at that first sunset; a five-minute wire run cannot
 *     wait for it, and the sandbox exposes no seam to force a settle (no
 *     `AddressApi`, no `setScale`). So over the socket the lamps read *stand
 *     cold*, exactly as envelope's funded crossing did.
 *  2. **No `BankingApi`.** The producer paid, the general store not — the tax
 *     split, the sourced appropriation — turns on money the sandbox cannot move.
 *
 * ⭐ So what the socket proves is the **wiring**: the valley's ways declare the
 * lighting service, the `lamps` detail binds, and the mixin renders a coherent,
 * epoch-correct state — never "you don't see any lamps", never "broken". The
 * LIT behaviour, the seniority drawdown and the money are proven where they can
 * be:
 *
 *  - the settle lighting via a supply, and a cut/dry supply darkening live —
 *    `platform/Locality.lighting.test.ts` (the goods leg, `isServingNow`, the
 *    own-treasury source);
 *  - the store covering streets in order and burning the cost, a dry store dark
 *    — `energy/FuelStore.test.ts`;
 *  - the producer's rows and the tax split — `terminus/oilworks.test.ts`,
 *    `BankingLogic`'s suite.
 *
 * Stage B (the grid) extends this file — see the B4 wave.
 */

import { describe as suite, it, expect, beforeAll, afterAll } from 'vitest';
import {
  Session,
  declareFile,
  uniqueHandle,
  plain,
} from '../src/harness';

export const DIRTY_REASON =
  "the boot settle burns a night of Heart's Delight's founding oil out of " +
  'its store — a few litres, not produced again in a five-minute run';

declareFile({
  file: 'energy.dirty.wire.test.ts',
  packs: [
    'platform',
    'world-seed',
    'terminus',
    'hearts-delight',
    'trade-fuel',
    'energy',
    'trade-shopkeeping',
    'trade-haulage',
    'distribution',
    'hinkley-hills',
  ],
  dirtyReason: DIRTY_REASON,
});

const VALLEY_GATE =
  '/world/terminus/hearts-delight/location/valley-gate';
const MILLSITE = '/world/terminus/hearts-delight/location/millsite';
const LOBBY = '/world/terminus/mayfield-row/seznick-house/lobby';
const AVENUE = '/world/terminus/counting-houses/avenue-block';
const HINKLEY = '/world/terminus/hinkley-hills/location/lane';

const open: Session[] = [];
const squash = (s: string): string => s.replace(/\s+/g, ' ').trim();

async function at(where: string, tag: string, wizard = false): Promise<Session> {
  const s = await Session.open(uniqueHandle(`energy-${tag}`), {
    startLocation: where,
    ...(wizard ? { wizard: true } : {}),
  });
  open.push(s);
  return s;
}

async function say(s: Session, cmd: string): Promise<string> {
  return squash(plain(await (await s.cmd(cmd)).said()));
}

/**
 * The lamps burn only after dusk, so every "burning" assertion needs the
 * clock in the dark. `t = 0` is a moonless midnight; the wire world restores
 * its clock from the DB, so a used dev DB can walk into the afternoon. Assert
 * it rather than assume it (the envelope drive's lesson).
 */
async function assertItIsDark(s: Session): Promise<void> {
  const sky = squash(plain(await (await s.cmd('analyze sky')).said()));
  const night =
    !/daylight/i.test(sky) && /night|below the horizon|twilight/i.test(sky);
  if (!night) {
    throw new Error(
      'energy drive: the world clock is NOT in the small hours — ' +
        `'analyze sky' says "${sky}". The gas-lamp assertions need dusk. ` +
        'The wire world restores its clock from the database, so drop it ' +
        'and re-run:\n    pnpm --filter @saxonberg/server reset:db',
    );
  }
}

afterAll(() => {
  for (const s of open) s?.close();
});

// ───────────── the valley is oil-lit, and it burns its own oil ─────────────

suite('⭐⭐ Heart\'s Delight is oil-lit — burning real oil, at boot', () => {
  let gate: Session;
  let mill: Session;

  beforeAll(async () => {
    gate = await at(VALLEY_GATE, 'gate');
    mill = await at(MILLSITE, 'mill');
    await assertItIsDark(gate);
  }, 180_000);

  it('⭐ drive 1 — the valley gate declares gas lamps, and reads a coherent state', async () => {
    await gate.drainProse();
    const lamps = await say(gate, 'look lamps');
    // eslint-disable-next-line no-console -- the drive's own record
    console.log('  [drive] valley-gate lamps:', lamps);
    // ⭐ The wiring: the detail BINDS (not "you don't see any lamps"), the
    // authored gaslamp prose renders, and the mixin appends a real lighting
    // state — burning, or standing cold (the boot-settle wall, above), but
    // NEVER "broken" and never a bare miss. This is the gas epoch, present and
    // legible; the LIT case is `Locality.lighting.test.ts` + `FuelStore.test.ts`.
    expect(lamps).not.toMatch(/don't see any|can't make out any/i);
    expect(lamps).toMatch(/gaslamp|standard/i);
    expect(lamps).toMatch(/lamps are burning|stand cold/i);
    expect(lamps).not.toMatch(/broken/i);
    // ⭐ The epoch, derived off a lamp: the valley's OWN oil, never a shop —
    // whether the standards are lit or waiting for the next sunset settle.
    expect(lamps).toMatch(/oil|own oil/i);
  });

  it('⭐ drive 1 — the junior street carries the same service', async () => {
    await mill.drainProse();
    const lamps = await say(mill, 'look lamps');
    // eslint-disable-next-line no-console -- the drive's own record
    console.log('  [drive] millsite lamps:', lamps);
    expect(lamps).not.toMatch(/don't see any|can't make out any/i);
    expect(lamps).toMatch(/gaslamp|standard/i);
    expect(lamps).toMatch(/lamps are burning|stand cold/i);
  });
});

/**
 * ⚠ What the lamp reads above already PROVE, transitively — and why the
 * store and the works are not driven with their own `look` here.
 *
 * `look lamps` burning "fed from the town's oil store" cannot be true unless
 * the whole chain ran: the `FuelStore` stood up, held its founding oil, the
 * boot settle asked it `lightStreets`, it covered the streets and burned the
 * cost, and the derived source label reached the street's detail. That one
 * live sentence is the Stage A market, observed.
 *
 * The rest is not drivable over THIS socket, and lives where it can be:
 *
 *  - the STORE's contents and drawdown — it is `fixedInPlace` furniture in a
 *    pitch-dark midnight yard, and objects (unlike street details) are
 *    perception-gated, so `look oil` there sees nothing a session could
 *    assert. Proven by `energy/FuelStore.test.ts` (litres in, litres burned,
 *    a dry store dark).
 *  - the WORKS producing and being PAID — the consign beat and the resale need
 *    game-time and `BankingApi`, neither of which a wire session has (the
 *    envelope wall). Proven structurally by `terminus/oilworks.test.ts` (the
 *    rows cross-reference) and by `BankingLogic`'s suite (the sourced
 *    appropriation and the tax split).
 */

// ───────── Stage B: Terminus is electric, and the epoch is derived ─────────

suite("⭐⭐ Terminus is electric — the grid reaches a home, a cut darkens it", () => {
  let lobby: Session;
  let avenue: Session;

  beforeAll(async () => {
    lobby = await at(LOBBY, 'lobby', true);
    avenue = await at(AVENUE, 'avenue', true);
  }, 180_000);

  it("⭐ drive 4+9 — the lobby reads ELECTRIC, its feeder live", async () => {
    await lobby.drainProse();
    const grid = await say(lobby, 'analyze grid');
    // eslint-disable-next-line no-console -- the drive's own record
    console.log('  [drive] lobby analyze grid:', grid);
    // ⭐ The epoch, DERIVED (no flag): the city draws from the grid. And the
    // premises' own meter: domestic band, its feeder node live. Unlike the
    // settle-raced streetlights, the lamp's power is read live, so this is
    // true at boot.
    expect(grid).toMatch(/electric/i);
    expect(grid).toMatch(/live|domestic/i);
    expect(grid).not.toMatch(/off-grid|oil-lit/i);
  });

  it("⭐ drive 5 — sever the avenue, and the lobby's feeder goes dark; splice brings it back", async () => {
    await avenue.drainProse();
    const sev = await say(avenue, 'sever');
    // eslint-disable-next-line no-console -- the drive's own record
    console.log('  [drive] sever at avenue:', sev);

    await lobby.drainProse();
    const dark = await say(lobby, 'analyze grid');
    // eslint-disable-next-line no-console -- the drive's own record
    console.log('  [drive] lobby after sever:', dark);
    expect(dark).toMatch(/dark/i);

    await avenue.drainProse();
    await avenue.cmd('splice');
    await avenue.drainProse();
    const back = await say(lobby, 'analyze grid');
    expect(back).toMatch(/live/i);
  });
});

suite("⭐ the epoch is derived from what reaches a place — no tech level", () => {
  let hinkley: Session;
  let valley: Session;

  beforeAll(async () => {
    hinkley = await at(HINKLEY, 'hinkley');
    valley = await at(VALLEY_GATE, 'epoch-hd');
  }, 180_000);

  it("drive 7+9 — Hinkley Hills reads OFF-GRID", async () => {
    const grid = await say(hinkley, 'analyze grid');
    // eslint-disable-next-line no-console -- the drive's own record
    console.log('  [drive] hinkley analyze grid:', grid);
    expect(grid).toMatch(/off-grid/i);
    expect(grid).not.toMatch(/electric/i);
  });

  it("drive 9 — Heart's Delight reads GAS-LIT", async () => {
    const grid = await say(valley, 'analyze grid');
    // eslint-disable-next-line no-console -- the drive's own record
    console.log('  [drive] HD analyze grid:', grid);
    // ⭐ `oil-lit` since the fire build: a `FuelStore` holds lamp OIL, and
    // calling that gas-lit named the wrong fuel and the wrong century.
    // `gas-lit` is reserved for a supply that burns a GAS, which the
    // retort and the gasometer have just made possible.
    expect(grid).toMatch(/oil-lit/i);
    expect(grid).not.toMatch(/electric/i);
  });
});
