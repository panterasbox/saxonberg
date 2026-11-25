/**
 * ⭐ The body's own outside is the innermost covering layer
 * (organism-biology D3): a hide resists as `hide`; bare skin authors no form
 * and answers nothing, so a person's numbers do not move.
 */
import "../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ConditionApi } from '../../../../api/condition';
import { Creature } from '../../../../lib/creature/Creature';
import Species from '../../species/Species';
import BodyPlan from '../../species/BodyPlan';
import Hide from '../../material/Hide';
import { StuffApi } from '../../../../api/stuff';
import { Quantity } from '../../../../lib/quantity';
import { makeStuff, makeStuffAtPath, stampTemplatePathForTest } from '../../../../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import type { Trauma } from '../../Condition';
import type { Integument } from '../../species/BodyPlan';
import { standMaterials, TEST_TISSUES } from '../../../../lib/material/__tests__/materials';
import { setFlatParts } from '../../../../lib/species/__tests__/flat-body';

const FLESH = '/stuff/idea/material/tissue/flesh';
const HIDE = '/stuff/idea/material/organic/_test-rawhide';
const SKIN = '/stuff/idea/material/tissue/_test-skin';
let seq = 0;

function body(outside: Integument): Creature {
  const id = seq++;
  const plan = makeStuff(() => new BodyPlan());
  stampTemplatePathForTest(plan, `/stuff/idea/species/BodyPlan/_test-outside-${id}`);
  setFlatParts(plan, [{ key: 'body.torso', parent: null, tissues: [{ tissuePath: FLESH, share: 1 }], integument: outside }]);
  const species = makeStuff(() => new Species());
  species.setBodyPlan(plan);
  stampTemplatePathForTest(species, `/stuff/idea/species/test/outside-${id}`);
  const c = makeStuff(() => new Creature());
  c.setSpecies(species);
  return c;
}

const sev = (c: Creature): number =>
  (c.getConditions().find((x) => x.kind === 'trauma') as Trauma | undefined)?.severity ?? 0;

describe('the integument as armor', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    standMaterials(TEST_TISSUES);
    for (const path of [HIDE, SKIN]) {
      makeStuffAtPath(() => {
        const m = new Hide();
        m.setHardness(Quantity.of(5, 'MPa'));
        m.setToughness(Quantity.of(4, 'MJ/m³'));
        return m;
      }, path);
    }
  });
  afterEach(() => StuffApi.clearAll());

  it('⭐ a hide turns some of a cut that bare skin does not', () => {
    const hided = body({ skin: { material: HIDE, form: 'hide' } });
    const bare = body({ skin: { material: SKIN } });
    ConditionApi.inflict(hided, { mechanism: 'edge', site: 'body.torso', energy: 3 });
    ConditionApi.inflict(bare, { mechanism: 'edge', site: 'body.torso', energy: 3 });
    expect(sev(hided)).toBeLessThan(sev(bare));
  });

  it('bare skin answers nothing: the same as no outside at all', () => {
    const bare = body({ skin: { material: SKIN } });
    const none = body({});
    ConditionApi.inflict(bare, { mechanism: 'edge', site: 'body.torso', energy: 3 });
    ConditionApi.inflict(none, { mechanism: 'edge', site: 'body.torso', energy: 3 });
    expect(sev(bare)).toBeCloseTo(sev(none), 9);
  });
});
