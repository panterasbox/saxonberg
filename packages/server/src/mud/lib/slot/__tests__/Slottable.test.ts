import { describe, it, expect, beforeEach } from 'vitest';
import { SlottedMixin } from '../Slotted';
import { SlottableMixin } from '../Slottable';
import { Idea } from '../../stuff/Idea';
import { MixinApi } from '../../../api/mixin';
import { Mixins } from '../../mixin';
import { makeStuff } from '../../security/__tests__/test-setup';

class Host extends SlottedMixin(Idea) {}
class Occ extends SlottableMixin(Idea) {}

describe('SlottableMixin', () => {
  let host: Host;
  let occ: Occ;

  beforeEach(() => {
    host = makeStuff(() => new Host());
    occ = makeStuff(() => new Occ());
    host.setStaticSlots([{ name: 'sit:1', accepts: 'SlottableMixin' }]);
  });

  it('passes the MixinApi.isSlottable predicate', () => {
    expect(MixinApi.isSlottable(occ)).toBe(true);
    expect(MixinApi.hasMixin(occ, Mixins.Slottable)).toBe(true);
  });

  it('getOccupiedHost returns null when not slotted', () => {
    expect(occ.getOccupiedHost()).toBeNull();
  });

  it('getOccupiedHost returns the host when slotted into one', () => {
    host.occupy(occ, 'sit:1');
    expect(occ.getOccupiedHost()).toBe(host);
  });

  it('getOccupiedHost throws when slotted into multiple hosts', () => {
    const otherHost = makeStuff(() => new Host());
    otherHost.setStaticSlots([{ name: 'sit:1', accepts: 'SlottableMixin' }]);
    host.occupy(occ, 'sit:1');
    otherHost.occupy(occ, 'sit:1');
    expect(() => occ.getOccupiedHost()).toThrow(/multiple|distinct hosts/);
  });
});
