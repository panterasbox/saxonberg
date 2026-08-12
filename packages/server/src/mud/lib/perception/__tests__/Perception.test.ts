/**
 * PerceptionMixin tests — identity defaults of the subjective-
 * interpretation seams. Production behavior comes from Shadows
 * (BlindfoldShadow, NightVisionShadow, etc.) overriding these
 * methods through standard Stuff Shadow dispatch; this file pins
 * the bare-mixin contract (input == output, profile is null).
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach } from 'vitest';
import { PerceptionMixin } from '../Perception';
import { Idea } from '../../stuff/Idea';
import { Mixins, type FieldMeta } from '../../mixin';
import { MixinApi } from '../../../api/mixin';
import { makeStuff } from '../../security/__tests__/test-setup';
import type { Stuff } from '../../stuff/Stuff';
import type { Container } from '../../spatial/Container';
import { LIGHT_BANDS } from '../Light';

class PerceiverThing extends PerceptionMixin(Idea) {
  static fieldMeta: FieldMeta = {};
}

// Stand-in location — Perception's defaults treat `loc` as opaque, so a
// duck-typed value suffices. No actual containment behavior is exercised.
const stubLoc = {} as Stuff & Container;

const stubTarget = {} as Stuff;

describe('PerceptionMixin', () => {
  let viewer: PerceiverThing;

  beforeEach(() => {
    viewer = makeStuff(() => new PerceiverThing());
  });

  describe('Marker and predicate', () => {
    it('declares the PerceptionMixin marker', () => {
      expect(MixinApi.hasMixin(PerceiverThing, Mixins.Perception)).toBe(true);
    });

    it('narrows via MixinApi.isPerception', () => {
      expect(MixinApi.isPerception(viewer)).toBe(true);
    });
  });

  describe('perceivedBandModifier (identity default)', () => {
    it.each(LIGHT_BANDS)('returns the raw band %s unchanged', (band) => {
      expect(viewer.perceivedBandModifier(band, stubLoc)).toBe(band);
    });

    it('ignores the location argument', () => {
      // The identity default doesn't read loc; passing two different
      // locs must produce the same answer for the same raw band. This
      // pins the "default is location-agnostic" contract — shadows can
      // diverge from it, the bare mixin must not.
      const a = viewer.perceivedBandModifier('dim', stubLoc);
      const b = viewer.perceivedBandModifier('dim', {} as Stuff & Container);
      expect(a).toBe(b);
    });
  });

  describe('canSeeOverride (identity default)', () => {
    it('returns the raw answer unchanged for true', () => {
      expect(viewer.canSeeOverride(stubTarget, 'shape', true)).toBe(true);
    });

    it('returns the raw answer unchanged for false', () => {
      expect(viewer.canSeeOverride(stubTarget, 'shape', false)).toBe(false);
    });

    it.each(['shape', 'figure', 'detail', 'fine'] as const)(
      'is detail-level neutral at %s',
      (detail) => {
        expect(viewer.canSeeOverride(stubTarget, detail, true)).toBe(true);
        expect(viewer.canSeeOverride(stubTarget, detail, false)).toBe(false);
      },
    );
  });

  describe('getVisionProfile (identity default)', () => {
    it('returns null so callers fall back to the framework default profile', () => {
      expect(viewer.getVisionProfile()).toBeNull();
    });
  });
});
