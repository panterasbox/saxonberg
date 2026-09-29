/**
 * Thing tests
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach } from 'vitest';
import Thing from '../Thing';
import { StuffApi } from '../../../api/stuff';
import Location from '../Location';
import { ContainmentApi } from '../../../api/containment';
import { makeStuff } from '../../security/__tests__/test-setup';
import { MixinApi } from '../../../api/mixin';

describe('Thing', () => {
  let thing: Thing;

  beforeEach(() => {
    thing = makeStuff(() => new Thing());
  });

  describe('Construction', () => {
    it('should create a thing with default values', () => {
      expect(thing).toBeDefined();
      expect(thing.getContainer()).toBeNull();
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
      expect(thing.getContainer()).toBeNull();
    });

    it('should set environment via ContainmentApi.move', () => {
      const location = makeStuff(() => new Location());

      ContainmentApi.move(thing, location);
      expect(thing.getContainer()).toBe(location);
    });

    it('should be added to container via ContainmentApi', () => {
      const location = makeStuff(() => new Location());

      ContainmentApi.move(thing, location);

      expect(thing.getContainer()).toBe(location);
      expect(location.hasContainable(thing)).toBe(true);
    });

    it('should be removed from old container when moved', () => {
      const location1 = makeStuff(() => new Location());
      const location2 = makeStuff(() => new Location());

      // Add to first location
      ContainmentApi.move(thing, location1);
      expect(location1.hasContainable(thing)).toBe(true);

      // Move to second location
      ContainmentApi.move(thing, location2);
      expect(location1.hasContainable(thing)).toBe(false);
      expect(location2.hasContainable(thing)).toBe(true);
      expect(thing.getContainer()).toBe(location2);
    });
  });

  describe('Mixin composition', () => {
    it('should have methods from ContainableMixin', () => {
      expect(typeof thing.setContainer).toBe('function');
      expect(typeof thing.getContainer).toBe('function');
    });

    // ⭐ The other half of `Movable.test.ts`. Until 2026-09-29 the root
    // composed both of these, so every floor, hearth and yard wall in the
    // game carried surface claiming it could be OWNED and HIDDEN. They are
    // the two consequences of being carriable, so they moved one rung out
    // to `Movable`. Neither this assertion nor its sibling means anything
    // alone — the pair is the claim.
    it('is neither chattel nor concealable — that is Movable', () => {
      expect(MixinApi.isChattel(thing)).toBe(false);
      expect(MixinApi.isConcealable(thing)).toBe(false);
    });

    // `Detailed` goes wherever `Perceptible` goes: a thing addressable by
    // keyword has parts addressable by keyword, and `Detailed` is the
    // access path to their metadata. 78 classes used to wrap it themselves.
    it('is detailed — the root carries it now', () => {
      expect(MixinApi.isDetailed(thing)).toBe(true);
    });
  });

  describe('Lifecycle', () => {
    it('should be destroyed via StuffApi.destruct()', () => {
      StuffApi.destruct(thing);
      expect(thing.isDestroyed()).toBe(true);

      // Should be unregistered
      const retrieved = StuffApi.findById(thing.stuffId);
      expect(retrieved).toBeUndefined();
    });
  });

  describe('Static persistentFields', () => {
    it('should declare persistent fields', () => {
      expect(MixinApi.getAllPersistentFields(Thing)).toBeDefined();
      expect(Array.isArray(MixinApi.getAllPersistentFields(Thing))).toBe(true);
    });
  });
});
