/**
 * The furnace family — a Combustible-fuelled sustained heat source holding a
 * fuel-and-air-driven temperature: charcoal hotter than wood, a bellows hotter
 * still, smelting heat (iron's melting point) only with the bellows. A lit
 * forge heats the Meltables in its scope (`heatContents`) — the metal-melting
 * demo. Campfire byte-compat is guarded by its own suite.
 */

import "../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Thing from '../../lib/stuff/Thing';
import Location from '../../lib/stuff/Location';
import Material from '../../lib/material/Material';
import Floor from '../thing/Floor';
import Forge from '../thing/Forge';
import { ThermalMixin } from '../../lib/thermal/Thermal';
import { MeltableMixin } from '../../lib/thermal/Meltable';
import { FireApi } from '../../api/fire';
import { MixinApi } from '../../api/mixin';
import { ContainmentApi } from '../../api/containment';
import { StuffApi } from '../../api/stuff';
import { Reserve } from '../../lib/reserve';
import { Quantity } from '../../lib/quantity';
import { makeStuff, makeStuffAtPath } from '../../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../lib/persistence/__tests__/quantity-marshaller-test-helpers';

class Ingot extends MeltableMixin(ThermalMixin(Thing)) {
  static _mixinName = 'ForgeIngotTest';
}
class TestRoom extends Location {}

let seq = 0;
function ironMaterial(): Material {
  seq += 1;
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName('iron');
    m.setDensity(Quantity.of(7874, 'kg/m³'));
    m.setSpecificHeat(Quantity.of(449, 'J/(kg·K)'));
    m.setMeltingPoint(Quantity.of(1811, 'K'));
    m.setLatentHeatOfFusion(Quantity.of(247000, 'J/kg'));
    return m;
  }, `/stuff/idea/material/_test/forge-iron-${seq}`) as unknown as Material;
}

function forge(burnTempK: number, bellowsMult = 1): Forge {
  return makeStuff(() => {
    const f = new Forge();
    f.setBurnTemperatureK(burnTempK);
    f.setBellowsMultiplier(bellowsMult);
    f.setReserve(
      new Reserve('fuel', Quantity.of(100, '%'), Quantity.of(100, '%'), 'combustion', null),
    );
    return f;
  });
}

describe('the furnace family — held temperature', () => {
  beforeEach(() => installV1QuantityMarshallers());
  afterEach(() => StuffApi.clearAll());

  it('a lit, fuelled furnace pins its held temperature', () => {
    const f = forge(1300);
    expect(MixinApi.isFurnace(f)).toBe(true);
    expect(f.isLit()).toBe(true); // constructed lit by default (the Campfire seed)
    expect(f.getTemperature().rawValue()).toBe(1300);
  });

  it('charcoal (a hotter fuel) burns hotter than wood', () => {
    const charcoal = forge(1300);
    const wood = forge(900);
    expect(charcoal.getTemperature().rawValue()).toBeGreaterThan(
      wood.getTemperature().rawValue(),
    );
  });

  it('a worked bellows runs hotter than an idle one', () => {
    const f = forge(1300, 1.6);
    expect(f.getHeldTemperatureK()).toBe(1300); // bellows idle
    f.setBellowsActive(true);
    expect(f.getHeldTemperatureK()).toBeCloseTo(2080, 0); // 1300 × 1.6
    expect(f.getTemperature().rawValue()).toBeCloseTo(2080, 0);
  });

  it('an unlit furnace is not pinned (reads its passive temperature)', () => {
    const f = forge(1300);
    f.setStampedTemperatureK(295);
    f.setLastAmbientK(295);
    FireApi.douse(f); // put it out
    expect(f.isLit()).toBe(false);
    expect(f.getTemperature().rawValue()).toBe(295);
  });
});

describe('the furnace family — the forge melts a metal', () => {
  beforeEach(() => installV1QuantityMarshallers());
  afterEach(() => StuffApi.clearAll());

  function setup(bellows: boolean): { room: TestRoom; ingot: Ingot; f: Forge } {
    const room = makeStuff(() => new TestRoom());
    const floor = makeStuff(() => new Floor());
    floor.surfaceBulk = true;
    floor.setSurfaceCapacity(Quantity.of(100, 'L'));
    ContainmentApi.move(floor, room);

    const f = forge(1300, 1.6);
    f.setBellowsActive(bellows);
    ContainmentApi.move(f, room);

    const ingot = makeStuff(() => new Ingot());
    ingot.setMass(Quantity.of(0.1, 'kg'));
    ingot.setMaterial(ironMaterial());
    ContainmentApi.move(ingot, room);
    ingot.setStampedTemperatureK(295);
    ingot.setLastAmbientK(295);
    return { room, ingot, f };
  }

  it('reaches iron\'s melting point WITH the bellows → the ingot melts', () => {
    const { ingot, f } = setup(true); // 1300 × 1.6 = 2080 K > 1811 K
    let melted = false;
    for (let i = 0; i < 40; i++) {
      f.heatContents();
      if (ingot.isDestroyed()) {
        melted = true;
        break;
      }
    }
    expect(melted).toBe(true);
  });

  it('does NOT reach it without the bellows → the ingot stays solid', () => {
    const { ingot, f } = setup(false); // 1300 K < 1811 K — never melts
    for (let i = 0; i < 40; i++) f.heatContents();
    expect(ingot.isDestroyed()).toBe(false);
    expect(ingot.getMeltPhase()).toBe('solid');
    // It heated to the forge's temperature but no further.
    expect(ingot.getTemperature().rawValue()).toBeLessThan(1811);
  });
});
