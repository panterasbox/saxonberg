/**
 * ⭐ What fills a part (organism-biology D12): a THRUST through a sparse
 * part (a wing, a fin) delivers only `response.fill.sparse` of its
 * residual to tissue, a hollow one (a swim bladder) `response.fill.hollow`.
 * A solid part — every part of every person — takes the whole.
 */
import "../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ConditionApi } from '../../../../api/condition';
import { Creature } from '../../../../lib/creature/Creature';
import Species from '../../species/Species';
import BodyPlan from '../../species/BodyPlan';
import { StuffApi } from '../../../../api/stuff';
import { makeStuff, stampTemplatePathForTest } from '../../../../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import type { Trauma } from '../../Condition';
import { standMaterials, TEST_TISSUES } from '../../../../lib/material/__tests__/materials';
import { setFlatParts } from '../../../../lib/species/__tests__/flat-body';

let seq = 0;
const FLESH = '/stuff/idea/material/tissue/flesh';

function winged(): Creature {
  const id = seq++;
  const plan = makeStuff(() => new BodyPlan());
  stampTemplatePathForTest(plan, `/stuff/idea/species/BodyPlan/_test-winged-${id}`);
  setFlatParts(plan, [
    { key: 'body.torso', parent: null, tissues: [{ tissuePath: FLESH, share: 0.8 }] },
    { key: 'body.wing.left', parent: 'body.torso', fill: 'sparse', tissues: [{ tissuePath: FLESH, share: 0.1 }] },
    { key: 'body.wing.right', parent: 'body.torso', tissues: [{ tissuePath: FLESH, share: 0.1 }] },
  ]);
  const species = makeStuff(() => new Species());
  species.setBodyPlan(plan);
  stampTemplatePathForTest(species, `/stuff/idea/species/test/winged-${id}`);
  const c = makeStuff(() => new Creature());
  c.setSpecies(species);
  return c;
}

const severity = (c: Creature, site: string): number =>
  (c.getConditions().find((x) => x.kind === 'trauma' && (x as Trauma).site === site) as Trauma | undefined)?.severity ?? 0;

describe('fill — a thrust through a wing mostly finds air', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    standMaterials(TEST_TISSUES);
  });
  afterEach(() => StuffApi.clearAll());

  it('⭐ the same thrust wounds a sparse wing less than a solid one', () => {
    const c = winged();
    ConditionApi.inflict(c, { mechanism: 'point', site: 'body.wing.left', energy: 3 });
    ConditionApi.inflict(c, { mechanism: 'point', site: 'body.wing.right', energy: 3 });
    expect(severity(c, 'body.wing.left')).toBeLessThan(severity(c, 'body.wing.right'));
  });

  it('…and a cut is not a thrust: fill reads only `point`', () => {
    const c = winged();
    ConditionApi.inflict(c, { mechanism: 'edge', site: 'body.wing.left', energy: 3 });
    ConditionApi.inflict(c, { mechanism: 'edge', site: 'body.wing.right', energy: 3 });
    expect(severity(c, 'body.wing.left')).toBeCloseTo(severity(c, 'body.wing.right'), 9);
  });
});
