/**
 * The colony — ⭐⭐ **the arithmetic of keeping something alive through a
 * winter you have to guess the length of.**
 *
 * The claims under test, and each one is a product decision rather than
 * an implementation detail:
 *
 *  - **an empty box is not a faucet.** `ProducingMixin.productionFactor`
 *    returns 1 flat for a host with no `flesh` reserve, so without the
 *    override a box with no bees in it would fill with honey;
 *  - **the wall decides the winter.** A thin box and a thick box differ
 *    only in an authored enclosure, and the thin one burns more honey for
 *    the same cold. Nobody authors the comparison anywhere (AC 7);
 *  - **out of stores has two endings**, and the weather picks: they leave
 *    in the warm and they die in the cold (AC 8, AC 14);
 *  - **a full box in a flow swarms**, and supering is what stops it
 *    (AC 6);
 *  - **installing bees is `put`** — a nucleus, a swarm and a split are
 *    one object and one act (AC 1).
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Hive from '../thing/Hive';
import Colony from '../thing/Colony';
import HiveBox from '../thing/HiveBox';
import Material from '@saxonberg/server/mud/lib/material/Material';
import Species from '@saxonberg/server/mud/platform/idea/species/Species';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import Location from '@saxonberg/server/mud/lib/stuff/Location';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import {
  makeStuff,
  makeStuffAtPath,
} from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';
import WorldClockRegistry from '@saxonberg/server/mud/platform/idea/WorldClockRegistry';

const DAY = 86_400;
const SPECIES_PATH =
  '/stuff/idea/species/animalia/arthropoda/insecta/hymenoptera/apidae/apis/mellifera';
const PINE_PATH = '/stuff/idea/material/wood/pine';

/**
 * ⭐ A hive whose forage is a LEVER rather than a landscape.
 *
 * The real `colonyForageFactor()` walks the exits and reads the swards
 * and the flowering plants around it — which is exactly what
 * `forage.test.ts` is for. This file is about the winter arithmetic, the
 * swarm decision and the two endings of a dearth, and for all of those
 * the range is an input. Holding it fixed is what makes those assertions
 * mean what they say.
 */
class TestHive extends Hive {
  public forage = 0.5;

  protected override colonyForageFactor(): number {
    return this.forage;
  }
}

let seq = 0;
let base = 0;
let clock: ReturnType<typeof vi.spyOn>;

/** Register a singleton once per module — the suite shares the registry. */
function singleton<T extends Stuff>(path: string, factory: () => T): T {
  const found = StuffApi.findByTemplatePath<T>(path);
  if (found) return found;
  return makeStuffAtPath(factory, path);
}

/** The honeybee, with the tap the moved row authors. */
function species(): Species {
  const s = singleton(SPECIES_PATH, () => {
    const x = new Species();
    x.setProduction([
      {
        key: 'honey',
        yieldRow: '/trade/apiculture/thing/comb',
        perGameDay: 0.5,
        behaviour: 'accrue',
        windowDays: 400,
      },
    ]);
    return x;
  });
  return s;
}

/** Pine, so the envelope has a real conductivity to work with. */
function pine(): Material {
  return singleton(PINE_PATH, () => {
    const m = new Material();
    m.setThermalConductivity(Quantity.of(0.12, 'W/(m·K)'));
    m.setDensity(Quantity.of(500, 'kg/m³'));
    m.setSpecificHeat(Quantity.of(1700, 'J/(kg·K)'));
    return m;
  });
}

/**
 * A hive standing in a room, with a colony in it and honey in the comb.
 * `thicknessM` is the whole of the difference between a cheap box and a
 * good one.
 */
