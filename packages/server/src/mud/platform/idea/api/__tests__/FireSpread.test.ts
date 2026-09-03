/**
 * The presence-gated fire tick (spread). `FireApi.onFireTick` fans out over
 * OCCUPIED scopes only, advances each burning object, and spreads heat to
 * co-located combustibles + through OPEN boundaries (a closed door is a
 * firebreak). A wet neighbour resists; an unwatched scope's fire does not
 * advance (presence-freeze) — the storm-fanout discipline, proven end-to-end
 * through the real ConnectionManager occupancy harness.
 */

import "../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import CartesianZone from '../../location/CartesianZone';
import CartesianLocation from '../../../../lib/location/CartesianLocation';
import Exit from '../../../../lib/boundary/Exit';
import Door from '../../../thing/Door';
import Thing from '../../../../lib/stuff/Thing';
import Material from '../../../../lib/material/Material';
import { ThermalMixin } from '../../../../lib/thermal/Thermal';
import { WetMixin } from '../../../../lib/wetness/Wet';
import { ReservedMixin, Reserve } from '../../../../lib/reserve';
import { CombustibleMixin } from '../../../../lib/fire/Combustible';
import { HasInteractiveMixin } from '../../../../lib/connection/HasInteractive';
import type { HasInteractive } from '../../../../lib/connection/HasInteractive';
import { FireApi } from '../../../../api/fire';
import { ContainmentApi } from '../../../../api/containment';
import { ConnectionManager } from '../../../../../backend/ConnectionManager';
import { StuffApi } from '../../../../api/stuff';
import { Quantity } from '../../../../lib/quantity';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { User } from '../../../../lib/identity/User';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../../../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';

class Firewood extends CombustibleMixin(
  WetMixin(ThermalMixin(ReservedMixin(Thing))),
) {
  static _mixinName = 'FirewoodSpread';
}
class TestOccupant extends HasInteractiveMixin(Thing) {
  static _mixinName = 'TestOccupantFire';
}

let seq = 0;
function woodMaterial(): Material {
  seq += 1;
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName(`spread-wood-${seq}`);
    m.setAutoignitionTemperature(Quantity.of(570, 'K'));
    m.setHeatOfCombustion(Quantity.of(16, 'MJ/kg'));
    m.setSpecificHeat(Quantity.of(2000, 'J/(kg·K)'));
    m.setWaterAbsorptionCapacity(Quantity.of(28, '%'));
    return m;
  }, `/stuff/idea/material/_test/spread-wood-${seq}`) as unknown as Material;
}

/** A log placed in `room` (mass tuned to the radiant heat one tick delivers:
 * 1 kg for the in-room case, lighter kindling across a doorway where less heat
 * arrives). */
async function log(
  room: CartesianLocation,
  wet = false,
  massKg = 1,
): Promise<Firewood> {
  const w = makeStuff(() => {
    const f = new Firewood();
    f.setMass(Quantity.of(massKg, 'kg'));
    f.setMaterial(woodMaterial());
    f.setReserve(
      new Reserve('fuel', Quantity.of(100, '%'), Quantity.of(100, '%'), 'combustion', null),
    );
    return f;
  });
  await ContainmentApi.move(w, room);
  w.setStampedTemperatureK(295);
  w.setLastAmbientK(295);
  if (wet) w.wet(1);
  return w;
}

async function room(zone: CartesianZone, x: number): Promise<CartesianLocation> {
  const r = makeStuff(() => new CartesianLocation());
  r.setShortDescription(`room-${x}`);
  zone.addLocation(r, x, 0, 0);
  return r;
}

async function occupy(room: CartesianLocation): Promise<void> {
  const occ = makeStuff(() => new TestOccupant());
  await ContainmentApi.move(occ, room);
  const n = seq++;
  const user = { _id: `fire-occ-${n}` } as unknown as User;
  const interactive = await ConnectionManager.get().createInteractive(
    `wsock-${n}`,
    `wsess-${n}`,
    user,
  );
  interactive.setHolder(occ as unknown as HasInteractive & Stuff);
}

describe('the fire tick — spread', () => {
  beforeEach(() => installV1QuantityMarshallers());
  afterEach(() => StuffApi.clearAll());

  it('a burning object ignites an adjacent dry combustible in an occupied scope', async () => {
    const zone = makeStuff(() => new CartesianZone());
    const r = await room(zone, 0);
    const fire = await log(r);
    const neighbour = await log(r);
    await occupy(r);

    fire.ignite();
    expect(fire.isBurning()).toBe(true);
    expect(neighbour.isBurning()).toBe(false);

    FireApi.onFireTick();
    expect(neighbour.isBurning()).toBe(true); // caught from the radiant heat
  });

  it('a wet neighbour resists ignition', async () => {
    const zone = makeStuff(() => new CartesianZone());
    const r = await room(zone, 0);
    const fire = await log(r);
    const wetNeighbour = await log(r, true);
    await occupy(r);

    fire.ignite();
    FireApi.onFireTick();
    expect(wetNeighbour.isBurning()).toBe(false); // too wet to catch
  });

  it('an UNoccupied scope does not advance (presence-freeze)', async () => {
    const zone = makeStuff(() => new CartesianZone());
    const r = await room(zone, 0);
    const fire = await log(r);
    const neighbour = await log(r);
    // No occupy() — nobody is watching.

    fire.ignite();
    FireApi.onFireTick();
    expect(neighbour.isBurning()).toBe(false); // frozen — no spread
  });

  it('spreads through an OPEN door but NOT a closed one (firebreak)', async () => {
    // Open-door case.
    const zoneOpen = makeStuff(() => new CartesianZone());
    const a1 = await room(zoneOpen, 0);
    const b1 = await room(zoneOpen, 1);
    const openDoor = makeStuff(() => new Door());
    openDoor.setShortDescription('open door');
    openDoor.setOpen(true);
    await a1.addExit(
      makeStuff(
        () => new Exit({ direction: 'east', source: a1, destination: b1, door: openDoor }),
      ),
    );
    const fireA = await log(a1);
    const acrossOpen = await log(b1, false, 0.3);
    await occupy(a1);
    fireA.ignite();
    FireApi.onFireTick();
    expect(acrossOpen.isBurning()).toBe(true); // fire reached through the open door

    // Closed-door case.
    const zoneShut = makeStuff(() => new CartesianZone());
    const a2 = await room(zoneShut, 0);
    const b2 = await room(zoneShut, 1);
    const shutDoor = makeStuff(() => new Door());
    shutDoor.setShortDescription('shut door');
    shutDoor.setOpen(false);
    await a2.addExit(
      makeStuff(
        () => new Exit({ direction: 'east', source: a2, destination: b2, door: shutDoor }),
      ),
    );
    const fireA2 = await log(a2);
    const acrossShut = await log(b2, false, 0.3);
    await occupy(a2);
    fireA2.ignite();
    FireApi.onFireTick();
    expect(acrossShut.isBurning()).toBe(false); // the closed door is a firebreak
  });
});
