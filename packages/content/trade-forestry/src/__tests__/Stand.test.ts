/**
 * The stand (forestry.md § The stand) — **the standing timber as a cover over a
 * place, derived on read and stamped only by the axe.**
 *
 * The claims: the authored `mix:` reads as authored with no clock; the
 * increment runs at the moisture factor (full at ≥ 0.35 of capacity,
 * half at half that, the Field's drought curve) and is capped at
 * capacity; a cut settles, takes one, stamps, and refuses when nothing
 * whole stands; the increment continues from zero; the plantings ledger
 * is idempotent on the tree; the reading is words, never a number; and
 * the transpiration figure is what the soil hook drinks by.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StandMixin, STAND_MIXIN, type StandSpecies } from '../lib/Stand';
import { Idea } from '@saxonberg/server/mud/lib/stuff/Idea';
import { ReservedMixin, Reserve } from '@saxonberg/server/mud/lib/reserve';
import { SoilMixin, SOIL_MOISTURE_RESERVE_KEY } from '@saxonberg/server/mud/lib/husbandry/Soil';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { CommandApi } from '@saxonberg/server/mud/api/command';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { makeStuff, makeStuffAtPath } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import WorldClockRegistry from '@saxonberg/server/mud/platform/idea/WorldClockRegistry';

const DAY = 86_400;
const YEAR = 360 * DAY;

const OAK = '/stuff/idea/species/plantae/tracheophyta/magnoliopsida/fagales/fagaceae/quercus/robur';
const ASH = '/stuff/idea/species/plantae/tracheophyta/magnoliopsida/lamiales/oleaceae/fraxinus/excelsior';

function oak(over: Partial<StandSpecies> = {}): StandSpecies {
  return {
    speciesPath: OAK,
    name: 'oak',
    woodMaterialPath: '/stuff/idea/material/wood/oak',
    seedPath: '/trade/forestry/thing/seed/acorn',
    standing: 8,
    capacity: 10,
    incrementPerYear: 1,
    ...over,
  };
}
function ash(over: Partial<StandSpecies> = {}): StandSpecies {
  return {
    speciesPath: ASH,
    name: 'ash',
    woodMaterialPath: '/stuff/idea/material/wood/ash',
    seedPath: '/trade/forestry/thing/seed/ash-key',
    standing: 4,
    capacity: 6,
    incrementPerYear: 1,
    ...over,
  };
}

/** A stand over soil — the Wood's shape, without the room. */
class TestClearing extends StandMixin(SoilMixin(ReservedMixin(Idea))) {
  static _mixinName = 'TestClearing';
}
/** A stand with NO soil — the unmodelled case reads as 1. */
class BareStand extends StandMixin(ReservedMixin(Idea)) {
  static _mixinName = 'BareStand';
}

