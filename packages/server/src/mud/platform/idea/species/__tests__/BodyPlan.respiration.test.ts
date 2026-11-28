/**
 * ⭐⭐ Breathing DERIVES from organs (organism-biology D10, W8) — the plan's
 * `breathing`, `respires` and `lungVolumeL` retired. A body breathes, per
 * medium, the best intake over its present breathing organs; a body with
 * parts and no such organ does not respire; an unmodelled body (no parts)
 * breathes air as a person does. The voice and the ports stay the plan's.
 */

import "../../../../../test-bootstrap";
import { setFlatSenses } from '../../../../lib/species/__tests__/flat-body';
import { describe, it, expect } from 'vitest';
import BodyPlan from '../BodyPlan';
import { makeStuff, makeStuffAtPath } from '../../../../lib/security/__tests__/test-setup';
import { MixinApi } from '../../../../api/mixin';
import { setFlatBreathing, setFlatParts } from '../../../../lib/species/__tests__/flat-body';

let seq = 0;
const plan = (): BodyPlan => makeStuffAtPath(() => new BodyPlan(), `/stuff/idea/species/BodyPlan/_test-breath-${seq++}`);

describe('breathing — derived from organs (D10)', () => {
  it('an unmodelled body breathes air, as a person does', () => {
    const bp = makeStuff(() => new BodyPlan());
    expect(bp.getBody().breathableMedia()).toEqual(['air']);
    expect(bp.getBody().breathing()).toEqual([{ medium: 'air', apparatus: 'lungs', intake: 1 }]);
    expect(bp.getBody().respires()).toBe(true);
  });

  it('gills breathe water', () => {
    const bp = plan();
    setFlatBreathing(bp, [{ medium: 'water', apparatus: 'gills', intake: 1 }]);
    expect(bp.getBody().breathableMedia()).toEqual(['water']);
  });

  it('⭐ a partial intake is breathing, but not freely: it is not in the breathable set', () => {
    const bp = plan();
    setFlatBreathing(bp, [
      { medium: 'water', apparatus: 'gills', intake: 1 },
      { medium: 'air', apparatus: 'gills', intake: 0.4 },
    ]);
    expect(bp.getBody().breathableMedia()).toEqual(['water']);
  });

  it('⭐ per medium, the best organ wins — a frog\'s lungs in air, its skin in water', () => {
    const bp = plan();
    setFlatParts(bp, [
      { key: 'body.torso', parent: null, tissues: [{ tissuePath: '/x/flesh', share: 1 }], breathes: [{ medium: 'water', apparatus: 'skin', intake: 0.75 }] },
      { key: 'body.torso.lungs', parent: 'body.torso', tissues: [], breathes: [{ medium: 'air', apparatus: 'lungs', intake: 1, volumeL: 0.02 }] },
    ]);
    const body = bp.getBody();
    expect(body.breathing()).toEqual([
      { medium: 'water', apparatus: 'skin', intake: 0.75 },
      { medium: 'air', apparatus: 'lungs', intake: 1 },
    ]);
    expect(body.lungVolumeL()).toBeCloseTo(0.02, 6);
    // Lose the lungs and it breathes only through its skin.
    expect(body.breathing((k) => k !== 'body.torso.lungs')).toEqual([{ medium: 'water', apparatus: 'skin', intake: 0.75 }]);
    expect(body.lungVolumeL((k) => k !== 'body.torso.lungs')).toBe(0);
  });

  it('a body with parts and no breathing organ does not respire', () => {
    const bp = plan();
    setFlatBreathing(bp, []);
    expect(bp.getBody().respires()).toBe(false);
    expect(bp.getBody().breathableMedia()).toEqual([]);
  });

  it('⭐ under the water a nose does not work and eyes do; a voice is air-only unless authored', () => {
    const bp = makeStuff(() => new BodyPlan());
    setFlatSenses(bp, [
      { modality: 'vision', count: 2, position: 'frontal' },
      { modality: 'smell', count: 1, position: 'frontal' },
    ]);
    expect(bp.getBody().modalitiesIn('water')).toEqual(['vision']);
    expect(bp.getBody().modalitiesIn('air')).toEqual(['vision', 'smell']);
    expect(bp.getVoiceMedia()).toEqual(['air']);
    bp.setVoice({ media: ['air', 'water'] });
    expect(bp.getVoiceMedia()).toEqual(['air', 'water']);
  });

  it('the plan no longer carries breathing, respires or a lung volume', () => {
    const fields = MixinApi.getAllPersistentFields(BodyPlan);
    expect(fields).not.toContain('breathing');
    expect(fields).not.toContain('respires');
    expect(fields).not.toContain('lungVolumeL');
    expect(fields).toContain('voice');
  });
});
