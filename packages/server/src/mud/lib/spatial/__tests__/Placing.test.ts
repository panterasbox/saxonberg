/**
 * PlacingMixin tests — the lazy-walk `getPlaced` read, the offered
 * `placements` list and `resolvePlacement`, the `userFacingDetail`
 * accessor pair, the default `canPlace`, and BOTH composition refusals:
 * a host must be Containable, and must not be Exitable.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach } from 'vitest';
import { PlacingMixin } from '../Placing';
import { ContainableMixin } from '../Containable';
import { ContainerMixin } from '../Container';
import { ExitableMixin } from '../../boundary/Exitable';
import { ContainmentApi } from '../../../api/containment';
import { MixinApi } from '../../../api/mixin';
import { StuffApi } from '../../../api/stuff';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../security/__tests__/test-setup';
import { Idea } from '../../stuff/Idea';

// Concrete Placing test class composed with Containable so the
// host itself can live in an environment for the lazy walk.
class TestSurface extends PlacingMixin(ContainableMixin(Idea)) {}

// Placing WITHOUT Containable — refusal 1.
class BrokenSurface extends PlacingMixin(Idea) {}

// ⭐ Placing AND Exitable — refusal 2. This MUST compile: the refusal is
// a runtime one, because the types cannot express "not this mixin", and
// a refusal asserted from the types would be a refusal that never runs.
class ExitableSurface extends PlacingMixin(
  ExitableMixin(ContainerMixin(ContainableMixin(Idea))),
) {}

// The control: the same shape WITHOUT Exitable must register cleanly, so
// a green refusal test cannot be green because nothing registers at all.
class ContainerSurface extends PlacingMixin(
  ContainerMixin(ContainableMixin(Idea)),
) {}

// Test environment / container for the apple-on-table fixture.
class TestRoom extends ContainerMixin(Idea) {}

// Test Containable thing that can rest on a surface.
class TestThing extends ContainableMixin(Idea) {}

describe('PlacingMixin', () => {
  describe('mixin marker', () => {
    let surface: TestSurface;
    beforeEach(() => {
      StuffApi.clearAll();
      surface = makeStuffAtPath(() => new TestSurface(), '/test/surface');
    });

    it('is detected by MixinApi.isPlacing', () => {
      expect(MixinApi.isPlacing(surface)).toBe(true);
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
      const fields = MixinApi.getAllPersistentFields(TestSurface);
      expect(fields).toContain('userFacingDetail');
    });
  });

  describe('canPlace', () => {
    it('accepts any Containable under an offered member', () => {
      StuffApi.clearAll();
      const surface = makeStuffAtPath(
        () => new TestSurface(),
        '/test/surface-default-canplace',
      );
      const item = makeStuff(() => new TestThing());
      expect(surface.canPlace(item, 'on')).toEqual({ ok: true });
    });

    it('refuses a member the host does not offer', () => {
      StuffApi.clearAll();
      const surface = makeStuffAtPath(
        () => new TestSurface(),
        '/test/surface-unoffered-member',
      );
      const item = makeStuff(() => new TestThing());
      expect(surface.canPlace(item, 'from')).toEqual({
        ok: false,
        reason: 'no-such-placement',
      });
    });
  });

  describe('placements and resolvePlacement', () => {
    it('offers `on` by default — every bare host is a surface', () => {
      StuffApi.clearAll();
      const surface = makeStuffAtPath(
        () => new TestSurface(),
        '/test/surface-default-placements',
      );
      expect(surface.getPlacements()).toEqual(['on']);
      expect(surface.resolvePlacement('on')).toBe('on');
      expect(surface.resolvePlacement('from')).toBeNull();
      expect(surface.resolvePlacement()).toBe('on');
    });

    it('⚠ COLD, a member answers to its own NAME and nothing else', () => {
      // The words a member accepts are its `Placement` row's claim. With
      // no roster warmed the fallback is the member's own name, so a
      // host stays addressable — `onto` is `on`'s row talking, and
      // without the row it is just a word nobody knows.
      StuffApi.clearAll();
      const surface = makeStuffAtPath(
        () => new TestSurface(),
        '/test/surface-cold-words',
      );
      expect(surface.resolvePlacement('on')).toBe('on');
      expect(surface.resolvePlacement('onto')).toBeNull();
    });

    it('a row may offer a different member entirely', () => {
      StuffApi.clearAll();
      const hook = makeStuffAtPath(
        () => new TestSurface(),
        '/test/surface-hook-placements',
      );
      hook.setPlacements(['from']);
      expect(hook.getPlacements()).toEqual(['from']);
      expect(hook.resolvePlacement('from')).toBe('from');
      expect(hook.resolvePlacement('on')).toBeNull();
      // With no word and one member, that member.
      expect(hook.resolvePlacement()).toBe('from');
    });
  });

  describe('getPlaced (lazy walk)', () => {
    let room: TestRoom;
    let surface: TestSurface;
    let restingItem: TestThing;
    let floatingItem: TestThing;

    beforeEach(() => {
      StuffApi.clearAll();
      room = makeStuff(() => new TestRoom());
      surface = makeStuffAtPath(
        () => new TestSurface(),
        '/test/surface-placed',
      );
      restingItem = makeStuff(() => new TestThing());
      floatingItem = makeStuff(() => new TestThing());
      // Place the surface in the room. The items will be placed
      // per-test depending on the scenario.
      ContainmentApi.move(surface, room);
    });

    it('returns empty when nothing is placed on the host', () => {
      expect(surface.getPlaced()).toEqual([]);
    });

    it('returns empty when the surface has no environment', () => {
      // Detach the host from the room — getPlaced must return
      // [] cleanly without throwing.
      ContainmentApi.move(surface, null);
      expect(surface.getPlaced()).toEqual([]);
    });

    it('returns items whose placement names this host', () => {
      ContainmentApi.place(restingItem, 'on', surface);
      ContainmentApi.move(floatingItem, room);
      const resting = surface.getPlaced();
      expect(resting).toHaveLength(1);
      expect(resting[0]).toBe(restingItem);
    });

    it('ignores items in the environment with no placement', () => {
      ContainmentApi.move(floatingItem, room);
      expect(surface.getPlaced()).toEqual([]);
    });
  });

  describe('composition refusals', () => {
    it('throws at registration when Containable is missing', () => {
      StuffApi.clearAll();
      expect(() => {
        makeStuff(() => new BrokenSurface());
      }).toThrow(/PlacingMixin.*ContainableMixin/);
    });

    it('⭐ throws at registration when the host is also Exitable', () => {
      StuffApi.clearAll();
      expect(() => {
        makeStuff(() => new ExitableSurface());
      }).toThrow(/PlacingMixin and ExitableMixin/);
    });

    it('registers the same shape without Exitable (the control)', () => {
      StuffApi.clearAll();
      expect(() => {
        makeStuff(() => new ContainerSurface());
      }).not.toThrow();
    });
  });

  describe('getPlaced(name)', () => {
    it('filters to one member', () => {
      StuffApi.clearAll();
      const room = makeStuff(() => new TestRoom());
      const host = makeStuffAtPath(
        () => new TestSurface(),
        '/test/surface-two-members',
      );
      ContainmentApi.move(host, room);
      host.setPlacements(['on', 'from']);
      const onIt = makeStuff(() => new TestThing());
      const fromIt = makeStuff(() => new TestThing());
      ContainmentApi.place(onIt, 'on', host);
      ContainmentApi.place(fromIt, 'from', host);
      expect(host.getPlaced()).toHaveLength(2);
      expect(host.getPlaced('on')).toEqual([onIt]);
      expect(host.getPlaced('from')).toEqual([fromIt]);
    });
  });
});
