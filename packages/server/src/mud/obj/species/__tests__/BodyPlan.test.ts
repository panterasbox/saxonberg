import "../../../../test-bootstrap";
import { describe, it, expect } from 'vitest';
import BodyPlan from '../BodyPlan';
import { Idea } from '../../../lib/stuff/Idea';
import { MixinApi } from '../../../api/mixin';
import { Mixins } from '../../../lib/mixin';
import { makeStuff } from '../../../lib/security/__tests__/test-setup';

describe('BodyPlan', () => {
  it('extends Idea via SingletonMixin', () => {
    const bp = makeStuff(() => new BodyPlan());
    expect(bp).toBeInstanceOf(Idea);
    expect(MixinApi.hasMixin(bp, Mixins.Singleton)).toBe(true);
  });

  it('round-trips fields', () => {
    const bp = makeStuff(() => new BodyPlan());
    bp.setName('biped');
    bp.setSlots([
      { name: 'head', accepts: 'WearableMixin' },
      { name: 'torso', accepts: 'WearableMixin' },
      { name: 'hand:left', accepts: 'WieldableMixin' },
      { name: 'hand:right', accepts: 'WieldableMixin' },
    ]);
    bp.setLocomotionModes(['walk']);
    bp.setSensoryPorts([
      { modality: 'vision', count: 2, position: 'frontal' },
    ]);
    expect(bp.getName()).toBe('biped');
    expect(bp.getSlots()).toEqual([
      { name: 'head', accepts: 'WearableMixin' },
      { name: 'torso', accepts: 'WearableMixin' },
      { name: 'hand:left', accepts: 'WieldableMixin' },
      { name: 'hand:right', accepts: 'WieldableMixin' },
    ]);
    expect(bp.getLocomotionModes()).toEqual(['walk']);
    expect(bp.getSensoryPorts()).toEqual([
      { modality: 'vision', count: 2, position: 'frontal' },
    ]);
  });

  it('sessile body plan can be all-empty', () => {
    const bp = makeStuff(() => new BodyPlan());
    bp.setName('sessile');
    expect(bp.getSlots()).toEqual([]);
    expect(bp.getLocomotionModes()).toEqual([]);
    expect(bp.getSensoryPorts()).toEqual([]);
  });

  it('setSlots rejects spec missing name', () => {
    const bp = makeStuff(() => new BodyPlan());
    expect(() =>
      bp.setSlots([
        // @ts-expect-error — deliberately invalid
        { accepts: 'WearableMixin' },
      ])
    ).toThrow(/missing 'name'/);
  });

  it('setSlots rejects spec missing accepts', () => {
    const bp = makeStuff(() => new BodyPlan());
    expect(() =>
      bp.setSlots([
        // @ts-expect-error — deliberately invalid
        { name: 'head' },
      ])
    ).toThrow(/missing 'accepts'/);
  });

  it('preserves slot ordering', () => {
    const bp = makeStuff(() => new BodyPlan());
    const ordered = [
      { name: 'a', accepts: 'WearableMixin' },
      { name: 'b', accepts: 'WearableMixin' },
      { name: 'c', accepts: 'WearableMixin' },
    ];
    bp.setSlots(ordered);
    expect(bp.getSlots().map(s => s.name)).toEqual(['a', 'b', 'c']);
  });

  describe('getModalities (senses build)', () => {
    it('returns deduped channel list from sensoryPorts', () => {
      const bp = makeStuff(() => new BodyPlan());
      bp.setSensoryPorts([
        { modality: 'vision', count: 2, position: 'frontal' },
        { modality: 'hearing', count: 2, position: 'lateral' },
        { modality: 'smell', count: 1, position: 'forward' },
        { modality: 'taste', count: 1, position: 'forward' },
        { modality: 'touch', count: 1, position: 'circumferential' },
      ]);
      // Insertion-order preservation via Set.
      expect(bp.getModalities()).toEqual([
        'vision',
        'hearing',
        'smell',
        'taste',
        'touch',
      ]);
    });

    it('returns [] for a sessile body plan with no ports', () => {
      const bp = makeStuff(() => new BodyPlan());
      bp.setName('sessile');
      expect(bp.getModalities()).toEqual([]);
    });

    it('dedupes when one channel has multiple ports', () => {
      const bp = makeStuff(() => new BodyPlan());
      bp.setSensoryPorts([
        { modality: 'vision', count: 2, position: 'frontal' },
        { modality: 'vision', count: 2, position: 'dorsal' },
        { modality: 'hearing', count: 2, position: 'lateral' },
      ]);
      expect(bp.getModalities()).toEqual(['vision', 'hearing']);
    });
  });

  describe('defaultLocomotionMode', () => {
    it('defaults to null', () => {
      const bp = makeStuff(() => new BodyPlan());
      expect(bp.getDefaultLocomotionMode()).toBeNull();
    });

    it('round-trips a non-empty string', () => {
      const bp = makeStuff(() => new BodyPlan());
      bp.setDefaultLocomotionMode('fly');
      expect(bp.getDefaultLocomotionMode()).toBe('fly');
    });

    it('round-trips null', () => {
      const bp = makeStuff(() => new BodyPlan());
      bp.setDefaultLocomotionMode('walk');
      bp.setDefaultLocomotionMode(null);
      expect(bp.getDefaultLocomotionMode()).toBeNull();
    });

    it('throws on empty string', () => {
      const bp = makeStuff(() => new BodyPlan());
      expect(() => bp.setDefaultLocomotionMode('')).toThrow(TypeError);
    });
  });
});
