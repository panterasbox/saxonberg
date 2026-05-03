/**
 * ContainerMixin tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ContainerMixin } from './Container';
import { ContainableMixin } from './Containable';
import { Stuff } from '../stuff/Stuff';
import { makeStuff } from '../security/test-setup';

// Concrete test item class — needs ContainableMixin to live in a Container
class ConcreteStuff extends ContainableMixin(Stuff) {
  constructor() {
    super();
  }
}

// Test class that uses ContainerMixin
class TestContainer extends ContainerMixin(Stuff) {
  constructor() {
    super();
  }
}

describe('ContainerMixin', () => {
  let container: TestContainer;
  let item1: ConcreteStuff;
  let item2: ConcreteStuff;
  let item3: ConcreteStuff;

  beforeEach(() => {
    container = makeStuff(() => new TestContainer());
    item1 = makeStuff(() => new ConcreteStuff());
    item2 = makeStuff(() => new ConcreteStuff());
    item3 = makeStuff(() => new ConcreteStuff());
  });

  describe('initialization', () => {
    it('should initialize with empty inventory', () => {
      expect(container.inventory.size).toBe(0);
      expect(container.getInventoryContents()).toEqual([]);
    });
  });

  describe('addToInventory', () => {
    it('should add item to inventory', () => {
      container.addToInventory(item1);
      expect(container.inventory.size).toBe(1);
      expect(container.hasInInventory(item1)).toBe(true);
    });

    it('should add multiple items', () => {
      container.addToInventory(item1);
      container.addToInventory(item2);
      container.addToInventory(item3);
      expect(container.inventory.size).toBe(3);
    });

    it('should not add duplicate items (Set behavior)', () => {
      container.addToInventory(item1);
      container.addToInventory(item1);
      expect(container.inventory.size).toBe(1);
    });
  });

  describe('removeFromInventory', () => {
    beforeEach(() => {
      container.addToInventory(item1);
      container.addToInventory(item2);
    });

    it('should remove item from inventory', () => {
      const result = container.removeFromInventory(item1);
      expect(result).toBe(true);
      expect(container.inventory.size).toBe(1);
      expect(container.hasInInventory(item1)).toBe(false);
    });

    it('should return false when removing non-existent item', () => {
      const result = container.removeFromInventory(item3);
      expect(result).toBe(false);
      expect(container.inventory.size).toBe(2);
    });

    it('should handle removing all items', () => {
      container.removeFromInventory(item1);
      container.removeFromInventory(item2);
      expect(container.inventory.size).toBe(0);
      expect(container.getInventoryContents()).toEqual([]);
    });
  });

  describe('hasInInventory', () => {
    beforeEach(() => {
      container.addToInventory(item1);
      container.addToInventory(item2);
    });

    it('should return true for items in inventory', () => {
      expect(container.hasInInventory(item1)).toBe(true);
      expect(container.hasInInventory(item2)).toBe(true);
    });

    it('should return false for items not in inventory', () => {
      expect(container.hasInInventory(item3)).toBe(false);
    });

    it('should return false after item is removed', () => {
      container.removeFromInventory(item1);
      expect(container.hasInInventory(item1)).toBe(false);
    });
  });

  describe('getInventoryContents', () => {
    it('should return empty array for empty inventory', () => {
      expect(container.getInventoryContents()).toEqual([]);
    });

    it('should return all items as array', () => {
      container.addToInventory(item1);
      container.addToInventory(item2);
      const contents = container.getInventoryContents();
      expect(contents.length).toBe(2);
      expect(contents).toContain(item1);
      expect(contents).toContain(item2);
    });

    it('should return snapshot (not live reference)', () => {
      container.addToInventory(item1);
      const contents1 = container.getInventoryContents();
      container.addToInventory(item2);
      const contents2 = container.getInventoryContents();

      expect(contents1.length).toBe(1);
      expect(contents2.length).toBe(2);
    });
  });

  describe('persistence', () => {
    it('should NOT have persistentFields (complex type)', () => {
      // ContainerMixin does not declare persistentFields
      // because inventory is a complex type requiring custom handlers
      const fields = (TestContainer as any).persistentFields;
      expect(fields).toBeUndefined();
    });
  });
});
