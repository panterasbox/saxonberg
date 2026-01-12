/**
 * ContainmentApi tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ContainmentApi } from './containment';
import { Location } from '../lib/location/Location';
import { ContainerMixin } from '../lib/mixins/ContainerMixin';
import { ContainableMixin } from '../lib/mixins/ContainableMixin';
import { Stuff } from '../lib/stuff/Stuff';
import { StuffApi } from './stuff';

// Create test classes
const ContainableBase = ContainableMixin(Stuff);
class TestItem extends ContainableBase {}

const ContainerBase = ContainerMixin(ContainableMixin(Stuff));
class TestContainer extends ContainerBase {}

describe('ContainmentApi', () => {
  let item: TestItem;
  let container1: TestContainer;
  let container2: TestContainer;
  let location1: Location;
  let location2: Location;

  beforeEach(() => {
    item = new TestItem();
    StuffApi.register(item);

    container1 = new TestContainer();
    StuffApi.register(container1);

    container2 = new TestContainer();
    StuffApi.register(container2);

    location1 = new Location();
    StuffApi.register(location1);
    location1.name = 'Room 1';

    location2 = new Location();
    StuffApi.register(location2);
    location2.name = 'Room 2';
  });

  describe('move()', () => {
    it('should move item to container', () => {
      const success = ContainmentApi.move(item, container1);

      expect(success).toBe(true);
      expect(item.getEnvironment()).toBe(container1);
      expect(container1.hasInInventory(item)).toBe(true);
    });

    it('should automatically remove from previous container', () => {
      // First place item in container1
      ContainmentApi.move(item, container1);
      expect(container1.hasInInventory(item)).toBe(true);

      // Then move to container2
      ContainmentApi.move(item, container2);

      expect(container1.hasInInventory(item)).toBe(false);
      expect(container2.hasInInventory(item)).toBe(true);
      expect(item.getEnvironment()).toBe(container2);
    });

    it('should work when item has no current environment', () => {
      expect(item.getEnvironment()).toBeNull();

      const success = ContainmentApi.move(item, container1);

      expect(success).toBe(true);
      expect(item.getEnvironment()).toBe(container1);
      expect(container1.hasInInventory(item)).toBe(true);
    });

    it('should work with Location as container', () => {
      const success = ContainmentApi.move(item, location1);

      expect(success).toBe(true);
      expect(item.getEnvironment()).toBe(location1);
      expect(location1.hasInInventory(item)).toBe(true);
    });

    it('should move between locations', () => {
      ContainmentApi.move(item, location1);
      expect(location1.hasInInventory(item)).toBe(true);

      ContainmentApi.move(item, location2);

      expect(location1.hasInInventory(item)).toBe(false);
      expect(location2.hasInInventory(item)).toBe(true);
      expect(item.getEnvironment()).toBe(location2);
    });

    it('should return false if item does not have ContainableMixin', () => {
      const nonContainable = new Stuff();
      StuffApi.register(nonContainable);

      const success = ContainmentApi.move(nonContainable, container1);

      expect(success).toBe(false);
    });

    it('should return false if destination does not have ContainerMixin', () => {
      const nonContainer = new Stuff();
      StuffApi.register(nonContainer);

      const success = ContainmentApi.move(item, nonContainer as any);

      expect(success).toBe(false);
    });

    it('should return false if item is null', () => {
      const success = ContainmentApi.move(null as any, container1);
      expect(success).toBe(false);
    });

    it('should return false if destination is null', () => {
      const success = ContainmentApi.move(item, null as any);
      expect(success).toBe(false);
    });
  });

  describe('isContainedIn()', () => {
    it('should return true when item is in container', () => {
      ContainmentApi.move(item, container1);

      expect(ContainmentApi.isContainedIn(item, container1)).toBe(true);
    });

    it('should return false when item is not in container', () => {
      ContainmentApi.move(item, container1);

      expect(ContainmentApi.isContainedIn(item, container2)).toBe(false);
    });

    it('should return false when item has no environment', () => {
      expect(ContainmentApi.isContainedIn(item, container1)).toBe(false);
    });

    it('should return false if container does not have ContainerMixin', () => {
      const nonContainer = new Stuff();
      StuffApi.register(nonContainer);

      expect(ContainmentApi.isContainedIn(item, nonContainer as any)).toBe(false);
    });
  });

  describe('getContainer()', () => {
    it('should return container holding the item', () => {
      ContainmentApi.move(item, container1);

      expect(ContainmentApi.getContainer(item)).toBe(container1);
    });

    it('should return null when item has no environment', () => {
      expect(ContainmentApi.getContainer(item)).toBeNull();
    });

    it('should return null if item does not have ContainableMixin', () => {
      const nonContainable = new Stuff();
      StuffApi.register(nonContainable);

      expect(ContainmentApi.getContainer(nonContainable)).toBeNull();
    });

    it('should update when item moves between containers', () => {
      ContainmentApi.move(item, container1);
      expect(ContainmentApi.getContainer(item)).toBe(container1);

      ContainmentApi.move(item, container2);
      expect(ContainmentApi.getContainer(item)).toBe(container2);
    });
  });

  describe('getContents()', () => {
    it('should return contents of container', () => {
      ContainmentApi.move(item, container1);

      const contents = ContainmentApi.getContents(container1);

      expect(contents).toHaveLength(1);
      expect(contents[0]).toBe(item);
    });

    it('should return empty array for empty container', () => {
      const contents = ContainmentApi.getContents(container1);

      expect(contents).toHaveLength(0);
    });

    it('should return empty array if object does not have ContainerMixin', () => {
      const nonContainer = new Stuff();
      StuffApi.register(nonContainer);

      const contents = ContainmentApi.getContents(nonContainer);

      expect(contents).toHaveLength(0);
    });

    it('should return all items in container', () => {
      const item2 = new TestItem();
      StuffApi.register(item2);
      const item3 = new TestItem();
      StuffApi.register(item3);

      ContainmentApi.move(item, container1);
      ContainmentApi.move(item2, container1);
      ContainmentApi.move(item3, container1);

      const contents = ContainmentApi.getContents(container1);

      expect(contents).toHaveLength(3);
      expect(contents).toContain(item);
      expect(contents).toContain(item2);
      expect(contents).toContain(item3);
    });
  });

  describe('Integration: Complex movement scenarios', () => {
    it('should handle item moving through multiple containers', () => {
      // Start in location1
      ContainmentApi.move(item, location1);
      expect(ContainmentApi.getContainer(item)).toBe(location1);

      // Pick up into container1
      ContainmentApi.move(item, container1);
      expect(ContainmentApi.getContainer(item)).toBe(container1);
      expect(location1.hasInInventory(item)).toBe(false);

      // Transfer to container2
      ContainmentApi.move(item, container2);
      expect(ContainmentApi.getContainer(item)).toBe(container2);
      expect(container1.hasInInventory(item)).toBe(false);

      // Drop in location2
      ContainmentApi.move(item, location2);
      expect(ContainmentApi.getContainer(item)).toBe(location2);
      expect(container2.hasInInventory(item)).toBe(false);
    });

    it('should handle nested containers', () => {
      // Put container1 in location1
      ContainmentApi.move(container1, location1);

      // Put item in container1
      ContainmentApi.move(item, container1);

      expect(item.getEnvironment()).toBe(container1);
      expect(container1.getEnvironment()).toBe(location1);
      expect(container1.hasInInventory(item)).toBe(true);
      expect(location1.hasInInventory(container1)).toBe(true);
    });
  });
});
