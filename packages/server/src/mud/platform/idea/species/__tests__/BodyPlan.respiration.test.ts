/**
 * BodyPlan respiration fields — `breathing` (how the body takes oxygen,
 * medium by medium, underwater D21), the derived breathable set, the
 * voice and port media, and the `respires` opt-out.
 */

import "../../../../../test-bootstrap";
import { describe, it, expect } from 'vitest';
import BodyPlan from '../BodyPlan';
import { makeStuff } from '../../../../lib/security/__tests__/test-setup';
import { MixinApi } from '../../../../api/mixin';

describe('BodyPlan — respiration fields', () => {
  it('defaults to lungs in air, respiring', () => {
    const bp = makeStuff(() => new BodyPlan());
    expect(bp.getBreathableMedia()).toEqual(['air']);
    expect(bp.getBreathing()).toEqual([{ medium: 'air', apparatus: 'lungs', intake: 1 }]);
    expect(bp.isRespiring()).toBe(true);
  });

  it('inverts to a water-breather', () => {
    const bp = makeStuff(() => new BodyPlan());
    bp.setBreathing([{ medium: 'water', apparatus: 'gills', intake: 1 }]);
    expect(bp.getBreathableMedia()).toEqual(['water']);
  });

  it('⭐ a partial intake is breathing, but not freely: it is not in the breathable set', () => {
    const bp = makeStuff(() => new BodyPlan());
    bp.setBreathing([
      { medium: 'water', apparatus: 'gills', intake: 1 },
      { medium: 'air', apparatus: 'gills', intake: 0.4 },
    ]);
    expect(bp.getBreathableMedia()).toEqual(['water']);
  });

  it('rejects a missing medium, a duplicate, and an intake out of range', () => {
    const bp = makeStuff(() => new BodyPlan());
    expect(() => bp.setBreathing([{ medium: '', apparatus: 'lungs', intake: 1 }])).toThrow(/medium/);
    expect(() => bp.setBreathing([
      { medium: 'air', apparatus: 'lungs', intake: 1 },
      { medium: 'air', apparatus: 'skin', intake: 0.2 },
    ])).toThrow(/duplicate/);
    expect(() => bp.setBreathing([{ medium: 'air', apparatus: 'lungs', intake: 2 }])).toThrow(/\[0, 1\]/);
  });

  it('allows an empty breathing list (breathes nothing — not the opt-out)', () => {
    const bp = makeStuff(() => new BodyPlan());
    bp.setBreathing([]);
    expect(bp.getBreathableMedia()).toEqual([]);
  });

  it('⭐ under the water a nose does not work and eyes do; a voice is air-only unless authored', () => {
    const bp = makeStuff(() => new BodyPlan());
    bp.setSensoryPorts([
      { modality: 'vision', count: 2, position: 'frontal' },
      { modality: 'smell', count: 1, position: 'frontal' },
    ]);
    expect(bp.getModalitiesIn('water')).toEqual(['vision']);
    expect(bp.getModalitiesIn('air')).toEqual(['vision', 'smell']);
    expect(bp.getVoiceMedia()).toEqual(['air']);
    bp.setVoice({ media: ['air', 'water'] });
    expect(bp.getVoiceMedia()).toEqual(['air', 'water']);
  });

  it('respires opt-out round-trips', () => {
    const bp = makeStuff(() => new BodyPlan());
    bp.setRespires(false);
    expect(bp.isRespiring()).toBe(false);
    bp.setRespires(true);
    expect(bp.isRespiring()).toBe(true);
  });

  it('declares the new fields as persistent', () => {
    const fields = MixinApi.getAllPersistentFields(BodyPlan);
    expect(fields).toContain('breathing');
    expect(fields).toContain('voice');
    expect(fields).toContain('respires');
  });
});
