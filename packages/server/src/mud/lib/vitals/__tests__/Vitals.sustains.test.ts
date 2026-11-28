/**
 * ⭐ The redundant rule (organism-biology D6): a part SUSTAINS a capacity
 * and any surviving one suffices — `max`, beside `governs`' min and
 * `serves`' mean. Two kidneys: lose one and filtration is full; lose both
 * and the body is past its anatomy death floor.
 */
import '../../../../test-bootstrap';
import { describe, it, expect, afterEach } from 'vitest';
import { Creature } from '../../creature/Creature';
import Species from '../../../platform/idea/species/Species';
import BodyPlan from '../../../platform/idea/species/BodyPlan';
import { StuffApi } from '../../../api/stuff';
import { makeStuff, makeStuffAtPath } from '../../security/__tests__/test-setup';
import { setFlatParts } from '../../species/__tests__/flat-body';

const FLESH = '/stuff/idea/material/tissue/flesh';
const KIDNEY = '/stuff/idea/material/tissue/kidney';

afterEach(() => StuffApi.clearAll());

function body(): Creature {
  const plan = makeStuffAtPath(() => new BodyPlan(), '/stuff/idea/species/BodyPlan/_test-kidneys');
  setFlatParts(plan, [
    { key: 'body.torso', parent: null, tissues: [{ tissuePath: FLESH, share: 0.9 }] },
    { key: 'body.torso.kidney.left', parent: 'body.torso', sustains: ['filtration'], tissues: [{ tissuePath: KIDNEY, share: 0.05 }] },
    { key: 'body.torso.kidney.right', parent: 'body.torso', sustains: ['filtration'], tissues: [{ tissuePath: KIDNEY, share: 0.05 }] },
  ]);
  makeStuffAtPath(() => {
    const s = new Species();
    s._bodyPlanPath = '/stuff/idea/species/BodyPlan/_test-kidneys';
    return s;
  }, '/stuff/idea/species/_test/kidneyed');
  const c = makeStuff(() => new Creature());
  c._speciesPath = '/stuff/idea/species/_test/kidneyed';
  c.setLifecycleState('alive');
  return c;
}

describe('the redundant rule — sustains', () => {
  it('both kidneys: filtration is full', () => {
    expect(body().capacity('filtration')).toBe('full');
  });

  it('⭐ one kidney lost: filtration is STILL full (any one suffices)', () => {
    const c = body();
    c.severPart('body.torso.kidney.left');
    expect(c.capacity('filtration')).toBe('full');
  });

  it('⭐⭐ both lost: filtration is gone and the body is past its death floor', () => {
    const c = body();
    c.severPart('body.torso.kidney.left');
    c.severPart('body.torso.kidney.right');
    expect(c.capacity('filtration')).toBe('lost');
    expect((c as unknown as { hasMissingVitalGovernor(): boolean }).hasMissingVitalGovernor()).toBe(true);
  });
});