describe('the stand', () => {
  let clock: ReturnType<typeof vi.spyOn>;
  let base: number;

  const advance = (gameSeconds: number): void => {
    clock.mockReturnValue(Quantity.of(base + gameSeconds, 's'));
  };

  function clearing(moistureFraction = 1): TestClearing {
    const c = makeStuff(() => new TestClearing());
    c.setReserve(
      new Reserve(
        SOIL_MOISTURE_RESERVE_KEY,
        Quantity.of(4500, 'L'),
        Quantity.of(4500 * moistureFraction, 'L'),
        'cultivation',
        null,
      ),
    );
    c.setMix([oak(), ash()]);
    return c;
  }

  beforeEach(() => {
    makeStuffAtPath(() => new WorldClockRegistry(), '/platform/idea/WorldClockRegistry');
    base = WorldClockApi.getNow().rawValue();
    clock = vi.spyOn(WorldClockApi, 'getNow');
    clock.mockReturnValue(Quantity.of(base, 's'));
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('is nameable as a pack mixin, and affords `fell` inward to whoever stands in it', () => {
    const c = clearing();
    expect(MixinApi.isActive(c, STAND_MIXIN)).toBe(true);
    const verbs = (bucket: 'self' | 'inventory' | 'environment' | 'peers'): string[] =>
      CommandApi.collectContributions(TestClearing, bucket).map((d) => d.verbs).flat();
    expect(verbs('self')).toContain('fell');
    expect(verbs('inventory')).toContain('fell');
    // NOT outward — for a location those reach the zone and the neighbours.
    expect(verbs('environment')).not.toContain('fell');
    expect(verbs('peers')).not.toContain('fell');
  });

  it('reads the authored figures until something stamps', () => {
    const c = clearing();
    // No stamp yet: the row is what stands.
    expect(c.standingNow(c.getMix()[0]!)).toBe(8);
    advance(5 * YEAR);
    expect(c.standingNow(c.getMix()[0]!)).toBe(8);
    expect(c.getStandStamp()).toBe(0);
  });

  it('⭐ a cut settles, takes one, stamps — and the increment runs from there', () => {
    const c = clearing();
    const sp = c.getMix()[0]!;
    expect(c.cut(OAK, base, '/platform/agent/Avatar/x')).toBe(true);
    expect(c.standingNow(sp)).toBe(7);
    expect(c.getStandStamp()).toBe(base);
    expect(c.getCutLog()).toHaveLength(1);
    // A year at full moisture: one tree's worth back.
    advance(YEAR);
    expect(c.standingNow(sp)).toBeCloseTo(8, 5);
    // …and capped at what the ground carries.
    advance(10 * YEAR);
    expect(c.standingNow(sp)).toBe(10);
  });

  it('⭐ the increment answers to the SOIL — half the moisture curve, half the trees', () => {
    const wet = clearing(1);
    const dry = clearing(0.175); // half of the 0.35 happy point
    wet.cut(OAK, base, 'a');
    dry.cut(OAK, base, 'a');
    advance(YEAR);
    expect(wet.standingNow(wet.getMix()[0]!)).toBeCloseTo(8, 5);
    expect(dry.standingNow(dry.getMix()[0]!)).toBeCloseTo(7.5, 5);
    expect(dry.standGrowthFactor()).toBeCloseTo(0.5, 5);
  });

  it('no soil composed means UNMODELLED, which is 1 — never zero', () => {
    const b = makeStuff(() => new BareStand());
    b.setMix([oak()]);
    expect(b.standGrowthFactor()).toBe(1);
    b.cut(OAK, base, 'a');
    advance(YEAR);
    expect(b.standingNow(b.getMix()[0]!)).toBeCloseTo(8, 5);
  });

  it('⭐⭐ cut to nothing, it refuses — and only the years put a tree back', () => {
    const c = clearing();
    c.setMix([oak({ standing: 2, capacity: 10 })]);
    expect(c.cut(OAK, base, 'a')).toBe(true);
    expect(c.cut(OAK, base, 'a')).toBe(true);
    expect(c.hasStanding()).toBe(false);
    expect(c.cut(OAK, base, 'a')).toBe(false);
    expect(c.getCutLog()).toHaveLength(2);
    // Half a year: half a tree — still nothing whole.
    advance(YEAR / 2);
    expect(c.hasStanding()).toBe(false);
    expect(c.cut(OAK, base + YEAR / 2, 'a')).toBe(false);
    // A full year from the last cut: one whole.
    advance(YEAR);
    expect(c.hasStanding()).toBe(true);
    expect(c.cut(OAK, base + YEAR, 'a')).toBe(true);
  });

  it('a cut of one species settles the OTHER to its derived figure too', () => {
    const c = clearing();
    c.cut(ASH, base, 'a');
    advance(YEAR);
    c.cut(OAK, base + YEAR, 'a');
    // Ash: 4 − 1 + 1 year = 4, settled into `standing` by the oak cut.
    expect(c.getMix()[1]!.standing).toBeCloseTo(4, 5);
    expect(c.getMix()[0]!.standing).toBeCloseTo(8, 5); // 8 + 1 − 1
  });

  it('names a species by the word a player uses, plural or not, and picks the thickest bare', () => {
    const c = clearing();
    expect(c.speciesNamed('oak')?.name).toBe('oak');
    expect(c.speciesNamed('oaks')?.name).toBe('oak');
    expect(c.speciesNamed('Ash')?.name).toBe('ash');
    expect(c.speciesNamed('beech')).toBeNull();
    expect(c.thickestSpecies()?.name).toBe('oak');
  });

  it('the plantings ledger is idempotent on the tree, and removable', () => {
    const c = clearing();
    const p = { plantKey: 'k1', name: 'an oak sapling', planter: '/platform/agent/Avatar/t', planterName: 'Tam Ferrier', speciesPath: OAK, gameDay: 3 };
    c.recordPlanting(p);
    c.recordPlanting({ ...p });
    expect(c.getPlantings()).toHaveLength(1);
    c.removePlanting('k1');
    expect(c.getPlantings()).toHaveLength(0);
  });

  it('the transpiration figure is the standing count times a broadleaf’s drink', () => {
    const c = clearing();
    expect(c.standTranspirationPerGameDay()).toBe((8 + 4) * 120);
  });

  describe('the reading', () => {
    const viewer = (): Stuff => makeStuff(() => new Idea()) as unknown as Stuff;

    it('is WORDS — a founding mix reads as trees’ worth, old, planted by nobody alive', () => {
      const c = clearing();
      const text = c.standPhrase();
      expect(text).toBe(
        "Oak stands here — about eight trees' worth, old, planted by nobody alive. Ash — about four trees' worth.",
      );
      expect(text).not.toMatch(/\d/);
    });

    it('renders into the host’s `look` through the mixin’s augmenter', () => {
      const c = clearing();
      const text = Mml.augment('A clearing.', c as unknown as Stuff, viewer());
      expect(text).toMatch(/^A clearing\.\n\nOak stands here/);
    });

    it('a planting reads with the name, the planter and the day', () => {
      const c = clearing();
      c.recordPlanting({ plantKey: 'k', name: 'an oak sapling', planter: 'p', planterName: 'Tam Ferrier', speciesPath: OAK, gameDay: 363 });
      expect(c.standPhrase()).toMatch(
        /An oak sapling, planted by Tam Ferrier on the 4th day of the 2nd year\./,
      );
    });

    it('⭐ an empty stand says so in words about the wood', () => {
      const c = clearing();
      c.setMix([oak({ standing: 0 }), ash({ standing: 0 })]);
      expect(c.standPhrase()).toBe('Nothing stands here that is worth the axe — stumps and brash.');
      c.recordPlanting({ plantKey: 'k', name: 'an oak sapling', planter: 'p', planterName: 'Tam', speciesPath: OAK, gameDay: 0 });
      expect(c.standPhrase()).toMatch(/^Nothing stands here that is worth the axe — stumps, brash, and the saplings somebody planted\. An oak sapling/);
    });
  });
});
