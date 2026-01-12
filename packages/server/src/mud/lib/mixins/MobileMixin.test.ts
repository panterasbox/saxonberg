/**
 * MobileMixin tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MobileMixin } from './MobileMixin.js';
import { ContainableMixin } from './ContainableMixin.js';
import { Stuff } from '../stuff/Stuff.js';
import { Location } from '../location/Location.js';
import { StuffApi } from '../../api/stuff.js';

// Create a test class with both ContainableMixin and MobileMixin
const MobileObjectBase = MobileMixin(ContainableMixin(Stuff));
class MobileObject extends MobileObjectBase {}

describe('MobileMixin', () => {
  let mobileObj: MobileObject;
  let location1: Location;
  let location2: Location;

  beforeEach(() => {
    mobileObj = new MobileObject();
    StuffApi.register(mobileObj);

    location1 = new Location();
    StuffApi.register(location1);
    location1.name = 'Room 1';

    location2 = new Location();
    StuffApi.register(location2);
    location2.name = 'Room 2';
  });

  describe('travel()', () => {
    it('should move object to destination', () => {
      mobileObj.travel(location1);

      expect(mobileObj.getEnvironment()).toBe(location1);
      expect(location1.hasInInventory(mobileObj)).toBe(true);
    });

    it('should remove from current location when moving', () => {
      // First move to location1
      mobileObj.travel(location1);
      expect(location1.hasInInventory(mobileObj)).toBe(true);

      // Then move to location2
      mobileObj.travel(location2);

      expect(location1.hasInInventory(mobileObj)).toBe(false);
      expect(location2.hasInInventory(mobileObj)).toBe(true);
      expect(mobileObj.getEnvironment()).toBe(location2);
    });

    it('should work when object has no current environment', () => {
      expect(mobileObj.getEnvironment()).toBeNull();

      mobileObj.travel(location1);

      expect(mobileObj.getEnvironment()).toBe(location1);
      expect(location1.hasInInventory(mobileObj)).toBe(true);
    });

    it('should update environment reference', () => {
      mobileObj.travel(location1);
      expect(mobileObj.getEnvironment()).toBe(location1);

      mobileObj.travel(location2);
      expect(mobileObj.getEnvironment()).toBe(location2);
    });

    it('should add to destination inventory', () => {
      expect(location1.getContents()).toHaveLength(0);

      mobileObj.travel(location1);

      expect(location1.getContents()).toHaveLength(1);
      expect(location1.getContents()[0]).toBe(mobileObj);
    });

    it('should handle multiple objects moving to same location', () => {
      const obj1 = new MobileObject();
      StuffApi.register(obj1);
      const obj2 = new MobileObject();
      StuffApi.register(obj2);

      obj1.travel(location1);
      obj2.travel(location1);

      expect(location1.getContents()).toHaveLength(2);
      expect(location1.hasInInventory(obj1)).toBe(true);
      expect(location1.hasInInventory(obj2)).toBe(true);
    });

    it('should handle moving between multiple locations', () => {
      // Move through several locations
      mobileObj.travel(location1);
      expect(mobileObj.getEnvironment()).toBe(location1);

      mobileObj.travel(location2);
      expect(mobileObj.getEnvironment()).toBe(location2);

      mobileObj.travel(location1);
      expect(mobileObj.getEnvironment()).toBe(location1);

      // Verify only in final location
      expect(location1.hasInInventory(mobileObj)).toBe(true);
      expect(location2.hasInInventory(mobileObj)).toBe(false);
    });
  });

  describe('Integration with ContainableMixin', () => {
    it('should properly update environment via setEnvironment', () => {
      mobileObj.travel(location1);
      expect(mobileObj.getEnvironment()).toBe(location1);
    });

    it('should maintain consistency between environment and inventory', () => {
      mobileObj.travel(location1);

      // Check consistency
      expect(mobileObj.getEnvironment()).toBe(location1);
      expect(location1.hasInInventory(mobileObj)).toBe(true);
    });
  });

  describe('Hook execution (future)', () => {
    it('should be ready for beforeLeave hooks', () => {
      // This test documents that the travel() method structure
      // is ready for future hook execution
      mobileObj.travel(location1);
      mobileObj.travel(location2);

      // No errors should occur
      expect(mobileObj.getEnvironment()).toBe(location2);
    });

    it('should be ready for afterEnter hooks', () => {
      // This test documents that the travel() method structure
      // is ready for future hook execution
      mobileObj.travel(location1);

      // No errors should occur
      expect(location1.hasInInventory(mobileObj)).toBe(true);
    });
  });
});
