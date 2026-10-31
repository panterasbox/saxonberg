/**
 * ⭐⭐ Paint is a mixture (paint D8): its color is its pigments' by share ×
 * hiding power over the binder's own body; a litre lays a thickness by the
 * share that stays when it sets; and a look names binder, pigment and
 * color with no number in it.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, afterEach } from 'vitest';
import Material from '../Material';
import { Paint } from '../Paint';
import { StuffApi } from '../../../api/stuff';
import { makeStuffAtPath } from '../../security/__tests__/test-setup';

function row(path: string, name: string, fill: (m: Material) => void = () => undefined): string {
  makeStuffAtPath(() => {
    const m = new Material();
    m.setName(name);
    fill(m);
    return m;
  }, path);
  return path;
}

afterEach(() => StuffApi.clearAll());

describe('a paint is what went into it', () => {
  it('yellow ochre in linseed oil reads yellow, and its look names all three', () => {
    const oil = row('/x/linseed-oil', 'linseed oil', (m) => m.setCoatWord('painted'));
    const ochre = row('/x/yellow-ochre', 'yellow ochre', (m) =>
      m.setPigment({ transmitR: 0.88, transmitG: 0.78, transmitB: 0.3, hidingPower: 0.9, lightfastness: 1 }),
    );
    const p = new Paint({ binder: oil, pigments: [{ material: ochre, share: 1 }], solidsFraction: 0.6 });
    expect(p.colorTag()).toMatch(/yellow|gold|straw/);
    expect(p.words()).toMatch(/yellow ochre in linseed oil/);
    expect(p.words()).not.toMatch(/\d/);
    expect(p.coatWord()).toBe('painted');
  });

  it('a strong pigment dominates a weak one in a mix', () => {
    const oil = row('/x/oil', 'oil');
    const black = row('/x/lampblack', 'lampblack', (m) =>
      m.setPigment({ transmitR: 0.08, transmitG: 0.08, transmitB: 0.09, hidingPower: 1, lightfastness: 1 }),
    );
    const white = row('/x/chalk', 'chalk', (m) =>
      m.setPigment({ transmitR: 0.95, transmitG: 0.95, transmitB: 0.93, hidingPower: 0.2, lightfastness: 1 }),
    );
    const p = new Paint({ binder: oil, pigments: [{ material: black, share: 0.3 }, { material: white, share: 0.7 }], solidsFraction: 0.6 });
    expect(p.colour().lightness()).toBeLessThan(0.5);
  });

  it('litres and thickness are the solids arithmetic', () => {
    const p = new Paint({ binder: row('/x/b', 'b'), pigments: [], solidsFraction: 0.5 });
    expect(p.litresFor(100, 0.00002)).toBeCloseTo(4, 6);
    expect(p.thicknessFor(4, 100)).toBeCloseTo(0.00002, 9);
  });

  it('lightfastness is its least fast pigment', () => {
    const lake = row('/x/lake', 'madder lake', (m) =>
      m.setPigment({ transmitR: 0.8, transmitG: 0.2, transmitB: 0.3, hidingPower: 0.4, lightfastness: 0.2 }),
    );
    const ochre = row('/x/ochre', 'ochre', (m) =>
      m.setPigment({ transmitR: 0.88, transmitG: 0.78, transmitB: 0.3, hidingPower: 0.9, lightfastness: 1 }),
    );
    const p = new Paint({ binder: row('/x/e', 'egg'), pigments: [{ material: lake, share: 0.5 }, { material: ochre, share: 0.5 }], solidsFraction: 0.4 });
    expect(p.lightfastness()).toBe(0.2);
  });
});
