/**
 * ⭐⭐ Metamorphosis — one creature, several bodies (organism-biology D10).
 *
 * A species' `development` names a plan per stage; `getBody()` answers the
 * stage's body; `reconcileForm` (inside the conditions reconcile) remaps
 * what the body carries when the stage moves onto another plan: a wound on
 * a part the new body lacks passes to its nearest ancestor that it has,
 * deltas on such parts go with them, and `formStage` is stamped. The same
 * object throughout — and breathing follows the organs.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Creature } from '../../creature/Creature';
import Species from '../../../platform/idea/species/Species';
import BodyPlan from '../../../platform/idea/species/BodyPlan';
import { WorldClockApi } from '../../../api/worldclock';
import '../../../platform/idea/WorldClockRegistry';
import { makeStuff, makeStuffAtPath } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import { setFlatParts } from '../../species/__tests__/flat-body';
import type { Trauma } from '../../../platform/idea/Condition';

const FLESH = '/stuff/idea/material/tissue/flesh';
let seq = 0;

function frogSpecies(): Species {
  const id = seq++;
  const tadpole = makeStuffAtPath(() => new BodyPlan(), `/stuff/idea/species/BodyPlan/_test-tadpole-${id}`);
  setFlatParts(tadpole, [
    { key: 'body.torso', parent: null, tissues: [{ tissuePath: FLESH, share: 0.6 }], breathes: [{ medium: 'water', apparatus: 'gills', intake: 1 }] },
    { key: 'body.tail', parent: 'body.torso', severable: true, tissues: [{ tissuePath: FLESH, share: 0.4 }], gait: ['swim'] },
  ]);
  const frog = makeStuffAtPath(() => new BodyPlan(), `/stuff/idea/species/BodyPlan/_test-frog-${id}`);
  setFlatParts(frog, [
    { key: 'body.torso', parent: null, tissues: [{ tissuePath: FLESH, share: 0.6 }], breathes: [{ medium: 'water', apparatus: 'skin', intake: 0.75 }] },
    { key: 'body.torso.lungs', parent: 'body.torso', tissues: [], breathes: [{ medium: 'air', apparatus: 'lungs', intake: 1 }] },
    { key: 'body.leg.left', parent: 'body.torso', severable: true, tissues: [{ tissuePath: FLESH, share: 0.2 }], gait: ['walk'] },
    { key: 'body.leg.right', parent: 'body.torso', severable: true, tissues: [{ tissuePath: FLESH, share: 0.2 }], gait: ['walk'] },
  ]);
  return makeStuffAtPath(() => {
    const s = new Species();
    s.setBodyPlan(frog);
    s.setSexDeterminationSystem('xy');
    s.setAgeCurve({ weanedAt: 300, matureAt: 340, agedAt: 2000, senescentAt: 2700 });
    s.setCommonNames(['bullfrog', 'frog']);
    s.applyDevelopment({ newborn: { plan: tadpole.getTemplatePath()! } });
    s.applyVariants({ stage: { newborn: { commonNames: ['tadpole'] } } });
    return s;
  }, `/stuff/idea/species/_test/bullfrog-${id}`);
}

describe('metamorphosis — the same creature, another body', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    WorldClockApi._setNowProviderForTesting(() => 10_000_000_000);
  });
  afterEach(() => WorldClockApi._resetForTesting());

  it('⭐⭐ a tadpole aged across its change is the same object, breathes air, and its tail wound passed to its torso', () => {
    const c = makeStuff(() => new Creature());
    c.setSpecies(frogSpecies());
    c.setLifecycleState('alive');
    c.setAge(30);
    const id = c.stuffId;
    expect(c.getCommonNames()[0]).toBe('tadpole');
    expect(c.getBody()?.breathableMedia()).toEqual(['water']);
    expect(c.getBody()?.gaits()).toEqual(['swim']);
    c.getConditions(); // the first stamp
    expect(c.formStage).toBe('newborn');
    c.afflict({ kind: 'trauma', type: 'laceration', site: 'body.tail', severity: 1 } as Trauma);

    c.setAge(900); // the change
    c.getConditions(); // the reconcile that carries it over
    expect(c.stuffId).toBe(id);
    expect(c.formStage).toBe('adult');
    expect(c.getCommonNames()[0]).toBe('bullfrog');
    expect(c.getBody()?.breathableMedia()).toEqual(['air']);
    expect(c.getBody()?.gaits()).toEqual(['walk']);
    const wound = c.getConditions().find((x): x is Trauma => x.kind === 'trauma');
    expect(wound?.site).toBe('body.torso');
  });

  it('a stage with no plan of its own builds on the species\' plan', () => {
    const s = frogSpecies();
    expect(s.planFor('adult')).toBe(s.getBodyPlan());
    expect(s.planFor('newborn')).not.toBe(s.getBodyPlan());
  });
});
