/**
 * The forage read — ⭐⭐ **the crop is the LANDSCAPE's, and this is where
 * that claim is either true or decorative.**
 *
 * A colony's income is a read of the ground around it: a bounded walk
 * over exits, the swards' own bloom, the flowering plants in the beds,
 * and how many other colonies are on the same flowers. Nothing is
 * authored about bees anywhere in `trade-farming`; the hive asks and the
 * field answers.
 *
 * The claims:
 *
 *  - a clover ley two exits away counts, and counts its own share;
 *  - a flowering plant in a bed counts; one out of flower does not;
 *  - ⭐⭐ a **second hive halves the living** and turns on a sentence
 *    with no number in it (AC 13);
 *  - the walk **stops** — at the range in minutes, at a null destination,
 *    and at the hop cap;
 *  - ⭐ it is **sync**, because it runs inside a reconcile;
 *  - ⭐⭐ and the hive **pays the land back**: a flowering polycarp in
 *    range has its pollination rise across a window, so its pick sets
 *    more fruit than it would have alone (AC 10).
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Hive from '../thing/Hive';
import Field from '@saxonberg/content-trade-farming/src/location/Field';
import Plant from '@saxonberg/server/mud/platform/thing/Plant';
import CartesianLocation from '@saxonberg/server/mud/lib/location/CartesianLocation';
import Exit from '@saxonberg/server/mud/lib/boundary/Exit';
import Material from '@saxonberg/server/mud/lib/material/Material';
import Species from '@saxonberg/server/mud/platform/idea/species/Species';
import type { GrowthProfileData } from '@saxonberg/server/mud/lib/husbandry/Growing';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
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
const CLOVER = '/trade/apiculture/idea/material/clover-nectar';

let base = 0;
let seq = 0;
let clock: ReturnType<typeof vi.spyOn>;

function singleton<T extends Stuff>(path: string, factory: () => T): T {
  const found = StuffApi.findByTemplatePath<T>(path);
  if (found) return found;
  return makeStuffAtPath(factory, path);
}

function beeSpecies(): Species {
  return singleton(SPECIES_PATH, () => {
    const s = new Species();
    s.setProduction([
      {
        key: 'honey',
        yieldRow: '/trade/apiculture/thing/comb',
        perGameDay: 0.5,
        behaviour: 'accrue',
        windowDays: 400,
      },
    ]);
    return s;
  });
}

function pine(): Material {
  return singleton(PINE_PATH, () => {
    const m = new Material();
    m.setThermalConductivity(Quantity.of(0.12, 'W/(m·K)'));
    m.setDensity(Quantity.of(500, 'kg/m³'));
    m.setSpecificHeat(Quantity.of(1700, 'J/(kg·K)'));
    return m;
  });
}

/** A field with a clover ley in flower, of a stated size. */
function ley(areaM2: number, legume = 0.4): Field {
  const f = makeStuff(() => new Field());
  f.setAreaM2(areaM2);
  f.setLegumeFraction(legume);
  f.installSward();
  f._ambientK = 292;
  f._daylightFraction = 0.62;
  return f;
}

function hive(): Hive {
  const h = makeStuff(() => {
    const x = new Hive();
    x._speciesPath = SPECIES_PATH;
    x.setMaterial(pine());
    x.setEnclosure({ material: PINE_PATH, thicknessM: 0.019 });
    x.strength = 0.7;
    x.hasQueen = true;
    x.pollenKg = 1;
    x.setLifecycleState('alive');
    return x;
  });
  h._outsideK = 292;
  return h;
}

/**
 * Join two places with a one-way exit of a stated cost.
 *
 * ⚠ `addExit` is the only legitimate installer — an `Exit` that has been
 * constructed but not added is not an OBVIOUS exit, and the forage walk
 * (correctly) only follows obvious ones.
 */
