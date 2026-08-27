/**
 * BodyPlan respiration fields — `breathableMedia` (the species breathable
 * set, sibling of `locomotionModes`) and the `respires` opt-out.
 */

import "../../../../../test-bootstrap";
import { describe, it, expect } from 'vitest';
import BodyPlan from '../BodyPlan';
import { makeStuff } from '../../../../lib/security/__tests__/test-setup';
import { MixinApi } from '../../../../api/mixin';

describe('BodyPlan — respiration fields', () => {
  it('defaults to air-breathing and respiring', () => {
    const bp = makeStuff(() => new BodyPlan());
    expect(bp.getBreathableMedia()).toEqual(['air']);
    expect(bp.isRespiring()).toBe(true);
  });

  it('inverts to a water-breather', () => {
    const bp = makeStuff(() => new BodyPlan());
    bp.setBreathableMedia(['water']);
    expect(bp.getBreathableMedia()).toEqual(['water']);
  });

  it('rejects empty/duplicate breathable media entries', () => {
    const bp = makeStuff(() => new BodyPlan());
    expect(() => bp.setBreathableMedia(['air', ''])).toThrow(
      /non-empty strings/,
    );
    expect(() => bp.setBreathableMedia(['air', 'air'])).toThrow(/duplicate/);
  });

  it('allows an empty breathable set (breathes nothing — not the opt-out)', () => {
    const bp = makeStuff(() => new BodyPlan());
    bp.setBreathableMedia([]);
    expect(bp.getBreathableMedia()).toEqual([]);
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
    expect(fields).toContain('breathableMedia');
    expect(fields).toContain('respires');
  });
});
