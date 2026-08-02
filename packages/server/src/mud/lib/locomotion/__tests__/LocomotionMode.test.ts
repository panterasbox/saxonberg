import { describe, it, expect } from 'vitest';
import {
  LocomotionMode,
  type BodyProfile,
  type GroundContact,
  type NoiseLevel,
} from '../LocomotionMode';
import { Idea } from '../../stuff/Idea';
import { MixinApi } from '../../../api/mixin';
import { Mixins } from '../../mixin';
import { makeStuff } from '../../security/__tests__/test-setup';

describe('LocomotionMode', () => {
  describe('class shape', () => {
    it('extends Idea via SingletonMixin (and PropertiedMixin)', () => {
      const mode = makeStuff(() => new LocomotionMode());
      expect(mode).toBeInstanceOf(Idea);
      expect(MixinApi.hasMixin(mode, Mixins.Singleton)).toBe(true);
      expect(MixinApi.hasMixin(mode, Mixins.Propertied)).toBe(true);
    });

    // This assertion used to read the class's OWN `persistentFields`
    // static. `getAllPersistentFields` aggregates the whole chain, so
    // it also answers `savedProps` / `savedPropMarshallers` from
    // `PropertiedMixin` — the two are not the same question. Both are
    // asserted, which makes the test stricter than it was.
    const OWN = [
      'name',
      'speed',
      'noiseLevel',
      'bodyProfile',
      'groundContact',
      'requiresBodyPlanMode',
      'requiresPosture',
      'costMultiplier',
      'passthrough',
      'conveyanceMixin',
      'enablementMixin',
      'medium',
    ];

    it('declares exactly the expected fields (class shape)', () => {
      expect(Object.keys(LocomotionMode.fieldMeta)).toEqual(OWN);
      for (const f of OWN) {
        expect(LocomotionMode.fieldMeta[f]).toEqual({ persistent: true });
      }
    });

    it('the composed list is own-first, then inherited — the key order the Hydrator relies on', () => {
      // `PersistentHydrator` Phase 1 applies fields in this order, and
      // `getAllFieldMeta` collects keys concrete-class-first. That the
      // class's own twelve lead, in declared order, is the guarantee.
      expect(MixinApi.getAllPersistentFields(LocomotionMode)).toEqual([
        ...OWN,
        'savedProps',
        'savedPropMarshallers',
      ]);
    });

    it('default field values', () => {
      const mode = makeStuff(() => new LocomotionMode());
      expect(mode.getName()).toBe('');
      expect(mode.getSpeed()).toBe(1.0);
      expect(mode.getNoiseLevel()).toBe('normal');
      expect(mode.getBodyProfile()).toBe('upright');
      expect(mode.getGroundContact()).toBe('full');
      expect(mode.getRequiresBodyPlanMode()).toEqual([]);
      expect(mode.getRequiresPosture()).toEqual([]);
      expect(mode.getCostMultiplier()).toBe(1.0);
      expect(mode.getPassthrough()).toBe(false);
      expect(mode.getConveyanceMixin()).toBe(null);
      expect(mode.getEnablementMixin()).toBe(null);
      expect(mode.getMedium()).toBe(null);
    });

    it('round-trips walk-shaped property values', () => {
      const mode = makeStuff(() => new LocomotionMode());
      mode.setName('walk');
      mode.setSpeed(1.0);
      mode.setNoiseLevel('normal');
      mode.setBodyProfile('upright');
      mode.setGroundContact('full');
      mode.setRequiresBodyPlanMode(['walk']);
      mode.setCostMultiplier(1.0);
      mode.setPassthrough(false);
      mode.setConveyanceMixin(null);
      mode.setEnablementMixin(null);
      expect(mode.getName()).toBe('walk');
      expect(mode.getRequiresBodyPlanMode()).toEqual(['walk']);
    });

    it('round-trips passthrough ride-shaped property values', () => {
      const mode = makeStuff(() => new LocomotionMode());
      mode.setName('ride');
      mode.setPassthrough(true);
      mode.setConveyanceMixin('MountableMixin');
      mode.setEnablementMixin(null);
      expect(mode.getPassthrough()).toBe(true);
      expect(mode.getConveyanceMixin()).toBe('MountableMixin');
    });
  });

  describe('setSpeed', () => {
    it('accepts a positive finite number', () => {
      const m = makeStuff(() => new LocomotionMode());
      m.setSpeed(2.5);
      expect(m.getSpeed()).toBe(2.5);
    });

    it('throws on 0', () => {
      const m = makeStuff(() => new LocomotionMode());
      expect(() => m.setSpeed(0)).toThrow(RangeError);
    });

    it('throws on negative', () => {
      const m = makeStuff(() => new LocomotionMode());
      expect(() => m.setSpeed(-1)).toThrow(RangeError);
    });

    it('throws on NaN', () => {
      const m = makeStuff(() => new LocomotionMode());
      expect(() => m.setSpeed(NaN)).toThrow(RangeError);
    });

    it('throws on Infinity', () => {
      const m = makeStuff(() => new LocomotionMode());
      expect(() => m.setSpeed(Infinity)).toThrow(RangeError);
    });
  });

  describe('setNoiseLevel', () => {
    it('accepts each valid NoiseLevel', () => {
      const m = makeStuff(() => new LocomotionMode());
      for (const v of [
        'silent',
        'quiet',
        'normal',
        'loud',
      ] satisfies NoiseLevel[]) {
        m.setNoiseLevel(v);
        expect(m.getNoiseLevel()).toBe(v);
      }
    });

    it('throws on unknown value', () => {
      const m = makeStuff(() => new LocomotionMode());
      expect(() => m.setNoiseLevel('thunderous' as unknown as NoiseLevel))
        .toThrow(TypeError);
    });
  });

  describe('setBodyProfile', () => {
    it('accepts each of the five valid values', () => {
      const m = makeStuff(() => new LocomotionMode());
      for (const v of [
        'prone',
        'crouched',
        'upright',
        'horizontal',
        'varied',
      ] satisfies BodyProfile[]) {
        m.setBodyProfile(v);
        expect(m.getBodyProfile()).toBe(v);
      }
    });

    it('throws on unknown value', () => {
      const m = makeStuff(() => new LocomotionMode());
      expect(() => m.setBodyProfile('slithering' as unknown as BodyProfile))
        .toThrow(TypeError);
    });
  });

  describe('setGroundContact', () => {
    it('accepts each valid GroundContact', () => {
      const m = makeStuff(() => new LocomotionMode());
      for (const v of [
        'none',
        'partial',
        'full',
      ] satisfies GroundContact[]) {
        m.setGroundContact(v);
        expect(m.getGroundContact()).toBe(v);
      }
    });

    it('throws on unknown value', () => {
      const m = makeStuff(() => new LocomotionMode());
      expect(() => m.setGroundContact('floaty' as unknown as GroundContact))
        .toThrow(TypeError);
    });
  });

  describe('setRequiresBodyPlanMode', () => {
    it('accepts an empty array', () => {
      const m = makeStuff(() => new LocomotionMode());
      m.setRequiresBodyPlanMode([]);
      expect(m.getRequiresBodyPlanMode()).toEqual([]);
    });

    it('accepts unique non-empty strings', () => {
      const m = makeStuff(() => new LocomotionMode());
      m.setRequiresBodyPlanMode(['walk', 'climb']);
      expect(m.getRequiresBodyPlanMode()).toEqual(['walk', 'climb']);
    });

    it('throws on duplicate entries', () => {
      const m = makeStuff(() => new LocomotionMode());
      expect(() => m.setRequiresBodyPlanMode(['walk', 'walk'])).toThrow(/duplicate/);
    });

    it('throws on empty-string entry', () => {
      const m = makeStuff(() => new LocomotionMode());
      expect(() => m.setRequiresBodyPlanMode(['', 'walk'])).toThrow(/non-empty/);
    });
  });

  describe('setRequiresPosture', () => {
    it('accepts an empty array', () => {
      const m = makeStuff(() => new LocomotionMode());
      m.setRequiresPosture([]);
      expect(m.getRequiresPosture()).toEqual([]);
    });

    it('accepts unique non-empty strings', () => {
      const m = makeStuff(() => new LocomotionMode());
      m.setRequiresPosture(['stand', 'sit']);
      expect(m.getRequiresPosture()).toEqual(['stand', 'sit']);
    });

    it('throws on duplicate entries', () => {
      const m = makeStuff(() => new LocomotionMode());
      expect(() => m.setRequiresPosture(['stand', 'stand'])).toThrow(/duplicate/);
    });
  });

  describe('setCostMultiplier', () => {
    it('accepts a positive finite number', () => {
      const m = makeStuff(() => new LocomotionMode());
      m.setCostMultiplier(0.5);
      expect(m.getCostMultiplier()).toBe(0.5);
    });

    it('throws on 0 / negative / NaN / Infinity', () => {
      const m = makeStuff(() => new LocomotionMode());
      expect(() => m.setCostMultiplier(0)).toThrow(RangeError);
      expect(() => m.setCostMultiplier(-2)).toThrow(RangeError);
      expect(() => m.setCostMultiplier(NaN)).toThrow(RangeError);
      expect(() => m.setCostMultiplier(Infinity)).toThrow(RangeError);
    });
  });

  describe('setPassthrough / setConveyanceMixin', () => {
    it('round-trips booleans and nullable strings', () => {
      const m = makeStuff(() => new LocomotionMode());
      m.setPassthrough(true);
      expect(m.getPassthrough()).toBe(true);
      m.setPassthrough(false);
      expect(m.getPassthrough()).toBe(false);

      m.setConveyanceMixin('MountableMixin');
      expect(m.getConveyanceMixin()).toBe('MountableMixin');
      m.setConveyanceMixin(null);
      expect(m.getConveyanceMixin()).toBe(null);
    });
  });

  describe('setEnablementMixin', () => {
    it('round-trips a Mixins-registry-constant string', () => {
      const m = makeStuff(() => new LocomotionMode());
      m.setEnablementMixin(Mixins.Climbable);
      expect(m.getEnablementMixin()).toBe('ClimbableMixin');
    });

    it('round-trips null (walk-shaped no-scope-check)', () => {
      const m = makeStuff(() => new LocomotionMode());
      m.setEnablementMixin(null);
      expect(m.getEnablementMixin()).toBe(null);
    });
  });

  describe('setMedium', () => {
    it('round-trips a non-empty string', () => {
      const m = makeStuff(() => new LocomotionMode());
      m.setMedium('ground');
      expect(m.getMedium()).toBe('ground');
    });

    it('round-trips null (passthrough modes)', () => {
      const m = makeStuff(() => new LocomotionMode());
      m.setMedium(null);
      expect(m.getMedium()).toBe(null);
    });

    it('throws on empty string', () => {
      const m = makeStuff(() => new LocomotionMode());
      expect(() => m.setMedium('')).toThrow(TypeError);
    });
  });
});
