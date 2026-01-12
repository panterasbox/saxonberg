/**
 * Location tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Location } from './Location.js';
import { StuffApi } from '../../api/stuff.js';

describe('Location', () => {
  let location: Location;

  beforeEach(() => {
    location = new Location();
    StuffApi.register(location);
  });

  describe('Construction', () => {
    it('should create a location with default values', () => {
      expect(location).toBeDefined();
      expect(location.name).toBe('');
      expect(location.description).toBe('');
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
      const item = new Location();
      StuffApi.register(item);
      location.addToInventory(item);
      expect(location.hasInInventory(item)).toBe(true);
      expect(location.inventory.size).toBe(1);
    });

    it('should remove items from inventory', () => {
      const item = new Location();
      StuffApi.register(item);
      location.addToInventory(item);
      const removed = location.removeFromInventory(item);
      expect(removed).toBe(true);
      expect(location.hasInInventory(item)).toBe(false);
      expect(location.inventory.size).toBe(0);
    });

    it('should return all contents via getContents()', () => {
      const item1 = new Location();
      StuffApi.register(item1);
      const item2 = new Location();
      StuffApi.register(item2);
      location.addToInventory(item1);
      location.addToInventory(item2);

      const contents = location.getContents();
      expect(contents).toHaveLength(2);
      expect(contents).toContain(item1);
      expect(contents).toContain(item2);
    });

    it('should return inventory contents via getInventoryContents()', () => {
      const item1 = new Location();
      StuffApi.register(item1);
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

  describe('Properties', () => {
    it('should set and get name', () => {
      location.name = 'The Void';
      expect(location.name).toBe('The Void');
    });

    it('should set and get description', () => {
      location.description = 'A dark empty space.';
      expect(location.description).toBe('A dark empty space.');
    });
  });

  describe('Typical usage', () => {
    it('should work as a container for multiple objects', () => {
      location.name = 'Town Square';
      location.description = 'A bustling town square.';

      const npc1 = new Location(); // Mock NPC
      StuffApi.register(npc1);
      const npc2 = new Location(); // Mock NPC
      StuffApi.register(npc2);

      location.addToInventory(npc1);
      location.addToInventory(npc2);

      expect(location.getContents()).toHaveLength(2);
      expect(location.name).toBe('Town Square');
    });
  });
});
