/**
 * ⭐ A wall that conducts stands a thermal shock a crock does not (cordage
 * D29): the tolerance scales by thermal conductivity over a fired clay's.
 * A cast-iron pot stands a boil; a stoneware crock still cracks.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, afterEach } from 'vitest';
import Good from '../../stuff/Good';
import Material from '../Material';
import { DurableMixin } from '../Durable';
import { Quantity } from '../../quantity';
import { StuffApi } from '../../../api/stuff';
import { makeStuff, makeStuffAtPath } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

class Pot extends DurableMixin(Good) {
  static _mixinName = 'TestConductivityPot';
}

function brittle(name: string, alpha: number, k: number): Material {
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName(name);
    m.setTags(['brittle']);
    m.setThermalExpansion(alpha);
    m.setThermalConductivity(Quantity.of(k, 'W/(m·K)'));
    return m;
  }, `/test/idea/material/${name}`) as unknown as Material;
}

function pot(m: Material): Pot {
  return makeStuff(() => {
    const p = new Pot();
    p.setMass(Quantity.of(3, 'kg'));
    p.setMaterial(m);
    return p;
  });
}

afterEach(() => StuffApi.clearAll());

describe('thermal shock and conductivity (cordage D29)', () => {
  it('⭐ cast iron stands a boil; stoneware does not', () => {
    installV1QuantityMarshallers();
    const iron = pot(brittle('shock-cast-iron', 1.1e-5, 55));
    const crock = pot(brittle('shock-stoneware', 6e-6, 1.5));
    expect(crock.thermalShockToleranceK()).toBeCloseTo(50, 0);
    expect(iron.thermalShockToleranceK()).toBeGreaterThan(900);
    // Cold lye into a pot at the boil: an 80 K step.
    iron.sufferThermalShock(80, 0);
    crock.sufferThermalShock(80, 0);
    expect(iron.getFlaws().length).toBe(0);
    expect(crock.getFlaws().length).toBeGreaterThan(0);
  });
});
