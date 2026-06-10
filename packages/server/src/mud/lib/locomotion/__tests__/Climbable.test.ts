import { describe, it, expect, beforeEach } from 'vitest';
import { ClimbableMixin, CLIMBING_CAPABILITY_PROP } from '../Climbable';
import { Idea } from '../../stuff/Idea';
import Thing from '../../stuff/Thing';
import { PropertiedMixin, Property } from '../../stuff/Propertied';
import { MixinApi } from '../../../api/mixin';
import { Mixins } from '../../mixin';
import { makeStuff } from '../../security/__tests__/test-setup';

class Ladder extends ClimbableMixin(Idea) {}
class Actor extends PropertiedMixin(Thing) {}
class BareActor extends Thing {}

describe('ClimbableMixin', () => {
  describe('mixin marker', () => {
    it('MixinApi.hasMixin returns true after composition', () => {
      const l = makeStuff(() => new Ladder());
      expect(MixinApi.hasMixin(l, Mixins.Climbable)).toBe(true);
    });

    it('Mixins.Climbable resolves to "ClimbableMixin"', () => {
      expect(Mixins.Climbable).toBe('ClimbableMixin');
    });

    it('implements the shared Enablement interface (structural)', () => {
      const l = makeStuff(() => new Ladder());
      expect(typeof l.getAxes).toBe('function');
      expect(typeof l.setAxes).toBe('function');
      expect(typeof l.canEngageAxis).toBe('function');
      expect(typeof l.getDifficulty).toBe('function');
      expect(typeof l.setDifficulty).toBe('function');
      expect(typeof l.canBeEngagedBy).toBe('function');
    });
  });

  describe('axes', () => {
    let l: Ladder;
    beforeEach(() => {
      l = makeStuff(() => new Ladder());
    });

    it('defaults to empty', () => {
      expect(l.getAxes()).toEqual([]);
    });

    it('returns configured axes', () => {
      l.setAxes(['up', 'down']);
      expect(l.getAxes()).toEqual(['up', 'down']);
    });

    it('canEngageAxis returns true for a configured direction', () => {
      l.setAxes(['up']);
      expect(l.canEngageAxis('up')).toBe(true);
    });

    it('canEngageAxis returns false for an unconfigured direction', () => {
      l.setAxes(['up']);
      expect(l.canEngageAxis('north')).toBe(false);
    });

    it('canEngageAxis returns true for any direction when "*" is in axes', () => {
      l.setAxes(['*']);
      expect(l.canEngageAxis('up')).toBe(true);
      expect(l.canEngageAxis('sideways')).toBe(true);
    });
  });

  describe('setAxes validation', () => {
    let l: Ladder;
    beforeEach(() => {
      l = makeStuff(() => new Ladder());
    });

    it('accepts unique non-empty strings', () => {
      l.setAxes(['up', 'down', 'sideways']);
      expect(l.getAxes()).toEqual(['up', 'down', 'sideways']);
    });

    it('throws on duplicates', () => {
      expect(() => l.setAxes(['up', 'up'])).toThrow(/duplicate/);
    });

    it('throws on empty-string entries', () => {
      expect(() => l.setAxes([''])).toThrow(/non-empty/);
    });
  });

  describe('difficulty roundtrip', () => {
    let l: Ladder;
    beforeEach(() => {
      l = makeStuff(() => new Ladder());
    });

    it('defaults to null', () => {
      expect(l.getDifficulty()).toBe(null);
    });

    it('setDifficulty(null) is accepted', () => {
      l.setDifficulty(null);
      expect(l.getDifficulty()).toBe(null);
    });

    it('setDifficulty(positive finite) is accepted', () => {
      l.setDifficulty(3.5);
      expect(l.getDifficulty()).toBe(3.5);
    });

    it('throws on 0', () => {
      expect(() => l.setDifficulty(0)).toThrow(RangeError);
    });
    it('throws on negative', () => {
      expect(() => l.setDifficulty(-1)).toThrow(RangeError);
    });
    it('throws on NaN', () => {
      expect(() => l.setDifficulty(NaN)).toThrow(RangeError);
    });
    it('throws on Infinity', () => {
      expect(() => l.setDifficulty(Infinity)).toThrow(RangeError);
    });
  });

  describe('canBeEngagedBy', () => {
    let l: Ladder;
    let actor: Actor;

    beforeEach(() => {
      l = makeStuff(() => new Ladder());
      actor = makeStuff(() => new Actor());
    });

    it('returns true when difficulty is null regardless of actor', () => {
      expect(l.canBeEngagedBy(actor)).toBe(true);
    });

    it('returns true when actor lacks Propertied and difficulty is null', () => {
      const bare = makeStuff(() => new BareActor());
      expect(l.canBeEngagedBy(bare)).toBe(true);
    });

    it('returns false when actor lacks Propertied and difficulty is non-null', () => {
      const bare = makeStuff(() => new BareActor());
      l.setDifficulty(3);
      expect(l.canBeEngagedBy(bare)).toBe(false);
    });

    it('reads CLIMBING_CAPABILITY_PROP (default 1)', () => {
      l.setDifficulty(1);
      expect(l.canBeEngagedBy(actor)).toBe(true);
    });

    it('returns true when capability >= difficulty', () => {
      actor.setProp(CLIMBING_CAPABILITY_PROP, 5);
      l.setDifficulty(3);
      expect(l.canBeEngagedBy(actor)).toBe(true);
    });

    it('returns false when capability < difficulty', () => {
      actor.setProp(CLIMBING_CAPABILITY_PROP, 1);
      l.setDifficulty(4);
      expect(l.canBeEngagedBy(actor)).toBe(false);
    });

    it('honors capability == difficulty (>= comparison)', () => {
      actor.setProp(CLIMBING_CAPABILITY_PROP, 3);
      l.setDifficulty(3);
      expect(l.canBeEngagedBy(actor)).toBe(true);
    });

    it('honors a capability set to 0', () => {
      actor.setProp(CLIMBING_CAPABILITY_PROP, 0);
      l.setDifficulty(1);
      expect(l.canBeEngagedBy(actor)).toBe(false);
    });
  });

  describe('CLIMBING_CAPABILITY_PROP', () => {
    it('is a Property<number> named "climbing"', () => {
      const ref = Property.of<number>('climbing');
      expect(CLIMBING_CAPABILITY_PROP.toString()).toBe(ref.toString());
    });
  });
});
