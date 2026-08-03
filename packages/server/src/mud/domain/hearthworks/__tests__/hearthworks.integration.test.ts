/**
 * The Hearthworks demonstrators, end-to-end. The three fire scenes stood up
 * the way their seeds place them declaratively, but built directly here (the
 * faked-Mongo test has no clone pipeline — the substation precedent), so the
 * real content classes (`Firewood` / `Ingot` / `Forge` / `SealedCellar`) drive
 * the shipped `FireApi` behaviours in a room-shaped scene:
 *
 *  - the woodshed — a lit log spreads to a dry neighbour, a wet one resists;
 *  - the smithy — a bellows-fed forge melts an iron ingot to a molten pool;
 *  - the sealed cellar — an enclosed fire fills the room with smoke and
 *    self-smothers (kills by CO, not flame).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import CartesianZone from '../../../obj/location/CartesianZone';
import CartesianLocation from '../../../lib/location/CartesianLocation';
import Thing from '../../../lib/stuff/Thing';
import Material from '../../../lib/material/Material';
import Firewood from '../../../obj/Firewood';
import Ingot from '../../../obj/Ingot';
import Forge from '../../../obj/Forge';
import Floor from '../../../obj/Floor';
import SealedCellar from '../SealedCellar';
import { Reserve } from '../../../lib/reserve';
import { HasInteractiveMixin } from '../../../lib/connection/HasInteractive';
import type { HasInteractive } from '../../../lib/connection/HasInteractive';
import { FireApi } from '../../../api/fire';
import { ContainmentApi } from '../../../api/containment';
import { ConnectionManager } from '../../../../backend/ConnectionManager';
import { StuffApi } from '../../../api/stuff';
import { Quantity } from '../../../lib/quantity';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { Atmospheric } from '../../../lib/biome/Atmospheric';
import type { User } from '../../../lib/identity/User';
import { makeStuff, makeStuffAtPath } from '../../../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';

class TestOccupant extends HasInteractiveMixin(Thing) {
  static _mixinName = 'TestOccupantHearth';
}

let seq = 0;
function oak(): Material {
  seq += 1;
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName('oak');
    m.setDensity(Quantity.of(750, 'kg/m³'));
    m.setSpecificHeat(Quantity.of(2000, 'J/(kg·K)'));
    m.setThermalConductivity(Quantity.of(0.17, 'W/(m·K)'));
    m.setAutoignitionTemperature(Quantity.of(570, 'K'));
    m.setHeatOfCombustion(Quantity.of(16, 'MJ/kg'));
    m.setWaterAbsorptionCapacity(Quantity.of(28, '%'));
    return m;
  }, `/obj/material/_test/hearth-oak-${seq}`) as unknown as Material;
}
function iron(): Material {
  seq += 1;
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName('iron');
    m.setDensity(Quantity.of(7874, 'kg/m³'));
    m.setSpecificHeat(Quantity.of(449, 'J/(kg·K)'));
    m.setMeltingPoint(Quantity.of(1811, 'K'));
    m.setLatentHeatOfFusion(Quantity.of(247000, 'J/kg'));
    return m;
  }, `/obj/material/_test/hearth-iron-${seq}`) as unknown as Material;
}

function firewood(where: CartesianLocation, massKg: number, wet = false): Firewood {
  const w = makeStuff(() => {
    const f = new Firewood();
    f.setMass(Quantity.of(massKg, 'kg'));
    f.setMaterial(oak());
    f.setReserve(
      new Reserve('fuel', Quantity.of(100, '%'), Quantity.of(100, '%'), 'combustion', null),
    );
    return f;
  });
  // move first, then stamp temperature so the container restamp doesn't win.
  return placeThermal(w, where, wet);
}
function placeThermal(w: Firewood, where: CartesianLocation, wet: boolean): Firewood {
  ContainmentApi.move(w, where);
  w.setStampedTemperatureK(295);
  w.setLastAmbientK(295);
  if (wet) w.wet(1);
  return w;
}

async function occupy(room: CartesianLocation): Promise<void> {
  const n = seq++;
  const occ = makeStuff(() => new TestOccupant());
  await ContainmentApi.move(occ, room);
  const user = { _id: `hearth-occ-${n}` } as unknown as User;
  const interactive = await ConnectionManager.get().createInteractive(
    `hearth-sock-${n}`,
    `hearth-sess-${n}`,
    user,
  );
  interactive.setHolder(occ as unknown as HasInteractive & Stuff);
}

describe('The Hearthworks — the fire demonstrators', () => {
  beforeEach(() => installV1QuantityMarshallers());
  afterEach(() => StuffApi.clearAll());

  it('the woodshed: a lit log spreads to a dry neighbour, a wet one resists', async () => {
    const zone = makeStuff(() => new CartesianZone());
    const shed = makeStuff(() => new CartesianLocation());
    zone.addLocation(shed, 0, 0, 0);
    const lit = firewood(shed, 1);
    const dry = firewood(shed, 1);
    const wet = firewood(shed, 1, true);
    await occupy(shed);

    FireApi.ignite(lit);
    FireApi.onFireTick();
    expect(dry.isBurning()).toBe(true); // caught
    expect(wet.isBurning()).toBe(false); // resisted — too wet
  });

  it('the smithy: a bellows-fed forge melts an iron ingot to a molten pool', async () => {
    const zone = makeStuff(() => new CartesianZone());
    const smithy = makeStuff(() => new CartesianLocation());
    zone.addLocation(smithy, 1, 0, 0);
    const floor = makeStuff(() => new Floor());
    floor.surfaceBulk = true;
    floor.setSurfaceCapacity(Quantity.of(200, 'L'));
    ContainmentApi.move(floor, smithy);
    const forge = makeStuff(() => {
      const f = new Forge();
      f.setBurnTemperatureK(1300);
      f.setBellowsMultiplier(1.6);
      f.setReserve(
        new Reserve('fuel', Quantity.of(100, '%'), Quantity.of(100, '%'), 'combustion', null),
      );
      f._setLit(false);
      return f;
    });
    ContainmentApi.move(forge, smithy);
    const ingot = makeStuff(() => new Ingot());
    ingot.setMass(Quantity.of(0.2, 'kg'));
    ingot.setMaterial(iron());
    ContainmentApi.move(ingot, smithy);
    ingot.setStampedTemperatureK(295);
    ingot.setLastAmbientK(295);
    await occupy(smithy);

    // Light the forge and work the bellows → smelting heat.
    FireApi.ignite(forge);
    forge.setBellowsActive(true);
    let melted = false;
    for (let i = 0; i < 60; i++) {
      FireApi.onFireTick();
      if (ingot.isDestroyed()) {
        melted = true;
        break;
      }
    }
    expect(melted).toBe(true);
    expect(floor.getBulkAmount('surface').rawValue()).toBeGreaterThan(0);
    expect(floor.getBulkMaterial('surface')?.getName()).toBe('iron');
  });

  it('the sealed cellar: an enclosed fire smokes and self-smothers', async () => {
    const zone = makeStuff(() => new CartesianZone());
    const cellar = makeStuff(() => new SealedCellar());
    zone.addLocation(cellar, 2, 0, 0);
    cellar.setReserve(
      new Reserve('air', Quantity.of(100, '%'), Quantity.of(100, '%'), 'atmosphere', null),
    );
    const fire = firewood(cellar, 1);
    await occupy(cellar);
    FireApi.ignite(fire);

    // Starve → incomplete → smoke; keep burning → self-smother.
    let sawSmoke = false;
    for (let i = 0; i < 15; i++) {
      FireApi.onFireTick();
      if ((cellar as unknown as Atmospheric)._atmosphere === 'smoke') sawSmoke = true;
      if (!fire.isBurning()) break;
    }
    expect(sawSmoke).toBe(true); // it filled with smoke + CO
    expect(fire.isBurning()).toBe(false); // and smothered itself
  });
});