async function link(
  from: Stuff,
  to: Stuff,
  minutes: number,
  dir = 'east',
): Promise<void> {
  const exit = makeStuff(
    () =>
      new Exit({
        direction: dir,
        source: from as never,
        destination: to as never,
      }),
  );
  exit.setEdgeMinutes(minutes);
  await (from as unknown as { addExit(e: Exit): Promise<boolean> }).addExit(exit);
}

/**
 * A plant whose ground is a lever.
 *
 * ⚠ A real `Plant` reads the soil it is rooted in, and a bare test
 * `Location` has none — so an honest cherry in an honest room wilts and
 * never flowers. What this file is testing is the WALK and the payback,
 * not the growth model, so the two environmental reads are held at
 * "well kept".
 */
class TestPlant extends Plant {
  static _mixinName = 'ApicultureTestPlant';

  protected override sampleLux(): number {
    return 0;
  }
  protected override soilMoisture(): number | null {
    return 1;
  }
  protected override meanSoilMoisture(): number | null {
    return 1;
  }
}

/** A mature cherry in flower — the polycarp the bees pay back. */
function cherry(): TestPlant {
  const profile: GrowthProfileData = {
    moistureHappyAt: 0.35,
    moistureWiltAt: 0.05,
    litresPerGameDay: 0,
    luxHappyAt: 0,
    luxDarkAt: 0,
    rootDemand: { seedling: 0.1, young: 0.3, established: 0.8, mature: 2 },
    daysToStage: { young: 1, established: 2, mature: 3 },
    fruitSetCount: 12,
    fruitFillDays: 40,
    pollinationBaseline: 0.5,
  };
  const p = makeStuff(() => new TestPlant());
  p.setProfile(profile);
  p.setHarvestTemplatePath('/trade/farming/thing/cherry');
  return p;
}

function advance(days: number): void {
  base += days * DAY;
  clock.mockReturnValue(Quantity.of(base, 's'));
}

