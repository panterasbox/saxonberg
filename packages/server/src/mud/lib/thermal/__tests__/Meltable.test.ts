/**
 * Phase change — the bidirectional transition engine (`ThermalApi.reconcile
 * Phase`). A Meltable solid past its melting point holds temperature at a
 * latent-heat plateau, then melts to a molten pool in the scope's Floor; a
 * liquid-holding vessel boils to gas above its boiling point and solidifies to
 * a cast below its melting point. Ice → water → steam falls out of one water
 * material. Driven against real `Material` numbers.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Thing from '../../stuff/Thing';
import Location from '../../stuff/Location';
import Material from '../../material/Material';
import Floor from '../../../obj/Floor';
import Flask from '../../../obj/Flask';
import Casting from '../../../obj/Casting';
import { ThermalMixin } from '../Thermal';
import { MeltableMixin } from '../Meltable';
import { ThermalApi } from '../../../api/thermal';
import { MixinApi } from '../../../api/mixin';
import { ContainmentApi } from '../../../api/containment';
import { StuffApi } from '../../../api/stuff';
import { Quantity } from '../../quantity';
import type { Stuff } from '../../stuff/Stuff';
import { makeStuff, makeStuffAtPath } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

class Ingot extends MeltableMixin(ThermalMixin(Thing)) {
  static _mixinName = 'IngotTest';
}
class TestRoom extends Location {}

const flush = () => new Promise((r) => setTimeout(r, 0));

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
  }, `/obj/material/_test/melt-iron-${seq}`) as unknown as Material;
}
function waterMaterial(): Material {
  seq += 1;
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName('water');
    m.setDensity(Quantity.of(1000, 'kg/m³'));
    m.setSpecificHeat(Quantity.of(4186, 'J/(kg·K)'));
    m.setMeltingPoint(Quantity.of(273, 'K'));
    m.setLatentHeatOfFusion(Quantity.of(334000, 'J/kg'));
    m.setBoilingPoint(Quantity.of(373, 'K'));
    m.setLatentHeatOfVaporization(Quantity.of(2260000, 'J/kg'));
    return m;
  }, `/obj/material/_test/melt-water-${seq}`) as unknown as Material;
}

function floorIn(room: TestRoom): Floor {
  const f = makeStuff(() => new Floor());
  f.surfaceBulk = true;
  f.setSurfaceCapacity(Quantity.of(100, 'L'));
  ContainmentApi.move(f, room);
  return f;
}

describe('phase change — melt (solid → molten pool)', () => {
  beforeEach(() => installV1QuantityMarshallers());
  afterEach(() => StuffApi.clearAll());

  it('holds a latent-heat plateau, then flows to a molten pool in the Floor', () => {
    const room = makeStuff(() => new TestRoom());
    const floor = floorIn(room);
    const iron = ironMaterial();
    const ingot = makeStuff(() => new Ingot());
    ingot.setMass(Quantity.of(0.1, 'kg')); // latent to melt = 24700 J
    ingot.setMaterial(iron);
    ContainmentApi.move(ingot, room);
    ingot.setStampedTemperatureK(1811); // right at the melting point
    ingot.setLastAmbientK(1811);

    // Deposit heat in chunks; each reconcile clamps back to the plateau.
    expect(MixinApi.isMeltable(ingot)).toBe(true);
    let melted = false;
    for (let i = 0; i < 10; i++) {
      ThermalApi.depositHeat(ingot, 6000); // ΔT well above the melting point
      ThermalApi.reconcilePhase(ingot);
      if (ingot.isDestroyed()) {
        melted = true;
        break;
      }
      // While still solid, the temperature is clamped at the melting point.
      expect(ingot.getTemperature().rawValue()).toBeCloseTo(1811, 0);
    }
    expect(melted).toBe(true);
    // The molten iron pooled on the Floor.
    expect(floor.getBulkAmount('surface').rawValue()).toBeGreaterThan(0);
    expect(floor.getBulkMaterial('surface')?.getName()).toBe('iron');
  });

  it('a solid below its melting point does not melt', () => {
    const room = makeStuff(() => new TestRoom());
    floorIn(room);
    const ingot = makeStuff(() => new Ingot());
    ingot.setMass(Quantity.of(0.1, 'kg'));
    ingot.setMaterial(ironMaterial());
    ContainmentApi.move(ingot, room);
    ingot.setStampedTemperatureK(1000); // well below 1811
    ingot.setLastAmbientK(1000);
    ThermalApi.reconcilePhase(ingot);
    expect(ingot.isDestroyed()).toBe(false);
    expect(ingot.getMeltPhase()).toBe('solid');
  });
});

describe('phase change — boil + freeze (ice → water → steam)', () => {
  beforeEach(() => installV1QuantityMarshallers());
  afterEach(() => StuffApi.clearAll());

  function waterFlask(tempK: number): { flask: Flask; room: TestRoom } {
    const room = makeStuff(() => new TestRoom());
    const flask = makeStuff(() => new Flask());
    flask.interiorBulk = true;
    flask.setInteriorCapacity(Quantity.of(2, 'L'));
    flask.setBulkMaterial('interior', waterMaterial());
    flask.setBulkAmount('interior', Quantity.of(1, 'L'));
    ContainmentApi.move(flask, room);
    flask.setStampedTemperatureK(tempK);
    flask.setLastAmbientK(tempK);
    return { flask, room };
  }

  it('boils a liquid to gas above its boiling point (steam)', () => {
    const { flask } = waterFlask(400); // > 373 K
    ThermalApi.reconcilePhase(flask);
    expect(flask.getBulkAmount('interior').rawValue()).toBe(0); // flashed to steam
  });

  it('solidifies a liquid to a cast below its melting point', async () => {
    // The freeze clones the `/obj/Casting` template; the faked-Mongo test has
    // no clone pipeline, so stub `StuffApi.clone` to mint a fresh Casting (the
    // banking-suite precedent).
    const cloneSpy = vi
      .spyOn(StuffApi, 'clone')
      .mockImplementation((async () =>
        makeStuff(() => new Casting())) as unknown as typeof StuffApi.clone);
    try {
      const { flask, room } = waterFlask(260); // < 273 K → ice
      ThermalApi.reconcilePhase(flask);
      expect(flask.getBulkAmount('interior').rawValue()).toBe(0);
      await flush();
      await flush();
      expect(cloneSpy).toHaveBeenCalledWith('/obj/Casting');
      // A cast solid of the frozen water dropped into the scope.
      const cast = room
        .getContents()
        .map((c) => c as unknown as Stuff)
        .find((s) => !s.isDestroyed() && s !== (flask as unknown as Stuff) &&
          MixinApi.isTangible(s) && s.getMaterial()?.getName() === 'water');
      expect(cast).toBeDefined();
    } finally {
      cloneSpy.mockRestore();
    }
  });

  it('a liquid between its melting and boiling points is stable', () => {
    const { flask } = waterFlask(300); // room-ish — neither boils nor freezes
    ThermalApi.reconcilePhase(flask);
    expect(flask.getBulkAmount('interior').rawValue()).toBe(1);
  });
});
