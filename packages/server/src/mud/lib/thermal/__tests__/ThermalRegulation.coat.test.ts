/**
 * ⭐ A body's own coat insulates (organism-biology D3): counted beside what
 * it wears, by the garment's law (`thickness / k_eff / R_CLO`), the void
 * filled by the BODY's wetness. A coat tied to a tap is as deep as the
 * fleece has grown — shear her and it is worth nothing. Bare skin is 0.
 */
import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ProducingMixin } from '../../husbandry/Producing';
import { Creature } from '../../creature/Creature';
import Species from '../../../platform/idea/species/Species';
import BodyPlan from '../../../platform/idea/species/BodyPlan';
import HideHorn from '../../../platform/idea/material/HideHorn';
import { StuffApi } from '../../../api/stuff';
import { Quantity } from '../../quantity';
import { makeStuff, makeStuffAtPath } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import { standMaterials, TEST_TISSUES } from '../../material/__tests__/materials';
import { setFlatParts, setFlatTaps } from '../../species/__tests__/flat-body';
import type { Integument } from '../../../platform/idea/species/BodyPlan';

const FLESH = '/stuff/idea/material/tissue/flesh';
const FUR = '/stuff/idea/material/tissue/_test-fur';

class TestBeast extends ProducingMixin(Creature) {}

let seq = 0;
function beast(coat: Integument | null, tap = false): TestBeast {
  const id = seq++;
  const plan = makeStuffAtPath(() => new BodyPlan(), `/stuff/idea/species/BodyPlan/_test-coat-${id}`);
  setFlatParts(plan, [
    { key: 'body.torso', parent: null, tissues: [{ tissuePath: FLESH, share: 0.9 }], ...(coat ? { integument: coat } : {}) },
    { key: 'body.head', parent: 'body.torso', tissues: [{ tissuePath: FLESH, share: 0.1 }] },
  ]);
  const species = makeStuffAtPath(() => {
    const s = new Species();
    s._bodyPlanPath = plan.getTemplatePath();
    return s;
  }, `/stuff/idea/species/_test/coated-${id}`);
  if (tap) setFlatTaps(species, [{ key: 'wool', yieldRow: '/x/fleece', perGameDay: 0.008, behaviour: 'continuous', windowDays: 0, capUnits: 4 }]);
  const b = makeStuff(() => new TestBeast());
  b._speciesPath = species.getTemplatePath();
  b.setLifecycleState('alive');
  return b;
}

const clo = (b: TestBeast): number => (b as unknown as { coatInsulation(): number }).coatInsulation();

describe('the coat', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    standMaterials(TEST_TISSUES);
    makeStuffAtPath(() => {
      const m = new HideHorn();
      m.setThermalConductivity(Quantity.of(0.04, 'W/(m·K)'));
      m.setWaterAbsorptionCapacity(Quantity.of(30, '%'));
      return m;
    }, FUR);
  });
  afterEach(() => StuffApi.clearAll());

  it('bare skin is worth nothing (no person moves)', () => {
    expect(clo(beast(null))).toBe(0);
  });

  it('⭐ a fur coat is worth clo, by its depth and its loft', () => {
    const c = clo(beast({ coat: { material: FUR, depthM: 0.02, loft: 0.85 } }));
    expect(c).toBeGreaterThan(0.5);
  });

  it('⭐ a wet coat is worth less than a dry one', () => {
    const dry = beast({ coat: { material: FUR, depthM: 0.02, loft: 0.85 } });
    const wet = beast({ coat: { material: FUR, depthM: 0.02, loft: 0.85 } });
    wet.wet(1);
    expect(clo(wet)).toBeLessThan(clo(dry));
  });

  it('⭐⭐ a coat tied to the fleece: shorn she has none, grown she has it all', () => {
    const shorn = beast({ coat: { material: FUR, depthM: 0.06, loft: 0.9, tap: 'wool' } }, true);
    const grown = beast({ coat: { material: FUR, depthM: 0.06, loft: 0.9, tap: 'wool' } }, true);
    grown.tapState = { wool: { standing: 4, lastTaken: 0, driedOff: false } as never };
    expect(clo(shorn)).toBe(0);
    expect(clo(grown)).toBeGreaterThan(1);
  });
});
