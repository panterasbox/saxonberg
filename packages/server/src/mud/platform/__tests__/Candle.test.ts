/**
 * The candle — the convergence fixture: `Combustible + LightSource + Thermal +
 * Reserved(wax)` over a `Thing`'s `Wet` wick. Igniting a **dry** wick lights it
 * (emit light + burn the wax), a **wet** wick won't catch; snuff/douse
 * extinguishes it and it goes dark; under a sealed (air-limited) jar it
 * self-smothers. One test exercising the layers together.
 */

import "../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import CartesianZone from '../idea/location/CartesianZone';
import CartesianLocation from '../../lib/location/CartesianLocation';
import Thing from '../../lib/stuff/Thing';
import Material from '../../lib/material/Material';
import Candle from '../thing/Candle';
import { ReservedMixin, Reserve } from '../../lib/reserve';
import { HasInteractiveMixin } from '../../lib/connection/HasInteractive';
import type { HasInteractive } from '../../lib/connection/HasInteractive';
import { FireApi } from '../../api/fire';
import { ContainmentApi } from '../../api/containment';
import { ConnectionManager } from '../../../backend/ConnectionManager';
import { StuffApi } from '../../api/stuff';
import { Quantity } from '../../lib/quantity';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { User } from '../../lib/identity/User';
import { makeStuff, makeStuffAtPath } from '../../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../lib/persistence/__tests__/quantity-marshaller-test-helpers';

/** An air-limited sealed jar (a Reserved scope carrying an `'air'` budget). */
class Jar extends ReservedMixin(CartesianLocation) {
  static _mixinName = 'JarTest';
}
class TestOccupant extends HasInteractiveMixin(Thing) {
  static _mixinName = 'TestOccupantCandle';
}

let seq = 0;
/** Candle wax with a cotton-wick water absorption (so a wet wick won't catch). */
function waxMaterial(): Material {
  seq += 1;
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName('candle-wax');
    m.setDensity(Quantity.of(900, 'kg/m³'));
    m.setSpecificHeat(Quantity.of(2000, 'J/(kg·K)'));
    m.setAutoignitionTemperature(Quantity.of(500, 'K'));
    m.setHeatOfCombustion(Quantity.of(42, 'MJ/kg'));
    m.setWaterAbsorptionCapacity(Quantity.of(15, '%')); // the wick soaks
    return m;
  }, `/stuff/idea/material/_test/candle-wax-${seq}`) as unknown as Material;
}

function candle(where?: Stuff): Candle {
  const c = makeStuff(() => {
    const cd = new Candle();
    cd.setMass(Quantity.of(0.05, 'kg'));
    cd.setMaterial(waxMaterial());
    cd.setReserve(
      new Reserve('fuel', Quantity.of(100, '%'), Quantity.of(100, '%'), 'combustion', null),
    );
    cd.setEmittedFlux(15);
    return cd;
  });
  return c;
}

async function occupy(room: CartesianLocation): Promise<void> {
  const n = seq++;
  const occ = makeStuff(() => new TestOccupant());
  await ContainmentApi.move(occ, room);
  const user = { _id: `candle-occ-${n}` } as unknown as User;
  const interactive = await ConnectionManager.get().createInteractive(
    `candle-sock-${n}`,
    `candle-sess-${n}`,
    user,
  );
  interactive.setHolder(occ as unknown as HasInteractive & Stuff);
}

describe('the candle — convergence', () => {
  beforeEach(() => installV1QuantityMarshallers());
  afterEach(() => StuffApi.clearAll());

  it('a dry wick lights → it burns and gives light', () => {
    const c = candle();
    expect(c.getEmittedFlux().rawValue()).toBe(0); // dark before lighting
    expect(c.ignite().lit).toBe(true);
    expect(c.isBurning()).toBe(true);
    expect(c.getEmittedFlux().rawValue()).toBe(15); // now it glows
  });

  it('a wet wick will not catch', () => {
    const c = candle();
    c.wet(1);
    const out = c.ignite();
    expect(out.lit).toBe(false);
    expect(out.reason).toBe('too-wet');
    expect(c.getEmittedFlux().rawValue()).toBe(0);
  });

  it('snuffing it puts it out and it goes dark', () => {
    const c = candle();
    c.ignite();
    expect(c.getEmittedFlux().rawValue()).toBe(15);
    expect(c.douse()).toBe(true);
    expect(c.isBurning()).toBe(false);
    expect(c.getEmittedFlux().rawValue()).toBe(0);
  });

  it('under a sealed jar it self-smothers', async () => {
    const zone = makeStuff(() => new CartesianZone());
    const jar = makeStuff(() => new Jar());
    jar.setShortDescription('a sealed jar');
    zone.addLocation(jar, 0, 0, 0);
    jar.setReserve(
      new Reserve('air', Quantity.of(100, '%'), Quantity.of(30, '%'), 'atmosphere', null),
    );
    const c = candle();
    await ContainmentApi.move(c, jar);
    c.setStampedTemperatureK(295);
    c.setLastAmbientK(295);
    c.ignite();
    await occupy(jar);
    expect(c.isBurning()).toBe(true);

    // No ventilation → the flame eats the trapped air and gutters out.
    for (let i = 0; i < 6; i++) FireApi.onFireTick();
    expect(c.isBurning()).toBe(false);
    expect(c.getEmittedFlux().rawValue()).toBe(0);
  });
});
