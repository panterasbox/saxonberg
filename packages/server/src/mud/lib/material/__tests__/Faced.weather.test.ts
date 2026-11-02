/**
 * ⭐⭐ Everything weathers (paint D5): a set coat thins at its material's
 * rate where the weather reaches it, outermost first; two coats last twice
 * as long as one; a coat that set badly goes twice as fast; and the sun
 * fades a fugitive pigment and not a fast one.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, afterEach } from 'vitest';
import Good from '../../stuff/Good';
import Material from '../Material';
import { FacedMixin } from '../Faced';
import { Paint } from '../Paint';
import { Quantity } from '../../quantity';
import { StuffApi } from '../../../api/stuff';
import { makeStuff, makeStuffAtPath } from '../../security/__tests__/test-setup';
import { Idea } from '../../stuff/Idea';
import type { CoatAir } from '../Faced';

class Board extends Good {}
class Wall extends FacedMixin(Idea) {
  static _mixinName = 'WeatheringTestWall';
}

const YEAR = 360 * 86_400;
const year = (n = 1): CoatAir => ({ seconds: n * YEAR, kelvin: 285, rh: 0.7, rain: false, airChange: 1 });

let seq = 0;
function mat(fill: (m: Material) => void): string {
  seq += 1;
  const path = `/stuff/idea/material/_wx/m${seq}`;
  makeStuffAtPath(() => {
    const m = new Material();
    m.setName(`m${seq}`);
    fill(m);
    return m;
  }, path);
  return path;
}

afterEach(() => StuffApi.clearAll());

describe('a coat wears away', () => {
  it('thins at its rate; when it is gone the next coat meets the world', () => {
    const oil = mat((m) => m.setWeatheringMPerGameYear(0.00001));
    const w = makeStuff(() => new Wall());
    w.setCoats({ outside: [{ material: oil, thicknessM: 0.00002, state: 'set' }] });
    expect(w.weatherCoats([year(1)], 1, 0)).toBeNull();
    expect(w.getCoats('outside')[0]!.thicknessM).toBeCloseTo(0.00001, 8);
    const bare = w.weatherCoats([year(2)], 1, 0);
    expect(w.coatGone()).toBe(true);
    expect(bare).toBeCloseTo(YEAR, -3);
  });

  it('two coats last twice as long as one', () => {
    const oil = mat((m) => m.setWeatheringMPerGameYear(0.00001));
    const one = makeStuff(() => new Wall());
    const two = makeStuff(() => new Wall());
    one.setCoats({ outside: [{ material: oil, thicknessM: 0.00002, state: 'set' }] });
    two.setCoats({
      outside: [
        { material: oil, thicknessM: 0.00002, state: 'set' },
        { material: oil, thicknessM: 0.00002, state: 'set' },
      ],
    });
    one.weatherCoats([year(3)], 1, 0);
    two.weatherCoats([year(3)], 1, 0);
    expect(one.coatGone()).toBe(true);
    expect(two.coatGone()).toBe(false);
  });

  it('a crazed coat has opened and goes twice as fast', () => {
    const oil = mat((m) => m.setWeatheringMPerGameYear(0.00001));
    const w = makeStuff(() => new Wall());
    w.setCoats({ outside: [{ material: oil, thicknessM: 0.00002, state: 'crazed' }] });
    w.weatherCoats([year(1.1)], 1, 0);
    expect(w.coatGone()).toBe(true);
  });

  it('indoors nothing wears; a glaze never does', () => {
    const glaze = mat(() => undefined);
    const w = makeStuff(() => new Wall());
    w.setCoats({ outside: [{ material: glaze, thicknessM: 0.0003, state: 'set' }] });
    w.weatherCoats([year(50)], 1, 0);
    expect(w.coatGone()).toBe(false);
    const oil = mat((m) => m.setWeatheringMPerGameYear(0.00001));
    const inside = makeStuff(() => new Wall());
    inside.setCoats({ outside: [{ material: oil, thicknessM: 0.00002, state: 'set' }] });
    inside.weatherCoats([year(50)], 0, 0);
    expect(inside.coatGone()).toBe(false);
  });
});

describe('the sun fades a fugitive pigment', () => {
  it('a lake fades in a sunny window; an ochre stays', () => {
    const binder = mat((m) => m.setLaysCoat(true));
    const lake = mat((m) => m.setPigment({ transmitR: 0.8, transmitG: 0.2, transmitB: 0.3, hidingPower: 0.5, lightfastness: 0.1 }));
    const ochre = mat((m) => m.setPigment({ transmitR: 0.85, transmitG: 0.7, transmitB: 0.25, hidingPower: 0.9, lightfastness: 1 }));
    const panel = makeStuff(() => {
      const b = new Board();
      b.setMass(Quantity.of(1, 'kg'));
      return b;
    });
    const sign = makeStuff(() => {
      const b = new Board();
      b.setMass(Quantity.of(1, 'kg'));
      return b;
    });
    const lakePaint = { binder, pigments: [{ material: lake, share: 1 }], solidsFraction: 0.5 };
    const ochrePaint = { binder, pigments: [{ material: ochre, share: 1 }], solidsFraction: 0.5 };
    panel.setCoats({ outside: [{ material: binder, thicknessM: 0.0001, state: 'set', paint: lakePaint }] });
    sign.setCoats({ outside: [{ material: binder, thicknessM: 0.0001, state: 'set', paint: ochrePaint }] });
    const month = { seconds: 120 * 86_400, kelvin: 293, rh: 0.5, rain: false, airChange: 0.5 };
    panel.weatherCoats([month], 0, 1);
    sign.weatherCoats([month], 0, 1);
    const fadedLake = panel.getCoats('outside')[0]!.faded ?? 0;
    expect(fadedLake).toBeGreaterThan(0.5);
    const fresh = new Paint(lakePaint).colour(0);
    const after = new Paint(lakePaint).colour(fadedLake);
    expect(after.lightness()).toBeGreaterThan(fresh.lightness());
    const o = new Paint(ochrePaint);
    expect(o.colour(sign.getCoats('outside')[0]!.faded ?? 0).nearestTag()).toBe(o.colour(0).nearestTag());
  });
});