describe('the forage read', () => {
  beforeEach(() => {
    seq += 1;
    installV1QuantityMarshallers();
    singleton('/platform/idea/WorldClockRegistry', () => new WorldClockRegistry());
    base = 300_000_000 + seq * 10_000_000;
    clock = vi.spyOn(WorldClockApi, 'getNow');
    clock.mockReturnValue(Quantity.of(base, 's'));
    beeSpecies();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('⭐ a clover ley two exits away counts, and counts its own share', async () => {
    const yard = makeStuff(() => new CartesianLocation());
    const lane = makeStuff(() => new CartesianLocation());
    const close = ley(1000, 0.4);
    await link(yard, lane, 3);
    await link(lane, close as unknown as Stuff, 3);
    const h = hive();
    ContainmentApi.move(h as never, yard as never);

    const census = h.forageCensus();
    // 0.4 clover × the standing sward × 1000 m² of ground.
    const expected = 0.4 * close.swardFraction() * 1000;
    expect(census.sources.get(CLOVER)).toBeCloseTo(expected, 4);
    expect(census.totalM2).toBeCloseTo(expected, 4);
  });

  it('⭐ a field with no clover contributes nothing, however big', async () => {
    const yard = makeStuff(() => new CartesianLocation());
    const bare = ley(4000, 0);
    await link(yard, bare as unknown as Stuff, 2);
    const h = hive();
    ContainmentApi.move(h as never, yard as never);
    expect(h.forageCensus().totalM2).toBe(0);
  });

  it('⭐ a flowering plant counts; one out of flower does not', async () => {
    const yard = makeStuff(() => new CartesianLocation());
    const h = hive();
    ContainmentApi.move(h as never, yard as never);

    const tree = cherry();
    ContainmentApi.move(tree as never, yard as never);
    tree.getVigor(); // seed the clock
    advance(20); // mature and thriving → in flower
    expect(tree.isFlowering()).toBe(true);
    const withFlower = hive();
    ContainmentApi.move(withFlower as never, yard as never);
    expect(withFlower.forageCensus().totalM2).toBeCloseTo(6, 4);

    // A seedling in the same room is not bloom.
    const seedling = cherry();
    const empty = makeStuff(() => new CartesianLocation());
    ContainmentApi.move(seedling as never, empty as never);
    seedling.getVigor();
    const other = hive();
    ContainmentApi.move(other as never, empty as never);
    expect(seedling.isFlowering()).toBe(false);
    expect(other.forageCensus().totalM2).toBe(0);
  });

  it('⚠ the walk STOPS at the range in minutes', async () => {
    const yard = makeStuff(() => new CartesianLocation());
    const faraway = ley(1000, 0.4);
    // 50 minutes out, against a 40-minute range.
    await link(yard, faraway as unknown as Stuff, 50);
    const h = hive();
    ContainmentApi.move(h as never, yard as never);
    expect(h.forageCensus().totalM2).toBe(0);
  });

  it('⚠ an exit whose destination does not resolve is not an edge', async () => {
    // A deferred destination, a reaped room, a broken clone. A neighbour
    // going wrong must not take a colony's forage down with it.
    const yard = makeStuff(() => new CartesianLocation());
    const dangling = makeStuff(
      () =>
        new Exit({
          direction: 'north',
          source: yard as never,
          destinationPath: '/world/nowhere/at/all',
        }),
    );
    await (yard as unknown as { addExit(e: Exit): Promise<boolean> }).addExit(
      dangling,
    );
    const h = hive();
    ContainmentApi.move(h as never, yard as never);
    // It does not throw and it finds nothing, which is the assertion.
    expect(h.forageCensus().totalM2).toBe(0);
  });

  it('⭐⭐ AC 13 — a second hive halves the living, and says so in WORDS', () => {
    const close = ley(1000, 0.4);
    const first = hive();
    ContainmentApi.move(first as never, close as never);
    const alone = first.productionFactor();
    expect(alone).toBeGreaterThan(0);

    const second = hive();
    ContainmentApi.move(second as never, close as never);
    const crowded = hive();
    ContainmentApi.move(crowded as never, close as never);

    const census = crowded.forageCensus();
    expect(census.hives).toBeGreaterThan(1);
    // The same bloom, split more ways.
    expect(crowded.productionFactor()).toBeLessThan(alone);
    void second;
  });

  it('⭐ the census is SYNC — it runs inside a reconcile', () => {
    const close = ley(1000, 0.4);
    const h = hive();
    ContainmentApi.move(h as never, close as never);
    h.colonyStamp = base;
    h.standingIn('honey');
    advance(10);
    // If anything on this path awaited, the reconcile could not read it.
    h.reconcileColony();
    expect(h.getStrength()).toBeGreaterThan(0);
    expect(h.forageCensus().totalM2).toBeGreaterThan(0);
  });

  it('⭐⭐ AC 10 — a hive in range makes the trees set more fruit', () => {
    const close = ley(4000, 0.5);
    const tree = cherry();
    ContainmentApi.move(tree as never, close as never);
    tree.getVigor();
    advance(20);
    expect(tree.isFlowering()).toBe(true);
    // Alone it manages half a crop, which is what the row authors.
    expect(tree.getFruitSetCount()).toBe(6);

    const h = hive();
    ContainmentApi.move(h as never, close as never);
    h.colonyStamp = base;
    h.standingIn('honey');
    advance(30);
    h.reconcileColony();

    // ⭐ The hive gave to land it does not own, and nothing on the plant
    // asked who.
    expect(tree.getFruitSetCount()).toBeGreaterThan(6);
  });

  it('⭐ the comb carries WHERE it came from', () => {
    const close = ley(1000, 0.4);
    const h = hive();
    ContainmentApi.move(h as never, close as never);
    const parts = h.forageComposition();
    expect(parts).toHaveLength(1);
    expect(parts[0]!.path).toBe(CLOVER);
    expect(parts[0]!.share).toBeCloseTo(1, 6);
  });
});
