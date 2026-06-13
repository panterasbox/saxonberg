/**
 * PosturedMixin.restQuality — the recovery multiplier a body reads off
 * the host whose posture slot it occupies. Default 1.0 (open ground),
 * strictly-positive setter invariant, and round-trips as a persistent
 * field (the `transmissionFactor`-on-Vessel pattern; NOT on SlotSpec).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PosturedMixin } from '../Postured';
import { SlottedMixin } from '../Slotted';
import { Idea } from '../../stuff/Idea';
import { MixinApi } from '../../../api/mixin';
import { makeStuff } from '../../security/__tests__/test-setup';

class Bed extends PosturedMixin(SlottedMixin(Idea)) {
  static _mixinName = 'Bed';
}

describe('PosturedMixin.restQuality', () => {
  let bed: Bed;
  beforeEach(() => {
    bed = makeStuff(() => new Bed());
  });

  it('defaults to 1.0 when unauthored', () => {
    expect(bed.getRestQuality()).toBe(1.0);
  });

  it('accepts a value > 1 (a comfortable bed)', () => {
    bed.setRestQuality(2.5);
    expect(bed.getRestQuality()).toBe(2.5);
  });

  it('rejects 0, negatives, and non-finite values', () => {
    expect(() => bed.setRestQuality(0)).toThrow(RangeError);
    expect(() => bed.setRestQuality(-1)).toThrow(RangeError);
    expect(() => bed.setRestQuality(Number.NaN)).toThrow(RangeError);
    expect(() => bed.setRestQuality(Infinity)).toThrow(RangeError);
    // Unchanged after the rejected writes.
    expect(bed.getRestQuality()).toBe(1.0);
  });

  it('lists restQuality as a persistent field (round-trips)', () => {
    const fields = MixinApi.getAllPersistentFields(
      bed.constructor as new (...args: never[]) => unknown,
    );
    expect(fields).toContain('restQuality');
    // The Hydrator's Phase-1 dispatch prefers the set<Field> method;
    // simulate that path.
    bed.setRestQuality(1.3);
    expect(bed.getRestQuality()).toBe(1.3);
  });
});
