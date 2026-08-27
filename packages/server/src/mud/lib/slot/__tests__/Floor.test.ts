import "../../../../test-bootstrap";
import { describe, it, expect } from 'vitest';
import Floor from '../../../platform/thing/Floor';
import { MixinApi } from '../../../api/mixin';
import { Mixins } from '../../mixin';
import { UNBOUNDED_CAPACITY } from '../Slotted';
import { SlottableMixin } from '../Slottable';
import { Idea } from '../../stuff/Idea';
import { makeStuff } from '../../security/__tests__/test-setup';

class Sitter extends SlottableMixin(Idea) {}

describe('Floor', () => {
  it('composes Adornment + Postured + Slotted', () => {
    const floor = makeStuff(() => new Floor());
    expect(MixinApi.isAdornment(floor)).toBe(true);
    expect(MixinApi.isPostured(floor)).toBe(true);
    expect(MixinApi.isSlotted(floor)).toBe(true);
    expect(MixinApi.hasMixin(Floor, Mixins.Adornment)).toBe(true);
    expect(MixinApi.hasMixin(Floor, Mixins.Postured)).toBe(true);
    expect(MixinApi.hasMixin(Floor, Mixins.Slotted)).toBe(true);
  });

  it('accepts the default-floor staticSlots shape with unbounded capacity', () => {
    const floor = makeStuff(() => new Floor());
    floor.setStaticSlots([
      {
        name: 'ground:1',
        accepts: 'SlottableMixin',
        capacity: UNBOUNDED_CAPACITY,
        postures: ['sit', 'lie', 'kneel', 'stand'],
        userFacingDetail: 'floor',
      },
    ]);
    expect(floor.getSlotNames()).toEqual(['ground:1']);
    expect(floor.getAcceptedPostures('ground:1')).toEqual([
      'sit',
      'lie',
      'kneel',
      'stand',
    ]);
  });

  it('multiple sitters share ground:1 (unbounded capacity)', () => {
    const floor = makeStuff(() => new Floor());
    floor.setStaticSlots([
      {
        name: 'ground:1',
        accepts: 'SlottableMixin',
        capacity: UNBOUNDED_CAPACITY,
        postures: ['sit'],
      },
    ]);
    for (let i = 0; i < 10; i++) {
      const s = makeStuff(() => new Sitter());
      floor.occupy(s, 'ground:1');
    }
    expect(floor.getOccupantCount('ground:1')).toBe(10);
  });
});
