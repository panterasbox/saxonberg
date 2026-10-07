/**
 * `MuscleMixin.work` — the one number the whole butchery chain reads.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, afterEach } from 'vitest';
import Muscle from '../../../platform/idea/material/Muscle';
import { MixinApi } from '../../../api/mixin';
import Material from '../../material/Material';
import { StuffApi } from '../../../api/stuff';
import { makeStuff } from '../../security/__tests__/test-setup';

afterEach(() => StuffApi.clearAll());

describe('MuscleMixin', () => {
  it('⭐ narrows a Muscle and NOT a plain Material', () => {
    const loin = makeStuff(() => new Muscle());
    const granite = makeStuff(() => new Material());
    expect(MixinApi.isMuscle(loin)).toBe(true);
    // ⚠ The point of the subclass: `work` is not a claim about granite,
    // and the generic `tissue/muscle` row is a plain Material too — so
    // this narrowing is "this is the loin", not "there is muscle here".
    expect(MixinApi.isMuscle(granite)).toBe(false);
  });

  it('accepts work across the whole range', () => {
    const m = makeStuff(() => new Muscle());
    for (const w of [0, 0.05, 0.5, 0.95, 1]) {
      expect(() => m.setWork(w)).not.toThrow();
      expect(m.getWork()).toBe(w);
    }
  });

  it('⚠ THROWS outside [0,1] rather than clamping', () => {
    const m = makeStuff(() => new Muscle());
    for (const bad of [-0.1, 1.1, 3, Number.NaN, Number.POSITIVE_INFINITY]) {
      // Clamping a 3 to 1 would make every mis-authored muscle the
      // toughest thing in the world and say nothing about it.
      expect(() => m.setWork(bad)).toThrow(RangeError);
    }
  });

  it('⚠ defaults to 0 — the TENDEREST end, not a plausible middle', () => {
    // An unauthored muscle reads as something that never worked, which a
    // cook notices the first time they try to braise it. A middle default
    // would read as plausible forever.
    expect(makeStuff(() => new Muscle()).getWork()).toBe(0);
  });
});
