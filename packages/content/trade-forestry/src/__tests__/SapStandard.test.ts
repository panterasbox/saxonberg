/**
 * SapStandard — **the spiles, the girth, and the two phases of one
 * verb.**
 *
 * The claims no row test can reach, because they are about the object:
 *
 *  1. ⭐ `productionFactor()` is `spiles × vigor`, so an untapped tree
 *     gives NOTHING, a second spile doubles the run, and a bad year
 *     slows it — three behaviours, no extra mechanism.
 *  2. ⭐⭐ `maxSpiles()` is the GIRTH: a seedling takes none, an
 *     established stem one, a mature one two. The refusal is a fact
 *     about this tree that a player can see, not a cooldown.
 *  3. ⭐ `tap` is *set a spile* or *draw what has run*, decided by the
 *     tree — one act to a person.
 *  4. ⚠ Every out-of-season refusal is in the tree's own words, with
 *     **no digit** and **never the noun `tap`** (which is bound on nine
 *     bar fixtures).
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import SapStandard from '../thing/SapStandard';
import Species from '@saxonberg/server/mud/platform/idea/species/Species';
import type { TapSpec } from '@saxonberg/server/mud/platform/idea/species/Species';
import Material from '@saxonberg/server/mud/lib/material/Material';
import Tool from '@saxonberg/server/mud/platform/thing/Tool';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { CelestialApi } from '@saxonberg/server/mud/api/celestial';
import { EARTH_LIKE } from '@saxonberg/server/mud/lib/time/CelestialProfile';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { Idea } from '@saxonberg/server/mud/lib/stuff/Idea';
import { NamedMixin } from '@saxonberg/server/mud/lib/description/Named';
import { ContainerMixin } from '@saxonberg/server/mud/lib/spatial/Container';
import { ContainableMixin } from '@saxonberg/server/mud/lib/spatial/Containable';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { makeStuff, makeStuffAtPath } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';
import WorldClockRegistry from '@saxonberg/server/mud/platform/idea/WorldClockRegistry';

const DAY = 86_400;
const SPECIES_PATH = '/stuff/idea/species/_test/sap-tree';
const SPILE_PATH = '/trade/forestry/thing/spile';

class Hands extends ContainerMixin(ContainableMixin(NamedMixin(Idea))) {
  static _mixinName = 'SapStandardTestHands';
}

const SAP: TapSpec[] = [
  {
    key: 'sap',
    yieldRow: '/stuff/idea/material/food/birch-sap',
    perGameDay: 3,
    behaviour: 'accrue',
    windowDays: 4,
    yieldShape: 'volume',
    window: {
      kind: 'weather',
      daylightFrom: 0.4,
      daylightTo: 0.5,
      rising: true,
      // ⚠ Wide open on temperature: these cases are about the SPILES,
      // and a thermal band would make them depend on the weather field.
      minK: 100,
      maxK: 900,
    },
  },
];

let clock: ReturnType<typeof vi.spyOn>;
let seq = 0;

function tissue(): Material {
  seq += 1;
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName('plant-tissue');
    m.setSpecificHeat(Quantity.of(3000, 'J/(kg·K)'));
    m.setThermalConductivity(Quantity.of(0.3, 'W/(m·K)'));
    return m;
  }, `/stuff/idea/material/_test/sap-tissue-${seq}`) as unknown as Material;
}

/** Game-seconds of the first day in a RISING band inside [from, to]. */
function springDay(from = 0.4, to = 0.5): number {
  const frac = (d: number): number =>
    CelestialApi.daylightSecondsFor(EARTH_LIKE, CelestialApi.CAMPUS_LATITUDE, d * DAY) /
    EARTH_LIKE.dayLengthSeconds;
  for (let d = 2; d < 360; d++) {
    const f = frac(d);
    if (f > from && f < to && f > frac(d - 1)) return d * DAY;
  }
  throw new Error('no rising spring day in the year');
}
/**
 * …and the year's SHORTEST day, which is reliably outside the band.
 *
 * ⚠ Not "the first day below `from − 0.05`": at this latitude (42°) the
 * daylength fraction never leaves roughly 0.37–0.63, so a threshold
 * below 0.35 is unreachable and the search threw. Taking the argmin is
 * both correct and independent of where the band happens to sit.
 */
function winterDay(): number {
  const frac = (d: number): number =>
    CelestialApi.daylightSecondsFor(EARTH_LIKE, CelestialApi.CAMPUS_LATITUDE, d * DAY) /
    EARTH_LIKE.dayLengthSeconds;
  let best = 2;
  for (let d = 2; d < 360; d++) if (frac(d) < frac(best)) best = d;
  return best * DAY;
}

function at(gameS: number): void {
  clock.mockReturnValue(Quantity.of(gameS, 's'));
}

