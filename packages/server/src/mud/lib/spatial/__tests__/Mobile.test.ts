/**
 * MobileMixin tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MobileMixin } from '../Mobile';
import { ContainableMixin } from '../Containable';
import Location from '../../stuff/Location';
import { makeStuff } from '../../security/__tests__/test-setup';
import { Idea } from "../../stuff/Idea";

// Create a test class with both ContainableMixin and MobileMixin
const MobileObjectBase = MobileMixin(ContainableMixin(Idea));
class MobileObject extends MobileObjectBase {}

describe('MobileMixin', () => {
  let mobileObj: MobileObject;
  let location1: Location;
  let location2: Location;

  beforeEach(() => {
    mobileObj = makeStuff(() => new MobileObject());

    location1 = makeStuff(() => new Location());

    location2 = makeStuff(() => new Location());
  });

  describe('teleport()', () => {
    it('should move object to destination', () => {
      mobileObj.teleport(location1);

      expect(mobileObj.getContainer()).toBe(location1);
      expect(location1.hasContainable(mobileObj)).toBe(true);
    });

    it('should remove from current location when moving', () => {
      // First move to location1
      mobileObj.teleport(location1);
      expect(location1.hasContainable(mobileObj)).toBe(true);

      // Then move to location2
      mobileObj.teleport(location2);

      expect(location1.hasContainable(mobileObj)).toBe(false);
      expect(location2.hasContainable(mobileObj)).toBe(true);
      expect(mobileObj.getContainer()).toBe(location2);
    });

    it('should work when object has no current environment', () => {
      expect(mobileObj.getContainer()).toBeNull();

      mobileObj.teleport(location1);

      expect(mobileObj.getContainer()).toBe(location1);
      expect(location1.hasContainable(mobileObj)).toBe(true);
    });

    it('should update environment reference', () => {
      mobileObj.teleport(location1);
      expect(mobileObj.getContainer()).toBe(location1);

      mobileObj.teleport(location2);
      expect(mobileObj.getContainer()).toBe(location2);
    });

    it('should add to destination inventory', () => {
      expect(location1.getContents()).toHaveLength(0);

      mobileObj.teleport(location1);

      expect(location1.getContents()).toHaveLength(1);
      expect(location1.getContents()[0]).toBe(mobileObj);
    });

    it('should handle multiple objects moving to same location', () => {
      const obj1 = makeStuff(() => new MobileObject());
      const obj2 = makeStuff(() => new MobileObject());

      obj1.teleport(location1);
      obj2.teleport(location1);

      expect(location1.getContents()).toHaveLength(2);
      expect(location1.hasContainable(obj1)).toBe(true);
      expect(location1.hasContainable(obj2)).toBe(true);
    });

    it('should handle moving between multiple locations', () => {
      // Move through several locations
      mobileObj.teleport(location1);
      expect(mobileObj.getContainer()).toBe(location1);

      mobileObj.teleport(location2);
      expect(mobileObj.getContainer()).toBe(location2);

      mobileObj.teleport(location1);
      expect(mobileObj.getContainer()).toBe(location1);

      // Verify only in final location
      expect(location1.hasContainable(mobileObj)).toBe(true);
      expect(location2.hasContainable(mobileObj)).toBe(false);
    });
  });

  describe('Integration with ContainableMixin', () => {
    it('should properly update environment via setContainer', () => {
      mobileObj.teleport(location1);
      expect(mobileObj.getContainer()).toBe(location1);
    });

    it('should maintain consistency between environment and inventory', () => {
      mobileObj.teleport(location1);

      // Check consistency
      expect(mobileObj.getContainer()).toBe(location1);
      expect(location1.hasContainable(mobileObj)).toBe(true);
    });
  });

  describe('Hook execution (future)', () => {
    it('should be ready for beforeLeave hooks', () => {
      // This test documents that the teleport() method structure
      // is ready for future hook execution
      mobileObj.teleport(location1);
      mobileObj.teleport(location2);

      // No errors should occur
      expect(mobileObj.getContainer()).toBe(location2);
    });

    it('should be ready for afterEnter hooks', () => {
      // This test documents that the teleport() method structure
      // is ready for future hook execution
      mobileObj.teleport(location1);

      // No errors should occur
      expect(location1.hasContainable(mobileObj)).toBe(true);
    });
  });
});

import { buildMode } from '../../locomotion/__tests__/test-helpers';
import { SlottedMixin } from '../../slot/Slotted';
import { SlottableMixin } from '../../slot/Slottable';
import { MountableMixin } from '../../slot/Mountable';
import CartesianZone from '../../location/CartesianZone';
import CartesianLocation from '../../location/CartesianLocation';
import Exit from '../../boundary/Exit';
import { ContainmentApi } from '../../../api/containment';
import { MixinApi } from '../../../api/mixin';

const MountSlottedBase = MountableMixin(SlottedMixin(Idea));
class TestMount extends MountSlottedBase {}

const SlottableMobileBase = MobileMixin(SlottableMixin(ContainableMixin(Idea)));
class SlottableMobile extends SlottableMobileBase {}

describe('Mobile.engagedMode', () => {
  describe('default state', () => {
    it('getEngagedMode returns null on a fresh Mobile', () => {
      const m = makeStuff(() => new MobileObject());
      expect(m.getEngagedMode()).toBeNull();
    });
  });

  describe('setEngagedMode / getEngagedMode', () => {
    it('accepts a LocomotionMode singleton and resolves it back', () => {
      const walk = buildMode('walk');
      const m = makeStuff(() => new MobileObject());
      m.setEngagedMode(walk);
      expect(m.getEngagedMode()).toBe(walk);
    });

    it('accepts null and clears', () => {
      const walk = buildMode('walk');
      const m = makeStuff(() => new MobileObject());
      m.setEngagedMode(walk);
      m.setEngagedMode(null);
      expect(m.getEngagedMode()).toBeNull();
    });
  });

  describe('isEngagedIn polymorphism', () => {
    it('accepts a LocomotionMode singleton', () => {
      const walk = buildMode('walk');
      const m = makeStuff(() => new MobileObject());
      m.setEngagedMode(walk);
      expect(m.isEngagedIn(walk)).toBe(true);
    });

    it('accepts a short name string', () => {
      const walk = buildMode('walk');
      const m = makeStuff(() => new MobileObject());
      m.setEngagedMode(walk);
      expect(m.isEngagedIn('walk')).toBe(true);
    });

    it('accepts a full templatePath string', () => {
      const walk = buildMode('walk');
      const m = makeStuff(() => new MobileObject());
      m.setEngagedMode(walk);
      expect(m.isEngagedIn('/lib/locomotion/walk')).toBe(true);
    });

    it('returns false when not engaged', () => {
      const m = makeStuff(() => new MobileObject());
      expect(m.isEngagedIn('walk')).toBe(false);
    });
  });

  describe('not persistent', () => {
    it('_engagedModePath is not in persistentFields', () => {
      // MobileMixin extends ContainableMixin which declares its own
      // persistent fields; _engagedModePath should not appear on the
      // composed list (runtime-only by design).
      const fields = MixinApi.getAllPersistentFields(MobileObject);
      expect(fields).not.toContain('_engagedModePath');
    });
  });
});

describe('Mobile.onSlotReleased witness', () => {
  it('clears engagedMode when host composes the mode\'s conveyanceMixin', () => {
    const ride = buildMode('ride');
    const horse = makeStuff(() => new TestMount());
    horse.setStaticSlots([{ name: 'mount:1', accepts: 'SlottableMixin' }]);
    const rider = makeStuff(() => new SlottableMobile());
    horse.occupy(rider, 'mount:1');
    rider.setEngagedMode(ride);
    horse.vacate('mount:1', rider);
    expect(rider.getEngagedMode()).toBeNull();
  });

  it('does not clear when host does not compose the conveyanceMixin', () => {
    const ride = buildMode('ride');
    // A bare Slotted that's neither Mountable nor Drivable.
    class BareSlotted extends SlottedMixin(Idea) {}
    const chair = makeStuff(() => new BareSlotted());
    chair.setStaticSlots([{ name: 'sit:1', accepts: 'SlottableMixin' }]);
    const sitter = makeStuff(() => new SlottableMobile());
    chair.occupy(sitter, 'sit:1');
    sitter.setEngagedMode(ride);
    chair.vacate('sit:1', sitter);
    // 'ride' wants a MountableMixin host; chair is not Mountable, so
    // engagement persists.
    expect(sitter.getEngagedMode()).toBe(ride);
  });

  it('does not clear when mode is not passthrough', () => {
    const walk = buildMode('walk');
    const horse = makeStuff(() => new TestMount());
    horse.setStaticSlots([{ name: 'mount:1', accepts: 'SlottableMixin' }]);
    const rider = makeStuff(() => new SlottableMobile());
    horse.occupy(rider, 'mount:1');
    rider.setEngagedMode(walk);
    horse.vacate('mount:1', rider);
    expect(rider.getEngagedMode()).toBe(walk);
  });

  it('does not clear when engagedMode is null', () => {
    const horse = makeStuff(() => new TestMount());
    horse.setStaticSlots([{ name: 'mount:1', accepts: 'SlottableMixin' }]);
    const rider = makeStuff(() => new SlottableMobile());
    horse.occupy(rider, 'mount:1');
    expect(rider.getEngagedMode()).toBeNull();
    horse.vacate('mount:1', rider);
    expect(rider.getEngagedMode()).toBeNull();
  });
});

describe('Mobile.traverse mode-gate', () => {
  it('throws when exit.canTraverse returns ok=false (mode rejected)', async () => {
    // allowsMode resolves the LocomotionMode singleton to look up
    // its medium; the rejection still works without walk loaded
    // (since walk would have medium ground, not vertical), but
    // we seed walk to exercise the full lookup path.
    buildMode('walk');
    const zone = makeStuff(() => new CartesianZone());
    const locA = makeStuff(() => new CartesianLocation());
    const locB = makeStuff(() => new CartesianLocation());
    zone.addLocation(locA, 0, 0, 0);
    zone.addLocation(locB, 0, 1, 0);
    const exit = makeStuff(() => new Exit({
      direction: 'up', source: locA, destination: locB,
      media: ['vertical'],
    }));
    const mover = makeStuff(() => new MobileObject());
    ContainmentApi.move(mover, locA);
    await expect(mover.traverse(exit, 'walk')).rejects.toThrow(/walk that way/);
  });

  it('admits walk through a default exit', async () => {
    const zone = makeStuff(() => new CartesianZone());
    const locA = makeStuff(() => new CartesianLocation());
    const locB = makeStuff(() => new CartesianLocation());
    zone.addLocation(locA, 0, 0, 0);
    zone.addLocation(locB, 0, 1, 0);
    const exit = makeStuff(() => new Exit({
      direction: 'north', source: locA, destination: locB,
    }));
    const mover = makeStuff(() => new MobileObject());
    ContainmentApi.move(mover, locA);
    await expect(mover.traverse(exit, 'walk')).resolves.toBeUndefined();
    expect(mover.getContainer()).toBe(locB);
  });
});
