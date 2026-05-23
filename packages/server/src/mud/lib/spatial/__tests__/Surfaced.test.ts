/**
 * SurfacedMixin tests — exercises the lazy-walk `getResting` surface,
 * the `userFacingDetail` accessor pair, the default `canRest`, and
 * the composition constraint that requires Containable on the host.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SurfacedMixin } from '../Surfaced';
import { ContainableMixin } from '../Containable';
import { ContainerMixin } from '../Container';
import { ContainmentApi } from '../../../api/containment';
import { MixinApi } from '../../../api/mixin';
import { StuffApi } from '../../../api/stuff';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../security/__tests__/test-setup';
import { Idea } from '../../stuff/Idea';

// Concrete Surfaced test class composed with Containable so the
// surface itself can live in an environment for the lazy walk.
class TestSurface extends SurfacedMixin(ContainableMixin(Idea)) {}

// Surfaced WITHOUT Containable — should fail composition validation.
class BrokenSurface extends SurfacedMixin(Idea) {}

// Test environment / container for the apple-on-table fixture.
class TestRoom extends ContainerMixin(Idea) {}

// Test Containable thing that can rest on a surface.
class TestThing extends ContainableMixin(Idea) {}

describe('SurfacedMixin', () => {
  describe('mixin marker', () => {
    let surface: TestSurface;
    beforeEach(() => {
      StuffApi.clearAll();
      surface = makeStuffAtPath(() => new TestSurface(), '/test/surface');
    });

    it('is detected by MixinApi.isSurfaced', () => {
      expect(MixinApi.isSurfaced(surface)).toBe(true);
    });
  });

  describe('userFacingDetail', () => {
    let surface: TestSurface;
    beforeEach(() => {
      StuffApi.clearAll();
      surface = makeStuffAtPath(() => new TestSurface(), '/test/surface');
    });

    it('round-trips through the accessor pair', () => {
      expect(surface.getUserFacingDetail()).toBeUndefined();
      surface.setUserFacingDetail('tabletop');
      expect(surface.getUserFacingDetail()).toBe('tabletop');
      surface.setUserFacingDetail(undefined);
      expect(surface.getUserFacingDetail()).toBeUndefined();
    });

    it('declares the field as persistent', () => {
      const fields = (TestSurface as { persistentFields?: string[] }).persistentFields;
      expect(fields).toContain('userFacingDetail');
    });
  });

  describe('canRest', () => {
    it('defaults to true for any Containable', () => {
      StuffApi.clearAll();
      const surface = makeStuffAtPath(
        () => new TestSurface(),
        '/test/surface-default-canrest',
      );
      const item = makeStuff(() => new TestThing());
      expect(surface.canRest(item)).toBe(true);
    });
  });

  describe('getResting (lazy walk)', () => {
    let room: TestRoom;
    let surface: TestSurface;
    let restingItem: TestThing;
    let floatingItem: TestThing;

    beforeEach(() => {
      StuffApi.clearAll();
      room = makeStuff(() => new TestRoom());
      surface = makeStuffAtPath(
        () => new TestSurface(),
        '/test/surface-resting',
      );
      restingItem = makeStuff(() => new TestThing());
      floatingItem = makeStuff(() => new TestThing());
      // Place the surface in the room. The items will be placed
      // per-test depending on the scenario.
      ContainmentApi.move(surface, room);
    });

    it('returns empty when no items rest on the surface', () => {
      expect(surface.getResting()).toEqual([]);
    });

    it('returns empty when the surface has no environment', () => {
      // Detach the surface from the room — getResting must return
      // [] cleanly without throwing.
      ContainmentApi.move(surface, null);
      expect(surface.getResting()).toEqual([]);
    });

    it('returns items whose restingOn points at this surface', () => {
      ContainmentApi.placeOn(restingItem, surface);
      ContainmentApi.move(floatingItem, room);
      const resting = surface.getResting();
      expect(resting).toHaveLength(1);
      expect(resting[0]).toBe(restingItem);
    });

    it('ignores items in the environment with no restingOn pointer', () => {
      ContainmentApi.move(floatingItem, room);
      expect(surface.getResting()).toEqual([]);
    });
  });

  describe('composition constraint', () => {
    it('throws at registration when Containable is missing', () => {
      StuffApi.clearAll();
      expect(() => {
        makeStuff(() => new BrokenSurface());
      }).toThrow(/SurfacedMixin.*ContainableMixin/);
    });
  });
});