function tree(stage = 'mature'): SapStandard {
  const t = makeStuff(() => {
    const p = new SapStandard();
    p.setShortDescription('birch sapling');
    p.setMaterial(tissue());
    p.setMass(Quantity.of(40, 'kg'));
    p.setLastAmbientK(290);
    p.setLifecycleState('alive');
    p._speciesPath = SPECIES_PATH;
    p.setProfile({
      moistureHappyAt: 0.25,
      moistureWiltAt: 0.05,
      litresPerGameDay: 0.35,
      luxHappyAt: 20,
      luxDarkAt: 3,
      rootDemand: { seedling: 0.5, young: 3, established: 8, mature: 16 },
      daysToStage: { young: 270, established: 1080, mature: 2880 },
    });
    const raw = p as unknown as { growthStage: string; _vigor: number };
    raw.growthStage = stage;
    raw._vigor = 1;
    return p;
  });
  t.reconcileProduction();
  return t;
}

function auger(): Tool {
  return makeStuff(() => {
    const t = new Tool();
    t.setShortDescription('tapping auger');
    t.setCapabilities(['boring']);
    return t;
  });
}

function handsWith(items: Array<{ spile?: boolean }> = []): Hands {
  const h = makeStuff(() => {
    const x = new Hands();
    x.setName('Alice');
    return x;
  });
  for (const _ of items) {
    const s = makeStuffAtPath(() => {
      const thing = new SapStandard();
      thing.setShortDescription('spile');
      thing.setMaterial(tissue());
      thing.setMass(Quantity.of(0.05, 'kg'));
      return thing;
    }, `${SPILE_PATH}`);
    ContainmentApi.move(s as never, h as never);
  }
  return h;
}

