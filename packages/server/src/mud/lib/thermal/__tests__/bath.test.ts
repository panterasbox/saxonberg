/**
 * ⭐ The immersion rung (silk W4): a solid IN a vessel's bulk is at the
 * bulk's temperature, not the room's — a bolt in a copper, a wheel in
 * brine, a fish in a keepnet. Before it, everything in a liquid read the
 * room's air, and boiling cloth was unrepresentable.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Good from '../../stuff/Good';
import Material from '../../material/Material';
import { ThermalMixin } from '../Thermal';
import { BulkableMixin } from '../../bulk/Bulkable';
import { ContainerMixin } from '../../spatial/Container';
import { ContainmentApi } from '../../../api/containment';
import { WorldClockApi } from '../../../api/worldclock';
import { Quantity } from '../../quantity';
import '../../../platform/idea/WorldClockRegistry';
import { makeStuff, makeStuffAtPath } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

class Pan extends ThermalMixin(ContainerMixin(BulkableMixin(Good))) {
  static _mixinName = 'BathTestPan';
}
class Lump extends ThermalMixin(Good) {
  static _mixinName = 'BathTestLump';
}

const BASE = 10_000_000;
let now = BASE;
let seq = 0;

function water(): Material {
  seq += 1;
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName('water');
    m.setDensity(Quantity.of(1000, 'kg/m³'));
    m.setSpecificHeat(Quantity.of(4186, 'J/(kg·K)'));
    m.setBoilingPoint(Quantity.of(373, 'K'));
    m.setLatentHeatOfVaporization(Quantity.of(2260000, 'J/kg'));
    return m;
  }, `/stuff/idea/material/_test/bath-water-${seq}`) as unknown as Material;
}

function pin(t: { lastAmbientK: number; stampedTemperatureK: number }, k: number): void {
  t.lastAmbientK = k;
  t.stampedTemperatureK = k;
}

function pan(litres: number, k: number): Pan {
  const p = makeStuff(() => new Pan());
  p.interiorBulk = true;
  p.setInteriorCapacity(Quantity.of(10, 'L'));
  if (litres > 0) {
    p.setBulkMaterial('interior', water());
    p.setBulkAmount('interior', Quantity.of(litres, 'L'));
  }
  pin(p as never, k);
  return p;
}

beforeEach(() => {
  installV1QuantityMarshallers();
  WorldClockApi._resetForTesting();
  now = BASE;
  WorldClockApi._setNowProviderForTesting(() => now);
  WorldClockApi.setScale(1000);
});
afterEach(() => WorldClockApi._resetForTesting());

describe('a solid in a bath reads the bath', () => {
  it('⭐ a lump in a pan of hot water drifts to the water, not the room', async () => {
    const p = pan(5, 360);
    const lump = makeStuff(() => new Lump());
    lump.setMass(Quantity.of(0.5, 'kg'));
    pin(lump as never, 293);
    ContainmentApi.move(lump, p);
    await lump.restamp();
    expect((lump as unknown as { lastAmbientK: number }).lastAmbientK).toBeCloseTo(360, 0);
    now = BASE + 6 * 3600;
    expect(lump.getTemperature().rawValue()).toBeGreaterThan(340);
  });

  it('an EMPTY pan is no bath: the lump reads what it read before', async () => {
    const p = pan(0, 360);
    const lump = makeStuff(() => new Lump());
    pin(lump as never, 293);
    ContainmentApi.move(lump, p);
    await lump.restamp();
    expect((lump as unknown as { lastAmbientK: number }).lastAmbientK).not.toBeCloseTo(360, 0);
  });
});
