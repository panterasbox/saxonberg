/**
 * Location tests — covers the structural-container role only.
 *
 * Visible / Named / Exitable behaviors live on concrete subclasses
 * (`CartesianLocation`, `SphericalLocation`, …) and are exercised by
 * those subclasses' tests; bare Location is just `ContainerMixin(Idea)`.
 */

import { MixinApi } from '../../../api/mixin';
import { Mixins } from '../../mixin';
import "../../../../test-bootstrap";
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

describe('⭐⭐ the description mixins are on the ROOT', () => {
  /*
   * Until the base-class narrowing (2026-09-30) `Visible`, `Perceptible`
   * and `Detailed` were composed per room class, and three docstrings
   * said what that cost — `Offstage.ts`, `Bar.ts` and `Lounge.ts` each
   * carry the sentence *"every room class built directly on `Location`
   * has to remember"*, with the note that those rows *"were authoring
   * `primaryKeyword` into a void until 2026-09-11"*.
   *
   * ⚠⚠ Two classes did not remember: `Corridor` and `DormRoom` composed
   * `Visible` and `Detailed` and NOT `Perceptible`, so their rows'
   * `keywords:` were dead; the Hush gallery had `primaryKeyword`,
   * `keywords` AND `details` going nowhere. ⭐ A mixin every composer
   * has to remember is a mixin on the wrong host.
   */
  it('a bare Location is visible, addressable by keyword, and detailed', () => {
    expect(MixinApi.hasMixin(Location, Mixins.Visible)).toBe(true);
    expect(MixinApi.hasMixin(Location, Mixins.Perceptible)).toBe(true);
    expect(MixinApi.hasMixin(Location, Mixins.Detailed)).toBe(true);
  });

  it('⭐ and still everything a place was: contained, lit, aired, addressed', () => {
    for (const m of [
      Mixins.Container,
      Mixins.Adornable,
      Mixins.Atmospheric,
      Mixins.AmbientLit,
      Mixins.Addressable,
    ]) {
      expect(MixinApi.hasMixin(Location, m), `Location should ${m}`).toBe(true);
    }
  });

  it('⚠ but NOT exitable — that is the next rung, and Offstage is the proof', () => {
    // `Offstage` composes all three description mixins and none of
    // `Exitable`/`Staged`/coordinates, with the reason in its own
    // docstring. The root ends at *a place you can see, name and point
    // at*; being a place you can walk BETWEEN is what `Exitable` adds.
    // This is the Location branch's `Corpse`.
    expect(MixinApi.hasMixin(Location, Mixins.Exitable)).toBe(false);
  });
});
