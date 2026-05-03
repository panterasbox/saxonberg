/**
 * Location tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Location } from '../Location';
import { StuffApi } from '../../../api/stuff';
import { ContainableMixin } from '../../spatial/Containable';
import { Stuff } from '../Stuff';
import { makeStuff } from '../../security/test-setup';

// Minimal containable item class for container tests
class TestItem extends ContainableMixin(Stuff) {}

describe('Location', () => {
  let location: Location;

  beforeEach(() => {
    location = makeStuff(() => new Location());
  });

  describe('Construction', () => {
    it('should create a location with default values', () => {
      expect(location).toBeDefined();
      expect(location.shortDescription).toBe('');
      expect(location.longDescription).toBe('');
      expect(location.inventory).toBeInstanceOf(Set);
      expect(location.inventory.size).toBe(0);
    });

    it('should be registered with StuffApi', () => {
      const retrieved = StuffApi.findById(location.stuffId);
      expect(retrieved).toBe(location);
    });
  });

  describe('ContainerMixin integration', () => {
    it('should add items to inventory', () => {
      const item = makeStuff(() => new TestItem());
      location.addToInventory(item);
      expect(location.hasInInventory(item)).toBe(true);
      expect(location.inventory.size).toBe(1);
    });

    it('should remove items from inventory', () => {
      const item = makeStuff(() => new TestItem());
      location.addToInventory(item);
      const removed = location.removeFromInventory(item);
      expect(removed).toBe(true);
      expect(location.hasInInventory(item)).toBe(false);
      expect(location.inventory.size).toBe(0);
    });

    it('should return all contents via getContents()', () => {
      const item1 = makeStuff(() => new TestItem());
      const item2 = makeStuff(() => new TestItem());
      location.addToInventory(item1);
      location.addToInventory(item2);

      const contents = location.getContents();
      expect(contents).toHaveLength(2);
      expect(contents).toContain(item1);
      expect(contents).toContain(item2);
    });

    it('should return inventory contents via getInventoryContents()', () => {
      const item1 = makeStuff(() => new TestItem());
      location.addToInventory(item1);

      const contents = location.getInventoryContents();
      expect(contents).toHaveLength(1);
      expect(contents[0]).toBe(item1);
    });
  });

  describe('VisibleMixin integration', () => {
    it('should have shortDescription property', () => {
      location.shortDescription = 'A short description';
      expect(location.shortDescription).toBe('A short description');
    });

    it('should have longDescription property', () => {
      location.longDescription = 'A long description';
      expect(location.longDescription).toBe('A long description');
    });

    it('should have getShort() method', () => {
      location.shortDescription = 'Short desc';
      expect(location.getShort()).toBe('Short desc');
    });

    it('should have getLong() method', () => {
      location.longDescription = 'Long desc';
      expect(location.getLong()).toBe('Long desc');
    });
  });

  describe('Typical usage', () => {
    it('should work as a container for multiple objects', () => {
      location.shortDescription = 'Town Square';
      location.longDescription = 'A bustling town square.';

      const npc1 = makeStuff(() => new TestItem());
      const npc2 = makeStuff(() => new TestItem());

      location.addToInventory(npc1);
      location.addToInventory(npc2);

      expect(location.getContents()).toHaveLength(2);
      expect(location.shortDescription).toBe('Town Square');
    });
  });
});
