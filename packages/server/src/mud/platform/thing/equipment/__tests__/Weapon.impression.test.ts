/**
 * ⭐ A weapon's shape is LONG (B104): its impression carries its length, so
 * a cast of it is judged by Chvorinov as a blade and not as a cube. (The
 * mould used to duck-read `getLength()` as a number — it is a Quantity —
 * so every sword read as a cube.)
 */
import '../../../../../test-bootstrap';
import { describe, it, expect } from 'vitest';
import { makeStuff, makeStuffAtPath, stampTemplatePathForTest } from '../../../../lib/security/__tests__/test-setup';
import Material from '../../../idea/material/Material';
import { installV1QuantityMarshallers } from '../../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import { Quantity } from '../../../../lib/quantity';
import Weapon from '../Weapon';

describe('a weapon leaves a long impression', () => {
  it('carries its length; an unmeasured one reads as compact', () => {
    installV1QuantityMarshallers();
    const sword = makeStuff(() => new Weapon());
    stampTemplatePathForTest(sword, '/stuff/thing/_weapon/arming-sword');
    const steel = makeStuffAtPath(() => {
      const m = new Material();
      m.setName('steel');
      m.setDensity(Quantity.of(7850, 'kg/m³'));
      return m;
    }, '/stuff/idea/material/_weapon/steel') as unknown as Material;
    sword.setMaterial(steel);
    sword.setMass(Quantity.of(1, 'kg'));
    expect(sword.leaveImpression(0)).not.toBeNull();
    expect(sword.leaveImpression(0)?.lengthM ?? 0).toBe(0);
    sword.setLength(Quantity.of(0.9, 'm'));
    expect(sword.leaveImpression(0)?.lengthM).toBeCloseTo(0.9, 9);
  });
});
