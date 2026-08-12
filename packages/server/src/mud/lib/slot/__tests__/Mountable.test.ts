import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach } from 'vitest';
import { MountableMixin } from '../Mountable';
import { SlottedMixin } from '../Slotted';
import { SlottableMixin } from '../Slottable';
import { Idea } from '../../stuff/Idea';
import { MixinApi } from '../../../api/mixin';
import { Mixins } from '../../mixin';
import { makeStuff } from '../../security/__tests__/test-setup';

class Horse extends MountableMixin(SlottedMixin(Idea)) {}
class Rider extends SlottableMixin(Idea) {}

describe('MountableMixin', () => {
  let horse: Horse;
  let rider: Rider;

  beforeEach(() => {
    horse = makeStuff(() => new Horse());
    rider = makeStuff(() => new Rider());
    horse.setStaticSlots([
      { name: 'mount:1', accepts: 'SlottableMixin' },
    ]);
  });

  it('passes the MixinApi.isMountable predicate', () => {
    expect(MixinApi.isMountable(horse)).toBe(true);
    expect(MixinApi.hasMixin(horse, Mixins.Mountable)).toBe(true);
  });

  it('default mount slot is mount:1', () => {
    expect(horse.getMountSlot()).toBe('mount:1');
  });

  it('isMounted reflects mount slot occupancy', () => {
    expect(horse.isMounted()).toBe(false);
    horse.occupy(rider, 'mount:1');
    expect(horse.isMounted()).toBe(true);
  });

  it('getMountOccupant returns the rider', () => {
    horse.occupy(rider, 'mount:1');
    expect(horse.getMountOccupant()).toBe(rider);
  });

  it('mountSlot field accessor round-trips', () => {
    horse.setMountSlot('back:1');
    expect(horse.getMountSlot()).toBe('back:1');
  });
});
