/**
 * ⭐⭐ The fabric holds while the coat does (paint D5/D13): a building kept
 * painted stays sound; once the weather has taken the coat, the fabric
 * wears at the shipped slope (sound → worn in `daysToWorn`), and the cause
 * line reads off the coat. `mendFabric` restores the fabric and leaves the
 * coat.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Material from '../../material/Material';
import { FacedMixin } from '../../material/Faced';
import { WeatheringMixin } from '../../material/Weathering';
import { ShellMixin } from '../Shell';
import { Idea } from '../../stuff/Idea';
import { StuffApi } from '../../../api/stuff';
import { WorldClockApi } from '../../../api/worldclock';
import { Quantity } from '../../quantity';
import { makeStuff, makeStuffAtPath } from '../../security/__tests__/test-setup';
import { vi } from 'vitest';

class House extends ShellMixin(WeatheringMixin(FacedMixin(Idea))) {
  static _mixinName = 'ShellTestHouse';
  public override weatherScope() {
    return null;
  }
}

const DAY = 86_400;
let now = 1_000_000;

let oil: string;
beforeEach(() => {
  now = 1_000_000;
  vi.spyOn(WorldClockApi, 'getNow').mockImplementation(() => Quantity.of(now, 's'));
  oil = '/stuff/idea/material/_shell/oil';
  makeStuffAtPath(() => {
    const m = new Material();
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
    h.conditionBand();
    now += 200 * DAY;
    expect(h.conditionBand()).toBe('sound');
    expect(h.conditionCause()).toBeNull();
  });

  it('a bare one wears: worn in daysToWorn, with the cause read off the coat', () => {
    const h = makeStuff(() => new House());
    h.conditionBand();
    now += 45 * DAY;
    expect(h.conditionBand()).toBe('worn');
    expect(h.conditionCause()).toMatch(/paint has gone; rain has gotten into the sills/);
    expect(h.conditionCause()).not.toMatch(/\d/);
  });

  it('a thin coat says the paint is going', () => {
    const h = makeStuff(() => new House());
    h.setCoats({ outside: [{ material: oil, thicknessM: 0.000005, state: 'set' }] });
    expect(h.conditionCause()).toMatch(/paint is going/);
  });

  it('a wet oil coat is still curing, faintly warm', () => {
    const h = makeStuff(() => new House());
    h.setCoats({
      outside: [{ material: oil, thicknessM: 0.00005, state: 'wet', paint: { binder: oil, pigments: [], solidsFraction: 0.6 } }],
    });
    const m = StuffApi.findByTemplatePath<Material>(oil)!;
    m.setKinetics([{ key: 'set', sets: 'oxidation', order: 0, rate: [[293, 0.05]] }]);
    expect(h.conditionCause()).toMatch(/still curing/);
  });

  it('mending restores the fabric and leaves the coat as it was', () => {
    const h = makeStuff(() => new House());
    h.conditionBand();
    now += 60 * DAY;
    expect(h.conditionBand()).not.toBe('sound');
    h.mendFabric();
    expect(h.conditionBand()).toBe('sound');
    expect(h.coatGone()).toBe(true);
  });
});
