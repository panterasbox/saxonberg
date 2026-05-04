/**
 * Location tests — covers the structural-container role only.
 *
 * Visible / Named / Exitable behaviors live on concrete subclasses
 * (`CartesianLocation`, `SphericalLocation`, …) and are exercised by
 * those subclasses' tests; bare Location is just `ContainerMixin(Stuff)`.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Location } from '../Location';
import { StuffApi } from '../../../api/stuff';
import { ContainableMixin } from '../../spatial/Containable';
import { Stuff } from '../Stuff';
import { makeStuff } from '../../security/__tests__/test-setup';

class TestItem extends ContainableMixin(Stuff) {}

describe('Location', () => {
  let location: Location;

  beforeEach(() => {
    location = makeStuff(() => new Location());
  });

  describe('Construction', () => {
    it('creates a location with default values', () => {
      expect(location).toBeDefined();
      expect(location.inventory).toBeInstanceOf(Set);
      expect(location.inventory.size).toBe(0);
    });

    it('is registered with StuffApi', () => {
      const retrieved = StuffApi.findById(location.stuffId);
      expect(retrieved).toBe(location);
    });
  });

  describe('ContainerMixin integration', () => {
    it('adds items to inventory', () => {
      const item = makeStuff(() => new TestItem());
      location.addToInventory(item);
      expect(location.hasInInventory(item)).toBe(true);
      expect(location.inventory.size).toBe(1);
    });

    it('removes items from inventory', () => {
      const item = makeStuff(() => new TestItem());
      location.addToInventory(item);
      const removed = location.removeFromInventory(item);
      expect(removed).toBe(true);
      expect(location.hasInInventory(item)).toBe(false);
      expect(location.inventory.size).toBe(0);
    });

    it('returns all contents via getContents()', () => {
      const item1 = makeStuff(() => new TestItem());
      const item2 = makeStuff(() => new TestItem());
      location.addToInventory(item1);
      location.addToInventory(item2);

      const contents = location.getContents();
      expect(contents).toHaveLength(2);
      expect(contents).toContain(item1);
      expect(contents).toContain(item2);
    });

    it('returns inventory contents via getInventoryContents()', () => {
      const item1 = makeStuff(() => new TestItem());
      location.addToInventory(item1);

      const contents = location.getInventoryContents();
      expect(contents).toHaveLength(1);
      expect(contents[0]).toBe(item1);
    });
  });

  describe('Typical usage', () => {
    it('works as a container for multiple objects', () => {
      const npc1 = makeStuff(() => new TestItem());
      const npc2 = makeStuff(() => new TestItem());

      location.addToInventory(npc1);
      location.addToInventory(npc2);

      expect(location.getContents()).toHaveLength(2);
    });
  });
});
