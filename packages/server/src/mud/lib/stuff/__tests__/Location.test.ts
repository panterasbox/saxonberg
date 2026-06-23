/**
 * Location tests — covers the structural-container role only.
 *
 * Visible / Named / Exitable behaviors live on concrete subclasses
 * (`CartesianLocation`, `SphericalLocation`, …) and are exercised by
 * those subclasses' tests; bare Location is just `ContainerMixin(Idea)`.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import Location from '../Location';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import { ContainableMixin } from '../../spatial/Containable';
import { makeStuff } from '../../security/__tests__/test-setup';
import { Idea } from "../Idea";

class TestItem extends ContainableMixin(Idea) {}

describe('Location', () => {
  let location: Location;

  beforeEach(() => {
    location = makeStuff(() => new Location());
  });

  describe('Construction', () => {
    it('creates a location with default values', () => {
      expect(location).toBeDefined();
      expect(location.getContents()).toEqual([]);
    });

    it('is registered with StuffApi', () => {
      const retrieved = StuffApi.findById(location.stuffId);
      expect(retrieved).toBe(location);
    });
  });

  describe('ContainerMixin integration', () => {
    it('adds items via ContainmentApi.move', () => {
      const item = makeStuff(() => new TestItem());
      ContainmentApi.move(item, location);
      expect(location.hasContainable(item)).toBe(true);
      expect(location.getContents().length).toBe(1);
    });

    it('removes items via ContainmentApi.move(item, null)', () => {
      const item = makeStuff(() => new TestItem());
      ContainmentApi.move(item, location);
      ContainmentApi.move(item, null);
      expect(location.hasContainable(item)).toBe(false);
      expect(location.getContents().length).toBe(0);
    });

    it('returns all contents via getContents()', () => {
      const item1 = makeStuff(() => new TestItem());
      const item2 = makeStuff(() => new TestItem());
      ContainmentApi.move(item1, location);
      ContainmentApi.move(item2, location);

      const contents = location.getContents();
      expect(contents).toHaveLength(2);
      expect(contents).toContain(item1);
      expect(contents).toContain(item2);
    });
  });

  describe('Typical usage', () => {
    it('works as a container for multiple objects', () => {
      const npc1 = makeStuff(() => new TestItem());
      const npc2 = makeStuff(() => new TestItem());

      ContainmentApi.move(npc1, location);
      ContainmentApi.move(npc2, location);

      expect(location.getContents()).toHaveLength(2);
    });
  });
});
