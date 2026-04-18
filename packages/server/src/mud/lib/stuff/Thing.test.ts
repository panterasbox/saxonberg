/**
 * Thing tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Thing } from './Thing';
import { StuffApi } from '../../api/stuff';
import { Location } from '../spatial/Location';
import { ContainmentApi } from '../../api/containment';

describe('Thing', () => {
  let thing: Thing;

  beforeEach(() => {
    thing = new Thing();
    StuffApi.register(thing);
  });

  describe('Construction', () => {
    it('should create a thing with default values', () => {
      expect(thing).toBeDefined();
      expect(thing.environment).toBeNull();
    });

    it('should be registered with StuffApi', () => {
      const retrieved = StuffApi.findById(thing.stuffId);
      expect(retrieved).toBe(thing);
    });

    it('should have a runtime ID', () => {
      expect(thing.stuffId).toBeDefined();
      expect(typeof thing.stuffId).toBe('string');
      expect(thing.stuffId.length).toBeGreaterThan(0);
    });
  });

  describe('ContainableMixin integration', () => {
    it('should start with null environment', () => {
      expect(thing.getEnvironment()).toBeNull();
    });

    it('should set environment', () => {
      const location = new Location();
      StuffApi.register(location);

      thing.setEnvironment(location);
      expect(thing.getEnvironment()).toBe(location);
    });

    it('should be added to container via ContainmentApi', () => {
      const location = new Location();
      StuffApi.register(location);

      ContainmentApi.move(thing, location);

      expect(thing.getEnvironment()).toBe(location);
      expect(location.hasInInventory(thing)).toBe(true);
    });

    it('should be removed from old container when moved', () => {
      const location1 = new Location();
      const location2 = new Location();
      StuffApi.register(location1);
      StuffApi.register(location2);

      // Add to first location
      ContainmentApi.move(thing, location1);
      expect(location1.hasInInventory(thing)).toBe(true);

      // Move to second location
      ContainmentApi.move(thing, location2);
      expect(location1.hasInInventory(thing)).toBe(false);
      expect(location2.hasInInventory(thing)).toBe(true);
      expect(thing.getEnvironment()).toBe(location2);
    });
  });

  describe('Mixin composition', () => {
    it('should have methods from ContainableMixin', () => {
      expect(typeof thing.setEnvironment).toBe('function');
      expect(typeof thing.getEnvironment).toBe('function');
    });
  });

  describe('Lifecycle', () => {
    it('should be destroyed via destroy()', () => {
      thing.destroy();
      expect(thing.isDestroyed()).toBe(true);

      // Should be unregistered
      const retrieved = StuffApi.findById(thing.stuffId);
      expect(retrieved).toBeUndefined();
    });
  });

  describe('Static persistentFields', () => {
    it('should declare persistent fields', () => {
      expect(Thing.persistentFields).toBeDefined();
      expect(Array.isArray(Thing.persistentFields)).toBe(true);
    });
  });
});
