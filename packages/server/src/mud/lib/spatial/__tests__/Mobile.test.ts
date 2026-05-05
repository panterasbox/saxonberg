/**
 * MobileMixin tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MobileMixin } from '../Mobile';
import { ContainableMixin } from '../Containable';
import { Stuff } from '../../stuff/Stuff';
import { Location } from '../../stuff/Location';
import { StuffApi } from '../../../api/stuff';
import { makeStuff } from '../../security/__tests__/test-setup';

// Create a test class with both ContainableMixin and MobileMixin
const MobileObjectBase = MobileMixin(ContainableMixin(Stuff));
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
