/**
 * ContainmentApi tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ContainmentApi } from '../containment';
import { Location } from '../../lib/stuff/Location';
import { ContainerMixin } from '../../lib/spatial/Container';
import { ContainableMixin } from '../../lib/spatial/Containable';
import { Stuff } from '../../lib/stuff/Stuff';
import { StuffApi } from '../stuff';
import { makeStuff } from '../../lib/security/__tests__/test-setup';
import { Idea } from "../../lib/stuff/Idea";

// Create test classes
const ContainableBase = ContainableMixin(Idea);
class TestItem extends ContainableBase {}

const ContainerBase = ContainerMixin(ContainableMixin(Idea));
class TestContainer extends ContainerBase {}

describe('ContainmentApi', () => {
  let item: TestItem;
  let container1: TestContainer;
  let container2: TestContainer;
  let location1: Location;
  let location2: Location;

  beforeEach(() => {
    item = makeStuff(() => new TestItem());

    container1 = makeStuff(() => new TestContainer());

    container2 = makeStuff(() => new TestContainer());

    location1 = makeStuff(() => new Location());

    location2 = makeStuff(() => new Location());
  });

  describe('move()', () => {
    it('should move item to container', () => {
      ContainmentApi.move(item, container1);

      expect(item.getContainer()).toBe(container1);
      expect(container1.hasContainable(item)).toBe(true);
    });

    it('should automatically remove from previous container', () => {
      ContainmentApi.move(item, container1);
      expect(container1.hasContainable(item)).toBe(true);

      ContainmentApi.move(item, container2);

      expect(container1.hasContainable(item)).toBe(false);
      expect(container2.hasContainable(item)).toBe(true);
      expect(item.getContainer()).toBe(container2);
    });

    it('should work when item has no current environment', () => {
      expect(item.getContainer()).toBeNull();

      ContainmentApi.move(item, container1);

      expect(item.getContainer()).toBe(container1);
      expect(container1.hasContainable(item)).toBe(true);
    });

    it('should work with Location as container', () => {
      ContainmentApi.move(item, location1);

      expect(item.getContainer()).toBe(location1);
      expect(location1.hasContainable(item)).toBe(true);
    });

    it('should move between locations', () => {
      ContainmentApi.move(item, location1);
      expect(location1.hasContainable(item)).toBe(true);

      ContainmentApi.move(item, location2);

      expect(location1.hasContainable(item)).toBe(false);
      expect(location2.hasContainable(item)).toBe(true);
      expect(item.getContainer()).toBe(location2);
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
  });

  describe('getContainer()', () => {
    it('should return container holding the item', () => {
      ContainmentApi.move(item, container1);

      expect(ContainmentApi.getContainer(item)).toBe(container1);
    });

    it('should return null when item has no environment', () => {
      expect(ContainmentApi.getContainer(item)).toBeNull();
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

    it('should return all items in container', () => {
      const item2 = makeStuff(() => new TestItem());
      const item3 = makeStuff(() => new TestItem());

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
      expect(location1.hasContainable(item)).toBe(false);

      // Transfer to container2
      ContainmentApi.move(item, container2);
      expect(ContainmentApi.getContainer(item)).toBe(container2);
      expect(container1.hasContainable(item)).toBe(false);

      // Drop in location2
      ContainmentApi.move(item, location2);
      expect(ContainmentApi.getContainer(item)).toBe(location2);
      expect(container2.hasContainable(item)).toBe(false);
    });

    it('should handle nested containers', () => {
      // Put container1 in location1
      ContainmentApi.move(container1, location1);

      // Put item in container1
      ContainmentApi.move(item, container1);

      expect(item.getContainer()).toBe(container1);
      expect(container1.getContainer()).toBe(location1);
      expect(container1.hasContainable(item)).toBe(true);
      expect(location1.hasContainable(container1)).toBe(true);
    });
  });
});
