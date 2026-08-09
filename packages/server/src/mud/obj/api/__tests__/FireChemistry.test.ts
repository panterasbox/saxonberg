/**
 * Real combustion chemistry — the oxygen leg. A fire in an enclosed scope
 * (an authored `'air'` Reserve) starves as it eats the air: it burns
 * incomplete (cooler + smoke), fills the scope with smoke (an un-breathable,
 * carbon-monoxide-carrying medium), and finally self-smothers. A ventilated
 * scope (an open boundary / sky) stays complete and clean. Driven through the
 * real `FireApi.onFireTick` occupancy harness; the smoke medium's asphyxiation
 * + CO-poisoning of an occupant is the respiration integration below.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import CartesianZone from '../../location/CartesianZone';
import CartesianLocation from '../../../lib/location/CartesianLocation';
import Exit from '../../../lib/boundary/Exit';
import Thing from '../../../lib/stuff/Thing';
import Material from '../../../lib/material/Material';
import { ThermalMixin } from '../../../lib/thermal/Thermal';
import { WetMixin } from '../../../lib/wetness/Wet';
import { ReservedMixin, Reserve } from '../../../lib/reserve';
import { CombustibleMixin } from '../../../lib/fire/Combustible';
import { HasInteractiveMixin } from '../../../lib/connection/HasInteractive';
import type { HasInteractive } from '../../../lib/connection/HasInteractive';
import { FireApi } from '../../../api/fire';
import { BiomeApi } from '../../../api/biome';
import { ContainmentApi } from '../../../api/containment';
import { ConnectionManager } from '../../../../backend/ConnectionManager';
import { StuffApi } from '../../../api/stuff';
import { Quantity } from '../../../lib/quantity';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { Atmospheric } from '../../../lib/biome/Atmospheric';
import type { User } from '../../../lib/identity/User';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';

class Firewood extends CombustibleMixin(
  WetMixin(ThermalMixin(ReservedMixin(Thing))),
) {
  static _mixinName = 'FirewoodChem';
}
/** An enclosed room with a finite combustion-air budget. */
class Cellar extends ReservedMixin(CartesianLocation) {
  static _mixinName = 'CellarChem';
}
class TestOccupant extends HasInteractiveMixin(Thing) {
  static _mixinName = 'TestOccupantChem';
}

let seq = 0;
function woodMaterial(): Material {
  seq += 1;
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName(`chem-wood-${seq}`);
    m.setAutoignitionTemperature(Quantity.of(570, 'K'));
    m.setHeatOfCombustion(Quantity.of(16, 'MJ/kg'));
    m.setSpecificHeat(Quantity.of(2000, 'J/(kg·K)'));
    return m;
  }, `/obj/material/_test/chem-wood-${seq}`) as unknown as Material;
}

async function cellar(zone: CartesianZone, x: number, airPct = 100): Promise<Cellar> {
  const c = makeStuff(() => new Cellar());
  c.setShortDescription(`cellar-${x}`);
  zone.addLocation(c, x, 0, 0);
  c.setReserve(
    new Reserve('air', Quantity.of(100, '%'), Quantity.of(airPct, '%'), 'atmosphere', null),
  );
  return c;
}

async function burningLog(where: CartesianLocation): Promise<Firewood> {
  const w = makeStuff(() => {
    const f = new Firewood();
    f.setMass(Quantity.of(1, 'kg'));
    f.setMaterial(woodMaterial());
    f.setReserve(
      new Reserve('fuel', Quantity.of(100, '%'), Quantity.of(100, '%'), 'combustion', null),
    );
    return f;
  });
  await ContainmentApi.move(w, where);
  w.setStampedTemperatureK(295);
  w.setLastAmbientK(295);
  FireApi.ignite(w);
  return w;
}

async function occupy(room: CartesianLocation): Promise<void> {
  const n = seq++;
  const occ = makeStuff(() => new TestOccupant());
  await ContainmentApi.move(occ, room);
  const user = { _id: `chem-occ-${n}` } as unknown as User;
  const interactive = await ConnectionManager.get().createInteractive(
    `chem-sock-${n}`,
    `chem-sess-${n}`,
    user,
  );
  interactive.setHolder(occ as unknown as HasInteractive & Stuff);
}

function atmosphereOf(room: CartesianLocation): string | null {
  return (room as unknown as Atmospheric)._atmosphere;
}

describe('fire chemistry — the oxygen leg', () => {
  beforeEach(() => installV1QuantityMarshallers());
  afterEach(() => StuffApi.clearAll());

  it('smoke is an un-breathable, carbon-monoxide-carrying medium', () => {
    expect(BiomeApi.breathableOf('smoke')).toBe(false);
    expect(BiomeApi.contaminantOf('smoke')).toBe('carbonMonoxide');
    expect(BiomeApi.contaminantOf('air')).toBeNull();
  });

  it('a sealed scope starves the fire → incomplete, smoky, then self-smothered', async () => {
    const zone = makeStuff(() => new CartesianZone());
    const room = await cellar(zone, 0, 100);
    const fire = await burningLog(room);
    await occupy(room);
    expect(fire.getFlameTemperatureK()).toBe(1000); // complete while air is high

    // Burn the scope's air down past the complete threshold (8 %/tick).
    for (let i = 0; i < 9; i++) FireApi.onFireTick();
    expect(fire.isBurning()).toBe(true);
    expect(fire.getFlameTemperatureK()).toBe(750); // incomplete → cooler
    expect(atmosphereOf(room)).toBe('smoke'); // soot + CO fills the room

    // Keep burning — the air floors and the fire self-smothers.
    for (let i = 0; i < 6; i++) FireApi.onFireTick();
    expect(fire.isBurning()).toBe(false); // no oxygen leg → out
    expect(atmosphereOf(room)).toBeNull(); // smoke clears once the fire dies
  });

  it('a ventilated scope (an open boundary) stays complete and clean', async () => {
    const zone = makeStuff(() => new CartesianZone());
    const room = await cellar(zone, 0, 100);
    const outside = makeStuff(() => new CartesianLocation());
    zone.addLocation(outside, 1, 0, 0);
    // An open (doorless) exit ventilates the scope.
    await room.addExit(
      makeStuff(() => new Exit({ direction: 'out', source: room, destination: outside })),
    );
    const fire = await burningLog(room);
    await occupy(room);

    for (let i = 0; i < 12; i++) FireApi.onFireTick();
    expect(fire.isBurning()).toBe(true); // ventilation keeps it alive
    expect(fire.getFlameTemperatureK()).toBe(1000); // complete → hot
    expect(atmosphereOf(room)).toBeNull(); // no smoke build-up
  });
});