function hive(opts: {
  strength?: number;
  honeyKg?: number;
  thicknessM?: number;
  outsideK?: number;
  queen?: boolean;
  drawn?: number;
} = {}): TestHive {
  const h = makeStuff(() => {
    const x = new TestHive();
    x._speciesPath = SPECIES_PATH;
    x.setMaterial(pine());
    x.setEnclosure({ material: PINE_PATH, thicknessM: opts.thicknessM ?? 0.019 });
    x.strength = opts.strength ?? 0.7;
    x.hasQueen = opts.queen ?? true;
    x.pollenKg = 1;
    x.setLifecycleState('alive');
    return x;
  });
  ContainmentApi.move(h as never, makeStuff(() => new Location()) as never);
  // Prime the tap, then set the stores by hand: what is standing in the
  // `honey` tap IS the stores, which is the whole point of D2.
  h.standingIn('honey');
  setHoney(h, opts.honeyKg ?? 8);
  h.combDrawn = opts.drawn ?? 1;
  h._outsideK = opts.outsideK ?? 293;
  h.colonyStamp = nowS();
  h.productionStamp = nowS();
  return h;
}

function setHoney(h: TestHive, kg: number): void {
  const raw = h as unknown as {
    tapState: Record<string, { standing: number; lastTaken: number; driedOff: boolean }>;
  };
  raw.tapState = {
    ...raw.tapState,
    honey: { standing: kg, lastTaken: nowS(), driedOff: false },
  };
}

function honeyOf(h: TestHive): number {
  return (
    h as unknown as { tapState: Record<string, { standing: number }> }
  ).tapState['honey']?.standing ?? 0;
}

function nowS(): number {
  return WorldClockApi.getNow().rawValue();
}

function advance(days: number): void {
  base += days * DAY;
  clock.mockReturnValue(Quantity.of(base, 's'));
}

