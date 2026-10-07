/**
 * The Hearthworks demonstrators, end-to-end. The three fire scenes stood up
 * the way their seeds place them declaratively, but built directly here (the
 * faked-Mongo test has no clone pipeline — the substation precedent), so the
 * real content classes (`Firewood` / `Ingot` / `Forge`) and a sealed room
 * (the Hearthworks pack's `SealedCellar` shape — `ReservedMixin` over a
 * location, composed here locally because the class ships in the pack) drive
 * the shipped `FireApi` behaviours in a room-shaped scene:
 *
 *  - the woodshed — a lit log spreads to a dry neighbour, a wet one resists;
 *  - the smithy — a bellows-fed forge melts an iron ingot to a molten pool;
 *  - the sealed cellar — an enclosed fire fills the room with smoke and
 *    self-smothers (kills by CO, not flame).
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import CartesianZone from '../../../platform/idea/location/CartesianZone';
import CartesianLocation from '../../../lib/location/CartesianLocation';
import Good from '../../../lib/stuff/Good';
import Material from '../../../lib/material/Material';
import Firewood from '../../../platform/thing/Firewood';
import Ingot from '../../../platform/thing/Ingot';
import Forge from '../../../platform/thing/Forge';
import Floor from '../../../platform/thing/Floor';
import SingletonCartesianLocation from '../../../lib/location/SingletonCartesianLocation';
import { Reserve } from '../../../lib/reserve';
import { HasInteractiveMixin } from '../../../lib/connection/HasInteractive';
import type { HasInteractive } from '../../../lib/connection/HasInteractive';
import { FireApi } from '../../../api/fire';
import { BiomeApi } from '../../../api/biome';
import { ContainmentApi } from '../../../api/containment';
import { ConnectionManager } from '../../../../backend/ConnectionManager';
import { StuffApi } from '../../../api/stuff';
import { Quantity } from '../../../lib/quantity';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { Container } from '../../../lib/spatial/Container';
import type { Atmospheric } from '../../../lib/biome/Atmospheric';
import type { User } from '../../../lib/identity/User';
import { makeStuff, makeStuffAtPath } from '../../../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';

class TestOccupant extends HasInteractiveMixin(Good) {
  static _mixinName = 'TestOccupantHearth';
}

/** How much soot is in a scope's medium — the fire's incomplete output. */
function sootIn(scope: CartesianLocation): number {
  const hit = BiomeApi.resolveAtmosphereContentsFor(
    scope as unknown as Stuff & Container,
  ).find((c) => c.type === '/stuff/idea/material/gas/smoke');
  return hit?.amount ?? 0;
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
  }, `/stuff/idea/material/_test/hearth-oak-${seq}`) as unknown as Material;
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
  }, `/stuff/idea/material/_test/hearth-iron-${seq}`) as unknown as Material;
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

    lit.ignite();
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
    forge.ignite();
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

  it('the sealed cellar: an enclosed fire fills it, goes sooty, and smothers', async () => {
    const zone = makeStuff(() => new CartesianZone());
    // ⭐⭐ No `ReservedMixin`, no authored air budget. `SealedCellar` is a
    // plain `SingletonCartesianLocation` now: the room starves a fire
    // because it is a 27 m³ stone box with no openings, which is what the
    // `%` Reserve was standing in for. Four Terminus cellars authored the
    // same budget and silently dropped it (no `ReservedMixin` in their
    // chain) — they behave identically to this one now.
    class SealedCellar extends SingletonCartesianLocation {}
    const cellar = makeStuff(() => new SealedCellar());
    zone.addLocation(cellar, 2, 0, 0);
    expect(cellar.airChangesPerHour()).toBeCloseTo(0.1); // the leak, and nothing else

    // ⚠ A proper fire, not an ember. A single split log in a 27 m³ cellar
    // takes most of a day to spend the air, which is honest — and is why
    // the venue's lesson is a LIT HEARTH rather than a log on the floor.
    const fire = firewood(cellar, 25);
    await occupy(cellar);
    fire.ignite();

    let sawSoot = false;
    let ticks = 0;
    for (; ticks < 400; ticks++) {
      FireApi.onFireTick();
      if (sootIn(cellar) > 0) sawSoot = true;
      if (!fire.isBurning()) break;
    }
    expect(sawSoot).toBe(true); // ⭐ it went sooty BEFORE it went out
    expect(fire.isBurning()).toBe(false); // and then smothered itself
    // ⭐ and it never wrote the atmosphere tag doing any of it.
    expect((cellar as unknown as Atmospheric)._atmosphere).toBeNull();
  });
});
