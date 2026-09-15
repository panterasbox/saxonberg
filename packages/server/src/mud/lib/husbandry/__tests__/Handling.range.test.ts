/**
 * The species handling range — ⭐ **winnability rides the existing slot.**
 *
 * `HandlingMixin` has always decayed to one module constant and clamped
 * to one ceiling for every animal alike. Those two numbers are the
 * species' business, and the ranching build left the slot empty on
 * purpose ("per-species floor and ceiling authored nowhere yet").
 *
 * ⚠ The silent-species fallback is the load-bearing test here: every
 * shipped head of stock authors nothing, and none of their behaviour may
 * change until somebody declares a range.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { HandlingMixin } from '../Handling';
import { OrganismMixin } from '../../species/Organism';
import Species from '../../../platform/idea/species/Species';
import Thing from '../../stuff/Thing';
import WorldClockRegistry from '../../../platform/idea/WorldClockRegistry';
import { StuffApi } from '../../../api/stuff';
import { makeStuff, makeStuffAtPath } from '../../security/__tests__/test-setup';

class Beast extends HandlingMixin(OrganismMixin(Thing)) {}
/** A handling host that is NOT an organism — a rack, a training dummy. */
class Inanimate extends HandlingMixin(Thing) {}

let seq = 0;
function speciesWith(range: { floor: number; ceiling: number } | null): Species {
  seq += 1;
  const sp = makeStuffAtPath(
    () => new Species(),
    `/stuff/idea/species/_test/range-${seq}`,
  ) as Species;
  sp.setHandlingRange(range);
  return sp;
}

function clock(): void {
  makeStuffAtPath(
    () => new WorldClockRegistry(),
    '/platform/idea/WorldClockRegistry',
  );
}

beforeEach(() => StuffApi.clearAll());
afterEach(() => StuffApi.clearAll());

describe('the ceiling', () => {
  it('a declared ceiling stops handling rising past it', () => {
    clock();
    const b = makeStuff(() => new Beast());
    b.setSpecies(speciesWith({ floor: 0.15, ceiling: 0.6 }));
    for (let i = 0; i < 200; i++) b.handle(1);
    expect(b.getHandling()).toBeLessThanOrEqual(0.6 + 1e-9);
    expect(b.getHandling()).toBeCloseTo(0.6, 3);
  });

  it('⚠ a silent species keeps the shipped behaviour — anything reaches 1', () => {
    clock();
    const b = makeStuff(() => new Beast());
    b.setSpecies(speciesWith(null));
    for (let i = 0; i < 400; i++) b.handle(1);
    expect(b.getHandling()).toBeGreaterThan(0.9);
  });

  it('a non-organism handling host is unaffected', () => {
    // The factory's base constraint is a bare Stuff: a rack can be
    // "handled" and has no species to consult.
    clock();
    const r = makeStuff(() => new Inanimate());
    for (let i = 0; i < 400; i++) r.handle(1);
    expect(r.getHandling()).toBeGreaterThan(0.9);
  });
});

describe('the floor', () => {
  it('⭐ declared-unwinnable is a state an author can express', () => {
    // `{ floor: 0, ceiling: 0.2 }` says out loud "this will never be
    // tame", which is different from saying nothing at all.
    clock();
    const b = makeStuff(() => new Beast());
    b.setSpecies(speciesWith({ floor: 0, ceiling: 0.2 }));
    for (let i = 0; i < 400; i++) b.handle(1);
    expect(b.getHandling()).toBeCloseTo(0.2, 3);
  });
});

describe('the setter defends the range', () => {
  it('clamps into 0..1 and orders a transposed pair', () => {
    const sp = speciesWith({ floor: 0.9, ceiling: 0.2 });
    expect(sp.getHandlingRange()).toEqual({ floor: 0.2, ceiling: 0.9 });
    sp.setHandlingRange({ floor: -3, ceiling: 42 });
    expect(sp.getHandlingRange()).toEqual({ floor: 0, ceiling: 1 });
  });
});