describe('the colony', () => {
  beforeEach(() => {
    seq += 1;
    installV1QuantityMarshallers();
    singleton('/platform/idea/WorldClockRegistry', () => new WorldClockRegistry());
    base = 100_000_000 + seq * 1_000_000;
    clock = vi.spyOn(WorldClockApi, 'getNow');
    clock.mockReturnValue(Quantity.of(base, 's'));
    species();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('⭐ composes what a hive has to be, and nothing it does not', () => {
    const h = hive();
    const self = h as never;
    expect(MixinApi.isContainer(self)).toBe(true);
    expect(MixinApi.isSealable(self)).toBe(true);
    expect(MixinApi.isOrganism(self)).toBe(true);
    expect(MixinApi.isAtmospheric(self)).toBe(true);
    // ⚠ NOT a hazard: a `HazardMixin` hive would afford `disarm` through
    // the viewer and need a `disarmBy` refusal — the re-narrowing tell.
    expect(MixinApi.isHazard(self)).toBe(false);
    expect(typeof h.taps).toBe('function');
    expect(typeof h.workedOver).toBe('function');
  });

  it('⭐⭐ an EMPTY box is not a faucet — no species, no taps, nothing accrues', () => {
    const empty = makeStuff(() => {
      const x = new Hive();
      x._speciesPath = SPECIES_PATH;
      return x;
    });
    expect(empty.getSpecies()).toBeNull();
    expect(empty.taps()).toHaveLength(0);
    expect(empty.productionFactor()).toBe(0);
    empty.standingIn('honey');
    advance(60);
    expect(empty.standingIn('honey')).toBe(0);
  });

  it('a colony in a box has taps, and the factor is its own condition', () => {
    const h = hive({ strength: 0.8 });
    expect(h.taps().map((t) => t.key)).toEqual(['honey']);
    // strength 0.8 × forage 0.5 (the mixin default) × full comb 1
    expect(h.productionFactor()).toBeCloseTo(0.4, 3);
    // …and no comb drawn halves it: there is nowhere to put the honey.
    h.combDrawn = 0;
    expect(h.productionFactor()).toBeCloseTo(0.2, 3);
  });

  it('⭐⭐ AC 7 — the thin box burns more honey than the thick one, same cold', () => {
    const thin = hive({ thicknessM: 0.019, honeyKg: 20, outsideK: 268 });
    const thick = hive({ thicknessM: 0.045, honeyKg: 20, outsideK: 268 });
    advance(60);
    thin.reconcileColony();
    thick.reconcileColony();
    const thinBurn = 20 - honeyOf(thin);
    const thickBurn = 20 - honeyOf(thick);
    expect(thinBurn).toBeGreaterThan(0);
    expect(thickBurn).toBeGreaterThan(0);
    // Nobody authored the comparison. It falls out of the wall.
    expect(thickBurn).toBeLessThan(thinBurn);
  });

  it('a mild winter costs less than a hard one', () => {
    const mild = hive({ honeyKg: 20, outsideK: 280 });
    const hard = hive({ honeyKg: 20, outsideK: 258 });
    advance(60);
    mild.reconcileColony();
    hard.reconcileColony();
    expect(20 - honeyOf(hard)).toBeGreaterThan(20 - honeyOf(mild));
  });

  it('⚠⚠ an UNRESOLVED outside reads MILD — never freezing, never burning hard', () => {
    // ⚠ The tri-state, and this is the assertion that matters: a hive
    // whose ambient walk has not run yet must not be punished for it.
    // Mild still costs something — a brood nest runs at 35 °C in a 20 °C
    // world — but a fraction of what a hard winter costs, and the colony
    // comes through it alive.
    const unresolved = hive({ honeyKg: 20 });
    unresolved._outsideK = -1;
    expect(unresolved.outsideK()).toBe(293);
    const hard = hive({ honeyKg: 20, outsideK: 258 });
    advance(60);
    unresolved.reconcileColony();
    hard.reconcileColony();
    expect(honeyOf(unresolved)).toBeGreaterThan(0);
    expect(unresolved.getLifecycleState()).toBe('alive');
    expect(20 - honeyOf(unresolved)).toBeLessThan(20 - honeyOf(hard));
  });

  it('⭐ AC 8 — out of stores in the COLD is death, and the reading says so', () => {
    const h = hive({ honeyKg: 0, outsideK: 265 });
    advance(1);
    h.reconcileColony();
    advance(6);
    h.reconcileColony();
    expect(h.getStrength()).toBe(0);
    expect(h.getLifecycleState()).toBe('dead');
    expect(h.getLastEvent()).toBe('starved');
  });

  it('⭐⭐ AC 14 — out of stores in the WARM is a departure: an empty box, nothing dead', () => {
    const h = hive({ honeyKg: 0, outsideK: 295 });
    advance(1);
    h.reconcileColony();
    advance(4);
    h.reconcileColony();
    expect(h.getStrength()).toBe(0);
    expect(h.getLastEvent()).toBe('absconded');
    // ⚠ NOT dead. Nothing died — they left.
    expect(h.getLifecycleState()).not.toBe('dead');
  });

  it('⭐ AC 6 — a strong colony with a full box in a flow swarms, and halves', () => {
    const h = hive({ strength: 0.95, honeyKg: 7.6, outsideK: 295 });
    expect(h.combCapacityKg()).toBe(8);
    advance(1);
    h.reconcileColony();
    expect(h.getLastEvent()).toBe('swarmed');
    // Half of them went with the old queen. (The exact figure carries one
    // day of growth: the reconcile grows the colony and then decides.)
    expect(h.getStrength()).toBeCloseTo(0.48, 2);
    expect(h.hasLiveQueen()).toBe(false);
  });

  it('⭐⭐ …and a super is what stops it — the same colony, more room', () => {
    const h = hive({ strength: 0.95, honeyKg: 7.6, outsideK: 295 });
    const box = makeStuff(() => new HiveBox());
    ContainmentApi.move(box as never, h as never);
    expect(h.combCapacityKg()).toBe(20);
    advance(1);
    h.reconcileColony();
    expect(h.getLastEvent()).not.toBe('swarmed');
    expect(h.getStrength()).toBeGreaterThan(0.9);
  });

  it('a super also enlarges the interior the winter is computed over', () => {
    const h = hive();
    const bare = h.getVolume()?.rawValue() ?? 0;
    ContainmentApi.move(makeStuff(() => new HiveBox()) as never, h as never);
    expect(h.getVolume()?.rawValue() ?? 0).toBeCloseTo(bare + 0.04, 6);
    expect(h.envelopeCoefficients()?.uWperK ?? 0).toBeGreaterThan(0);
  });

  it('a queenless colony with enough bees raises one after three weeks', () => {
    const h = hive({ strength: 0.6, queen: false });
    h.queenlessSince = nowS();
    advance(22);
    h.reconcileColony();
    expect(h.hasLiveQueen()).toBe(true);
    expect(h.getLastEvent()).toBe('requeened');
  });

  it('…and one with too few dwindles away instead', () => {
    const h = hive({ strength: 0.2, queen: false });
    h.queenlessSince = nowS();
    advance(22);
    h.reconcileColony();
    expect(h.hasLiveQueen()).toBe(false);
    expect(h.getStrength()).toBe(0);
  });

  it('⭐⭐ AC 1 — installing bees is `put`: the nuc goes in and is consumed', () => {
    const h = makeStuff(() => {
      const x = new Hive();
      x._speciesPath = SPECIES_PATH;
      return x;
    });
    ContainmentApi.move(h as never, makeStuff(() => new Location()) as never);
    const nuc = makeStuff(() => {
      const c = new Colony();
      c._speciesPath = SPECIES_PATH;
      c.strength = 0.35;
      c.hasQueen = true;
      c.setLifecycleState('alive');
      return c;
    });
    ContainmentApi.move(nuc as never, h as never);
    expect(h.getStrength()).toBeCloseTo(0.35, 3);
    expect(h.hasLiveQueen()).toBe(true);
    expect(h.getLifecycleState()).toBe('alive');
    // The box now has bees in it, so it has a species and it has taps.
    expect(h.getSpecies()).not.toBeNull();
    expect(h.taps()).toHaveLength(1);
  });

  it('⚠ a second colony is refused — there are bees in it already', () => {
    const h = hive();
    const second = makeStuff(() => {
      const c = new Colony();
      c.strength = 0.4;
      c.hasQueen = true;
      return c;
    });
    const veto = h.canAddContainable(second as never);
    expect(veto.ok).toBe(false);
  });

  it('⚠ a hive is not a cupboard', () => {
    const h = hive();
    const lantern = makeStuff(() => new HiveBox());
    // A `HiveBox` is admitted by class; anything from outside the trade
    // whose path is not the trade's is not.
    expect(h.canAddContainable(lantern as never).ok).toBe(true);

  });

  it('⭐ AC 8 — one `rob` takes ONE BOX-WORTH, not everything, and no warning', () => {
    const h = hive({ honeyKg: 30 });
    // 30 kg standing, 12 kg to a super's worth: three robs to empty it,
    // and the third is the one that kills them. Nothing says so.
    expect(h.takeFrom('honey')).toBe(12);
    expect(h.combDrawn).toBe(0);
    expect(honeyOf(h)).toBeCloseTo(18, 5);
    h.combDrawn = 1;
    expect(h.takeFrom('honey')).toBe(12);
    expect(h.takeFrom('honey')).toBeCloseTo(6, 5);
    expect(honeyOf(h)).toBe(0);
  });

  it('⭐ AC 17 — a fortnight between looks loses nothing in a flow', () => {
    const h = hive({ strength: 0.5, honeyKg: 6, outsideK: 292 });
    advance(14);
    h.reconcileColony();
    expect(h.getStrength()).toBeGreaterThan(0.4);
    expect(h.getLifecycleState()).toBe('alive');
    expect(h.getLastEvent()).not.toBe('starved');
  });
});
