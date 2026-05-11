import { describe, it, expect, beforeEach } from 'vitest';
import { DrivableMixin } from '../Drivable';
import { SlottedMixin } from '../Slotted';
import { SlottableMixin } from '../Slottable';
import { Idea } from '../../stuff/Idea';
import { MixinApi } from '../../../api/mixin';
import { Mixins } from '../../mixin';
import { makeStuff } from '../../security/__tests__/test-setup';

class Bike extends DrivableMixin(SlottedMixin(Idea)) {}
class Rider extends SlottableMixin(Idea) {}

describe('DrivableMixin (default — single-Stuff drivable)', () => {
  let bike: Bike;
  let rider: Rider;

  beforeEach(() => {
    bike = makeStuff(() => new Bike());
    rider = makeStuff(() => new Rider());
    bike.setControllerSlot('seat:1');
    bike.setStaticSlots([
      { name: 'seat:1', accepts: 'SlottableMixin' },
    ]);
  });

  it('passes the MixinApi.isDrivable predicate', () => {
    expect(MixinApi.isDrivable(bike)).toBe(true);
    expect(MixinApi.hasMixin(bike, Mixins.Drivable)).toBe(true);
  });

  it('isDriven returns false when controller slot empty', () => {
    expect(bike.isDriven()).toBe(false);
    expect(bike.getDriver()).toBeNull();
  });

  it('isDriven returns true when controller slot occupied', () => {
    bike.occupy(rider, 'seat:1');
    expect(bike.isDriven()).toBe(true);
    expect(bike.getDriver()).toBe(rider);
  });

  it('controllerSlot field accessor round-trips', () => {
    bike.setControllerSlot('back:1');
    expect(bike.getControllerSlot()).toBe('back:1');
  });
});