describe('a tree you tap', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    // ⚠ Load-bearing: `Producing.nowSeconds()` resolves the clock by
    // TEMPLATE PATH, so without a registry standing at that path it
    // returns null, `reconcileProduction` bails, and every accrual
    // assertion passes for the wrong reason (nothing ever fills).
    makeStuffAtPath(
      () => new WorldClockRegistry(),
      '/platform/idea/WorldClockRegistry',
    );
    makeStuffAtPath(
      () => {
        const sp = new Species();
        sp.setProduction(SAP);
        return sp;
      },
      SPECIES_PATH,
    );
    clock = vi.spyOn(WorldClockApi, 'getNow');
    at(springDay());
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('⭐⭐ the GIRTH decides how many spiles, and a seedling takes none', () => {
    expect(tree('seedling').maxSpiles()).toBe(0);
    expect(tree('young').maxSpiles()).toBe(0);
    expect(tree('established').maxSpiles()).toBe(1);
    expect(tree('mature').maxSpiles()).toBe(2);
  });

  it('⭐⭐ an UNTAPPED tree gives nothing at all — no spile, no sap', () => {
    const t = tree();
    expect(t.getSpiles()).toBe(0);
    expect(t.productionFactor()).toBe(0);
    at(springDay() + 5 * DAY);
    expect(t.standingIn('sap')).toBe(0);
  });

  it('⭐⭐ a SECOND spile doubles the run, and that is the only dial', () => {
    const one = tree();
    const two = tree();
    (one as unknown as { spiles: number }).spiles = 1;
    (two as unknown as { spiles: number }).spiles = 2;
    expect(one.productionFactor()).toBeCloseTo(1, 5);
    expect(two.productionFactor()).toBeCloseTo(2, 5);
    at(springDay() + 2 * DAY);
    expect(two.standingIn('sap')).toBeCloseTo(2 * one.standingIn('sap'), 3);
  });

  it('⭐ a tree having a BAD YEAR runs slower, through the same factor', () => {
    const well = tree();
    const poorly = tree();
    for (const t of [well, poorly]) (t as unknown as { spiles: number }).spiles = 1;
    (poorly as unknown as { _vigor: number })._vigor = 0.4;
    expect(poorly.productionFactor()).toBeLessThan(well.productionFactor());
  });

  it('⭐⭐ `tap` SETS a spile when nothing has run, and consumes it', async () => {
    const t = tree();
    const hands = handsWith([{ spile: true }]);
    const plan = await t.planTap(hands as never, 'sap', auger(), null, null);
    expect(plan.kind).toBe('plan');
    if (plan.kind !== 'plan') return;
    expect((plan.token as { phase: string }).phase).toBe('set');

    const result = await t.completeTap(hands as never, 'sap', null, null, plan.token);
    expect(t.getSpiles()).toBe(1);
    // ⭐ The spile is GONE — that is what makes over-tapping cost
    // something rather than being free.
    expect(hands.getContents().length).toBe(0);
    expect(result.credit?.discipline).toBe('silviculture');
  });

  it('⚠ setting needs the AUGER, and the refusal names it', async () => {
    const t = tree();
    const hands = handsWith([{ spile: true }]);
    const plan = await t.planTap(hands as never, 'sap', null, null, null);
    expect(plan.kind).toBe('refusal');
    if (plan.kind !== 'refusal') return;
    expect(plan.reason).toBe('no-tool');
    expect(plan.prose).toMatch(/auger/i);
  });

  it('⚠ setting needs a SPILE, and the refusal names that too', async () => {
    const t = tree();
    const plan = await t.planTap(handsWith() as never, 'sap', auger(), null, null);
    expect(plan.kind).toBe('refusal');
    if (plan.kind !== 'refusal') return;
    expect(plan.reason).toBe('no-spile');
    expect(plan.prose).toMatch(/spile/i);
  });

  it('⭐⭐⭐ OVER-TAPPING is refused at the GIRTH, and nothing is damaged', async () => {
    const t = tree();
    (t as unknown as { spiles: number }).spiles = 2;
    const plan = await t.planTap(
      handsWith([{ spile: true }]) as never,
      'sap',
      auger(),
      null,
      null,
    );
    expect(plan.kind).toBe('refusal');
    if (plan.kind !== 'refusal') return;
    expect(plan.reason).toBe('girth');
    expect(plan.prose).toMatch(/girth/i);
    // ⚠ Nothing happened to the tree: no wound, no state change, and the
    // spile is still in your hand.
    expect(t.getSpiles()).toBe(2);
  });

  it('a stem too slender says so differently from one that is full', async () => {
    const slender = tree('young');
    const full = tree();
    (full as unknown as { spiles: number }).spiles = 2;
    const a = await slender.planTap(handsWith([{ spile: true }]) as never, 'sap', auger(), null, null);
    const b = await full.planTap(handsWith([{ spile: true }]) as never, 'sap', auger(), null, null);
    if (a.kind !== 'refusal' || b.kind !== 'refusal') throw new Error('expected refusals');
    expect(a.prose).not.toBe(b.prose);
    expect(a.prose).toMatch(/slender|grow/i);
  });

  it('⭐ with sap standing, `tap` DRAWS instead — and asks for a vessel', async () => {
    const t = tree();
    (t as unknown as { spiles: number }).spiles = 1;
    at(springDay() + 2 * DAY);
    expect(t.standingIn('sap')).toBeGreaterThan(0);

    const plan = await t.planTap(handsWith() as never, 'sap', auger(), null, null);
    expect(plan.kind).toBe('refusal');
    if (plan.kind !== 'refusal') return;
    // ⭐ Not `no-tool` and not `girth` — the tree has moved to the other
    // phase of the verb, and what it wants now is somewhere to put it.
    expect(plan.reason).toBe('no-vessel');
  });

  it('⚠⚠ out of season the refusal is the TREE’s, has no digit, and never says "tap"', async () => {
    const t = tree();
    (t as unknown as { spiles: number }).spiles = 1;
    at(winterDay());
    const window = t.tapWindow('sap');
    expect(window.open).toBe(false);

    const plan = await t.planTap(
      handsWith([{ spile: true }]) as never,
      'sap',
      auger(),
      null,
      null,
    );
    expect(plan.kind).toBe('refusal');
    if (plan.kind !== 'refusal') return;
    // ⭐ The reason travels as a SEASON, so the controller renders it as
    // information rather than as the player's mistake.
    expect(plan.reason.startsWith('season-')).toBe(true);
    expect(plan.prose).not.toMatch(/\d/);
    // ⚠ And never the noun — it is bound on nine bar fixtures, so a
    // sugaring refusal saying "the tap" could read as being about beer.
    expect(plan.prose.toLowerCase()).not.toMatch(/\btap\b/);
    expect(plan.prose).toMatch(/sap|run|wood|cold|warm/i);
  });

  it('⚠ the season is checked BEFORE the auger — the useful sentence wins', async () => {
    // Boring a hole into a stem that will not run for three months is
    // not a thing to be told about your auger.
    const t = tree();
    at(winterDay());
    const plan = await t.planTap(handsWith() as never, 'sap', null, null, null);
    expect(plan.kind).toBe('refusal');
    if (plan.kind !== 'refusal') return;
    expect(plan.reason.startsWith('season-')).toBe(true);
  });

  it('⭐ `look` says what is in the stem, in words, and the count is visible', () => {
    const t = tree();
    const bare = SapStandard.markupAugmenters[0]!('', t as never, t as never);
    expect(bare).toMatch(/no spile/i);
    (t as unknown as { spiles: number }).spiles = 2;
    const tapped = SapStandard.markupAugmenters[0]!('', t as never, t as never);
    expect(tapped).toMatch(/spiles stand in the trunk/i);
    expect(tapped).toMatch(/not take another/i);
  });

  it('⭐ it affords its OWN verb — the panel does not offer `tap`', () => {
    expect(SapStandard.commandContributions.peers).toContain(
      'trade/forestry/cmd/forestry/tap.yaml',
    );
  });
});
