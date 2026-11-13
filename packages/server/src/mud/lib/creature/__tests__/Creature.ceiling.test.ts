/**
 * ⭐ A ceiling is a ceiling only where there is one (size and carrying
 * D21): under a ceiling lower than the body's stature `stand` is refused
 * `ceiling-too-low`; under the open sky, never; a body with no stature
 * is never refused. The body asks — nothing about its posture changes.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Creature } from '../Creature';
import Species from '../../../platform/idea/species/Species';
import BodyPlan from '../../../platform/idea/species/BodyPlan';
import { Postures } from '../../slot/Postured';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import { makeStuff, stampTemplatePathForTest } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import { place } from '../../spatial/__tests__/size-fixture';

function body(statureM: number): Creature {
  const plan = makeStuff(() => new BodyPlan());
  plan.setName(`ceiling-${statureM}`);
  plan.setBaseMass(70);
  plan.setBaseStature(statureM);
  stampTemplatePathForTest(plan, `/stuff/idea/species/BodyPlan/ceiling-${statureM}`);
  const sp = makeStuff(() => new Species());
  sp.setBodyPlan(plan);
  stampTemplatePathForTest(sp, `/stuff/idea/species/test/ceiling-${statureM}`);
  const c = makeStuff(() => new Creature());
  c.setSpecies(sp);
  return c;
}

describe('Creature.poseRefusal — the ceiling', () => {
  beforeEach(() => installV1QuantityMarshallers());
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('under a 1.5 m ceiling a 1.75 m body may not stand', () => {
    const cellar = place(1.5, 'ceiling', 'walled');
    const human = body(1.75);
    ContainmentApi.move(human, cellar);
    const refused = human.poseRefusal(Postures.Stand);
    expect(refused?.reason).toBe('ceiling-too-low');
    expect(refused?.facts).toEqual({ ceilingM: 1.5, statureM: 1.75 });
    // Asking changes nothing.
    expect(human.getPosture()).toBe(Postures.Stand);
    // Sitting is not standing.
    expect(human.poseRefusal(Postures.Sit)).toBeNull();
  });

  it('a gnome stands where a human cannot', () => {
    const cellar = place(1.5, 'ceiling', 'walled');
    const gnome = body(1.0);
    ContainmentApi.move(gnome, cellar);
    expect(gnome.poseRefusal(Postures.Stand)).toBeNull();
  });

  it('under the open sky there is no ceiling', () => {
    const pit = place(1.5, 'open', 'walled');
    const human = body(1.75);
    ContainmentApi.move(human, pit);
    expect(human.poseRefusal(Postures.Stand)).toBeNull();
  });

  it('a body with no stature is never refused', () => {
    const cellar = place(1.5, 'ceiling', 'walled');
    const nobody = body(0);
    ContainmentApi.move(nobody, cellar);
    expect(nobody.poseRefusal(Postures.Stand)).toBeNull();
  });
});
