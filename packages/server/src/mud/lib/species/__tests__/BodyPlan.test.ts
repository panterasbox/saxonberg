import { describe, it, expect } from 'vitest';
import { BodyPlan } from '../BodyPlan';
import { Idea } from '../../stuff/Idea';
import { MixinApi } from '../../../api/mixin';
import { Mixins } from '../../mixin';
import { makeStuff } from '../../security/__tests__/test-setup';

describe('BodyPlan', () => {
  it('extends Idea via SingletonMixin', () => {
    const bp = makeStuff(() => new BodyPlan());
    expect(bp).toBeInstanceOf(Idea);
    expect(MixinApi.hasMixin(bp, Mixins.Singleton)).toBe(true);
  });

  it('round-trips fields', () => {
    const bp = makeStuff(() => new BodyPlan());
    bp.setName('biped');
    bp.setWornSlots(['head', 'torso']);
    bp.setHeldSlots(['hand:left', 'hand:right']);
    bp.setLocomotionModes(['walk']);
    bp.setSensoryPorts([
      { modality: 'sight', count: 2, position: 'frontal' },
    ]);
    expect(bp.getName()).toBe('biped');
    expect(bp.getWornSlots()).toEqual(['head', 'torso']);
    expect(bp.getHeldSlots()).toEqual(['hand:left', 'hand:right']);
    expect(bp.getLocomotionModes()).toEqual(['walk']);
    expect(bp.getSensoryPorts()).toEqual([
      { modality: 'sight', count: 2, position: 'frontal' },
    ]);
  });

  it('sessile body plan can be all-empty', () => {
    const bp = makeStuff(() => new BodyPlan());
    bp.setName('sessile');
    expect(bp.getWornSlots()).toEqual([]);
    expect(bp.getHeldSlots()).toEqual([]);
    expect(bp.getLocomotionModes()).toEqual([]);
    expect(bp.getSensoryPorts()).toEqual([]);
  });
});
