/**
 * ⭐⭐ The fabric holds while the coat does (paint D5/D13, folded into
 * `Durable` at review): a building kept painted stays sound; once the
 * weather has taken the coat, its condition wears at the shipped slope
 * (half the scale in `daysToWorn`), and the cause line reads off the coat.
 * Restoring the condition leaves the coat as it was.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import PigmentPaint from '../../../platform/idea/material/PigmentPaint';
import { FacedMixin } from '../../material/Faced';
import { DurableMixin } from '../../material/Durable';
import { Idea } from '../../stuff/Idea';
import type { Stuff } from '../../stuff/Stuff';
import { StuffApi } from '../../../api/stuff';
import { BiomeApi } from '../../../api/biome';
import { WorldClockApi } from '../../../api/worldclock';
import { Quantity } from '../../quantity';
import { makeStuff, makeStuffAtPath } from '../../security/__tests__/test-setup';
import { vi } from 'vitest';

let landing: Stuff;

/** A building's outside as the twins compose it: a face, a condition, the dial. */
class House extends DurableMixin(FacedMixin(Idea)) {
  static _mixinName = 'ConditionTestHouse';
  public override weatherScope(): Stuff | null {
    return landing;
  }
  public override weatherExposureAt(): number {
    return 1;
  }
  public override bareWearPerDay(): number {
    return 0.5 / 45;
  }
  public override getCondition(): number {
    this.reconcileWeather();
    return super.getCondition();
  }
}

const DAY = 86_400;
let now = 1_000_000;

let oil: string;
beforeEach(() => {
  now = 1_000_000;
  vi.spyOn(WorldClockApi, 'getNow').mockImplementation(() => Quantity.of(now, 's'));
  vi.spyOn(BiomeApi, 'airSegmentsFor').mockImplementation((_s, from, to) => [
    { durationS: to - from, air: { tempK: 285, humidityPct: 70 }, rainMmPerH: 0 } as never,
  ]);
  landing = makeStuff(() => new Idea());
  oil = '/stuff/idea/material/_shell/oil';
  makeStuffAtPath(() => {
    const m = new PigmentPaint();
    m.setName('oil paint');
    m.setWeatheringMPerGameYear(0.00001);
    return m;
  }, oil);
});

afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('the fabric under the coat', () => {
  it('a coated building stays sound however long it stands', () => {
    const h = makeStuff(() => new House());
    h.setCoats({ outside: [{ material: oil, thicknessM: 0.00004, state: 'set' }] });
    h.getConditionWord();
    now += 200 * DAY;
    expect(h.getConditionWord()).toBe('sound');
    expect(h.weatherCause()).toBeNull();
  });

  it('a bare one wears: half the scale in daysToWorn, the cause read off the coat', () => {
    const h = makeStuff(() => new House());
    h.getConditionWord();
    now += 45 * DAY;
    expect(h.getCondition()).toBeCloseTo(0.5, 3);
    expect(h.getConditionWord()).toBe('worn');
    expect(h.weatherCause()).toMatch(/paint has gone/);
    expect(h.weatherCause()).not.toMatch(/\d/);
  });

  it('wears only from the moment the last coat wore through', () => {
    const h = makeStuff(() => new House());
    // A year's coat: gone 360 days in, then 45 days bare.
    h.setCoats({ outside: [{ material: oil, thicknessM: 0.00001, state: 'set' }] });
    h.getConditionWord();
    now += 405 * DAY;
    expect(h.getCondition()).toBeCloseTo(0.5, 2);
    expect(h.coatGone()).toBe(true);
  });

  it('a thin coat says the paint is going', () => {
    const h = makeStuff(() => new House());
    h.setCoats({ outside: [{ material: oil, thicknessM: 0.000005, state: 'set' }] });
    expect(h.weatherCause()).toMatch(/paint is going/);
  });

  it('a wet oil coat is still curing, faintly warm', () => {
    const h = makeStuff(() => new House());
    h.setCoats({
      outside: [{ material: oil, thicknessM: 0.00005, state: 'wet', paint: { binder: oil, pigments: [], solidsFraction: 0.6 } }],
    });
    const m = StuffApi.findByTemplatePath<PigmentPaint>(oil)!;
    m.setKinetics([{ key: 'set', sets: 'oxidation', order: 0, rate: [[293, 0.05]] }]);
    expect(h.weatherCause()).toMatch(/still curing/);
  });

  it('restoring the condition leaves the coat as it was', () => {
    const h = makeStuff(() => new House());
    h.getConditionWord();
    now += 60 * DAY;
    expect(h.getConditionWord()).not.toBe('sound');
    h.setCondition(1);
    expect(h.getConditionWord()).toBe('sound');
    expect(h.coatGone()).toBe(true);
  });

  it('⭐ Law 2: a durable good with no coat, out in the rain, does not wear', () => {
    class Tool extends DurableMixin(FacedMixin(Idea)) {
      static _mixinName = 'ConditionTestTool';
      public override weatherScope(): Stuff | null {
        return landing;
      }
    }
    const t = makeStuff(() => new Tool());
    t.reconcileWeather();
    now += 360 * DAY;
    t.reconcileWeather();
    expect(t.getCondition()).toBe(1);
  });
});
