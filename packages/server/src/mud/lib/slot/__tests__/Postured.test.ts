import { describe, it, expect, beforeEach } from 'vitest';
import { PosturedMixin, Postures } from '../Postured';
import { SlottedMixin } from '../Slotted';
import { Idea } from '../../stuff/Idea';
import { MixinApi } from '../../../api/mixin';
import { Mixins } from '../../mixin';
import { makeStuff } from '../../security/__tests__/test-setup';

class Bed extends PosturedMixin(SlottedMixin(Idea)) {}

describe('PosturedMixin', () => {
  let bed: Bed;
  beforeEach(() => {
    bed = makeStuff(() => new Bed());
    bed.setStaticSlots([
      {
        name: 'lie:1',
        accepts: 'SlottableMixin',
        postures: ['lie', 'sit'],
      },
      {
        name: 'sit:1',
        accepts: 'SlottableMixin',
        postures: ['sit'],
      },
      {
        name: 'mount:1',
        accepts: 'SlottableMixin',
        // NOT posture-bearing
      },
    ]);
  });

  it('passes the MixinApi.isPostured predicate', () => {
    expect(MixinApi.isPostured(bed)).toBe(true);
    expect(MixinApi.hasMixin(bed, Mixins.Postured)).toBe(true);
  });

  it('getAcceptedPostures returns the slot-side decoration', () => {
    expect(bed.getAcceptedPostures('lie:1')).toEqual(['lie', 'sit']);
    expect(bed.getAcceptedPostures('sit:1')).toEqual(['sit']);
    expect(bed.getAcceptedPostures('mount:1')).toEqual([]);
  });

  it('getAcceptedPostures returns empty for unknown slot', () => {
    expect(bed.getAcceptedPostures('nope')).toEqual([]);
  });

  it('getSlotsAcceptingPosture returns the slots accepting that posture', () => {
    expect(bed.getSlotsAcceptingPosture('sit')).toEqual(['lie:1', 'sit:1']);
    expect(bed.getSlotsAcceptingPosture('lie')).toEqual(['lie:1']);
    expect(bed.getSlotsAcceptingPosture('stand')).toEqual([]);
  });
});

describe('Postures constants', () => {
  it('is a frozen const-object', () => {
    expect(Object.isFrozen(Postures)).toBe(true);
  });

  it('exposes the v1 vocabulary', () => {
    expect(Postures.Stand).toBe('stand');
    expect(Postures.Sit).toBe('sit');
    expect(Postures.Lie).toBe('lie');
    expect(Postures.Kneel).toBe('kneel');
    expect(Postures.Mounted).toBe('mounted');
  });
});
