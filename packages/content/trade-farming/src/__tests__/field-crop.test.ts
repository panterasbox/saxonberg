/**
 * A field holds a crop (cover build W1): the seedbed, the crop's share of
 * the ground, the grub that ends it, and `look`'s words for all of it.
 *
 *   - ploughing turns the sward under: the grass goes, the organic matter
 *     rises, and the field is ploughed for the season;
 *   - the field answers `sow` from that stamp;
 *   - a crop standing takes its ground out of the sward;
 *   - grubbing ends a crop, and a crop leaving leaves stubble;
 *   - `look` reads all of it in words, never numbers.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Field from '../location/Field';
import Plant from '@saxonberg/server/mud/platform/thing/Plant';
import { Reserve } from '@saxonberg/server/mud/lib/reserve';
import {
  SOIL_MOISTURE_RESERVE_KEY,
  SOIL_NITROGEN_RESERVE_KEY,
  SOIL_ORGANIC_MATTER_RESERVE_KEY,
  SOIL_RESERVE_THEME,
} from '@saxonberg/server/mud/lib/husbandry/Soil';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { makeStuff, makeStuffAtPath } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import WorldClockRegistry from '@saxonberg/server/mud/platform/idea/WorldClockRegistry';
import type { GrowthProfileData } from '@saxonberg/server/mud/lib/husbandry/Growing';

const DAY = 86_400;

function profile(): GrowthProfileData {
  return {
    moistureHappyAt: 0.3,
    moistureWiltAt: 0.05,
    litresPerGameDay: 0.12,
    luxHappyAt: 120,
    luxDarkAt: 15,
    rootDemand: { seedling: 0.2, young: 1.0, established: 2.0, mature: 3.0 },
    daysToStage: { young: 14, established: 42, mature: 84 },
    seedRateKgPerM2: 0.015,
    yieldRatio: 6,
  };
}

function field(area = 1000): Field {
  const f = makeStuff(() => new Field());
  f.setAreaM2(area);
  f.installSward();
  for (const [key, cap, now] of [
    [SOIL_MOISTURE_RESERVE_KEY, 45_000, 20_000],
    [SOIL_NITROGEN_RESERVE_KEY, 100, 40],
    [SOIL_ORGANIC_MATTER_RESERVE_KEY, 100, 40],
  ] as const) {
    f.setReserve(
      new Reserve(
        key,
        Quantity.of(cap, key === SOIL_MOISTURE_RESERVE_KEY ? 'L' : '%'),
        Quantity.of(now, key === SOIL_MOISTURE_RESERVE_KEY ? 'L' : '%'),
        SOIL_RESERVE_THEME,
        null,
      ),
    );
  }
  return f;
}

function crop(f: Field, area: number, stage = 'young'): Plant {
  const p = makeStuffAtPath(() => {
    const plant = new Plant();
    plant.setShortDescription('stand of wheat');
    plant.setLifecycleState('alive');
    plant.setProfile(profile());
    plant.setHarvestTemplatePath('/trade/farming/thing/crop/wheat');
    plant.setSownAreaM2(area);
    return plant;
  }, '/trade/farming/thing/plant/_test-wheat');
  ContainmentApi.move(p, f as never);
  (p as unknown as { growthStage: string }).growthStage = stage;
  return p;
}

describe('a field holds a crop', () => {
  let clock: ReturnType<typeof vi.spyOn>;
  let base: number;

  beforeEach(() => {
    if (!StuffApi.findByTemplatePath('/platform/idea/WorldClockRegistry')) {
      makeStuffAtPath(() => new WorldClockRegistry(), '/platform/idea/WorldClockRegistry');
    }
    base = WorldClockApi.getNow().rawValue();
    clock = vi.spyOn(WorldClockApi, 'getNow');
    clock.mockReturnValue(Quantity.of(base, 's'));
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('⭐ ploughing turns the sward under and readies the seedbed', () => {
    const f = field();
    const om = f.organicMatterFraction()!;
    expect(f.standingDryMatterKg()).toBeGreaterThan(0);
    expect(f.sowingRefusal()).toMatch(/not been ploughed/);
    f.turnUnder();
    expect(f.standingDryMatterKg()).toBe(0);
    expect(f.organicMatterFraction()!).toBeGreaterThan(om);
    expect(f.isSeedbedFresh()).toBe(true);
    expect(f.sowingRefusal()).toBeNull();
  });

  it('the seedbed goes back to grass after a season', () => {
    const f = field();
    f.turnUnder();
    clock.mockReturnValue(Quantity.of(base + 100 * DAY, 's'));
    expect(f.isSeedbedFresh()).toBe(false);
    expect(f.sowingRefusal()).toMatch(/gone back to grass/);
  });

  it('a crop of the same kind may always be widened', () => {
    const f = field();
    crop(f, 300);
    expect(f.sowingRefusal()).toBeNull();
  });

  it('⭐ a crop takes its ground out of the sward', () => {
    const f = field(1000);
    crop(f, 400);
    expect(f.getCrop()).not.toBeNull();
    expect(f.cropAreaM2()).toBe(400);
    expect(f.swardAreaM2()).toBe(600);
  });

  it('⭐ grubbing ends a standing crop', async () => {
    const f = field();
    const p = crop(f, 400);
    const destruct = vi.spyOn(StuffApi, 'destruct');
    f.bankWork('clearing', 1, {
      clearing: 4,
      stonePicking: 0,
      draining: 0,
      liming: 0,
    } as never);
    expect(destruct).toHaveBeenCalledWith(p);
  });

  it('a crop leaving leaves stubble, and look says so', () => {
    const f = field();
    const p = crop(f, 400);
    f.turnUnder(); // the sward is bare under and around it
    f.onContainableRemoved(p as never);
    expect(f.stubbleStamp).toBeGreaterThan(0);
  });

  describe('look reads it in words', () => {
    it('names the crop, its share of the field, and its stage', () => {
      const f = field(900);
      crop(f, 300, 'young');
      const lines = f.fieldLines().join(' ');
      expect(lines).toMatch(/stand of wheat grows over about a third of it, a young crop, tillering/i);
      expect(lines).not.toMatch(/\d/);
    });

    it('a ploughed, unsown field reads ploughed for the season', () => {
      const f = field();
      f.turnUnder();
      expect(f.fieldLines().join(' ')).toMatch(/ploughed for the season/);
    });

    it('a cut field reads stubble', () => {
      const f = field();
      f.turnUnder();
      f.stubbleStamp = base;
      expect(f.fieldLines().join(' ')).toMatch(/cut down to the stubble/);
    });

    it('an untouched field reads its grass', () => {
      expect(field().fieldLines().join(' ')).toMatch(/^The grass is /);
    });
  });
});
