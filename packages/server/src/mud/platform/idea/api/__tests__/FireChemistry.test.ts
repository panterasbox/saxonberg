/**
 * Real combustion chemistry — the oxygen leg, ⭐⭐ **derived from the
 * enclosure**.
 *
 * Before the fire build a scope starved a fire only if its ROW authored a
 * `%` `'air'` Reserve. Seven rows did; four of them composed no
 * `ReservedMixin` and the applier dropped the key, so the budget was
 * inert and nobody could know. Air is a consequence of the openings now:
 * a shut room fills with the fire's own exhaust, the mixture stops being
 * breathable, the fire goes sooty, and then it smothers — and a room with
 * a doorway open never gets there. Nothing authors anything.
 *
 * Driven through the real `FireApi.onFireTick` occupancy harness.
 */

import "../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import CartesianZone from '../../location/CartesianZone';
import CartesianLocation from '../../../../lib/location/CartesianLocation';
import { SkyExposedBiome } from '../../SkyExposedBiome';
import Exit from '../../../../lib/boundary/Exit';
import Good from '../../../../lib/stuff/Good';
import Material from '../../../../lib/material/Material';
import { ThermalMixin } from '../../../../lib/thermal/Thermal';
import { WetMixin } from '../../../../lib/wetness/Wet';
import { ReservedMixin, Reserve } from '../../../../lib/reserve';
import { CombustibleMixin } from '../../../../lib/fire/Combustible';
import { HasInteractiveMixin } from '../../../../lib/connection/HasInteractive';
import type { HasInteractive } from '../../../../lib/connection/HasInteractive';
import { FireApi } from '../../../../api/fire';
import { BiomeApi } from '../../../../api/biome';
import { ContainmentApi } from '../../../../api/containment';
import { ConnectionManager } from '../../../../../backend/ConnectionManager';
import { StuffApi } from '../../../../api/stuff';
import { Quantity } from '../../../../lib/quantity';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { Container } from '../../../../lib/spatial/Container';
import type { User } from '../../../../lib/identity/User';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../../../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';

const CO2 = '/stuff/idea/material/gas/carbon-dioxide';
const SMOKE = '/stuff/idea/material/gas/smoke';

class Firewood extends CombustibleMixin(
  WetMixin(ThermalMixin(ReservedMixin(Good))),
) {
  static _mixinName = 'FirewoodChem';
}
class TestOccupant extends HasInteractiveMixin(Good) {
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
  }, `/stuff/idea/material/_test/chem-wood-${seq}`) as unknown as Material;
}

/**
 * A room, and nothing else. ⭐ No class, no mixin, no authored reserve —
 * the whole point of the build is that an ordinary room does this.
 * `extent: 2` is a closet: 8 m³, the smallest honest sealed space.
 */
function room(zone: CartesianZone, x: number, extent = 2): CartesianLocation {
  const r = makeStuff(() => new CartesianLocation());
  r.setShortDescription(`room-${x}`);
  r.setExtent(extent);
  zone.addLocation(r, x, 0, 0);
  return r;
}

/** A stack of firewood heavy enough to use up a closet's air. */
async function burningStack(
  where: CartesianLocation,
  massKg = 20,
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
  await ContainmentApi.move(w, where);
  w.setStampedTemperatureK(295);
  w.setLastAmbientK(295);
  w.ignite();
  return w;
}

async function occupy(where: CartesianLocation): Promise<void> {
  const n = seq++;
  const occ = makeStuff(() => new TestOccupant());
  await ContainmentApi.move(occ, where);
  const user = { _id: `chem-occ-${n}` } as unknown as User;
  const interactive = await ConnectionManager.get().createInteractive(
    `chem-sock-${n}`,
    `chem-sess-${n}`,
    user,
  );
  interactive.setHolder(occ as unknown as HasInteractive & Stuff);
}

function airShare(r: CartesianLocation): number {
  return BiomeApi.airShareOf(
    BiomeApi.resolveAtmosphereContentsFor(r as unknown as Stuff & Container),
  );
}
function amountOf(r: CartesianLocation, path: string): number {
  const hit = BiomeApi.resolveAtmosphereContentsFor(
    r as unknown as Stuff & Container,
  ).find((c) => c.type === path);
  return hit?.amount ?? 0;
}

describe('fire chemistry — the oxygen leg, derived', () => {
  beforeEach(() => installV1QuantityMarshallers());
  afterEach(() => StuffApi.clearAll());

  it('the atmosphere TAG is untouched — smoke is a thing IN the air now', async () => {
    const zone = makeStuff(() => new CartesianZone());
    const r = room(zone, 0);
    const fire = await burningStack(r);
    await occupy(r);
    for (let i = 0; i < 20; i++) FireApi.onFireTick();
    // The fire has filled the room…
    expect(amountOf(r, CO2)).toBeGreaterThan(0);
    // …and wrote NO atmosphere override doing it, which is exactly the
    // point: a smoky room still reads `air` and kills you anyway. The two
    // sentinel write-throughs this replaces (the fire's smoke, a
    // ferment's CO₂) each encoded *only overlay a null, only clear my own
    // tag*, and that idiom broke the moment the tag was not the sole
    // source of truth about the air.
    expect((r as unknown as { _atmosphere: string | null })._atmosphere)
      .toBeNull();
    expect(fire).toBeDefined();
  });

  it('a shut room: air falls, the mixture stops being breathable, the fire goes sooty, then out', async () => {
    const zone = makeStuff(() => new CartesianZone());
    const r = room(zone, 0);
    const fire = await burningStack(r);
    await occupy(r);

    expect(airShare(r)).toBe(1);
    expect(fire.getFlameTemperatureK()).toBe(1000); // complete, in fresh air

    // Step 1 — the air goes. A person is told before anything else happens.
    let ticks = 0;
    while (
      BiomeApi.isBreathableMixture('air', [
        { type: CO2, amount: 1 - airShare(r) },
      ]) &&
      ticks < 200
    ) {
      FireApi.onFireTick();
      ticks += 1;
    }
    expect(ticks).toBeLessThan(200); // it actually happened
    expect(airShare(r)).toBeLessThan(1);
    expect(fire.isBurning()).toBe(true); // ⭐ still burning: you were warned

    // Step 2 — the fire starves and starts making soot.
    while (fire.getFlameTemperatureK() === 1000 && ticks < 300) {
      FireApi.onFireTick();
      ticks += 1;
    }
    expect(fire.getFlameTemperatureK()).toBe(750); // incomplete → cooler
    expect(fire.isBurning()).toBe(true);
    FireApi.onFireTick();
    expect(amountOf(r, SMOKE)).toBeGreaterThan(0); // ⭐ soot, only now

    // Step 3 — it smothers itself.
    while (fire.isBurning() && ticks < 400) {
      FireApi.onFireTick();
      ticks += 1;
    }
    expect(fire.isBurning()).toBe(false);
  });

  it('a doorway standing open: a hearth-sized fire never gets there', async () => {
    const zone = makeStuff(() => new CartesianZone());
    const r = room(zone, 0);
    const next = room(zone, 1);
    // A doorless exit into another room. ⚠ An INTERIOR opening — the
    // weaker of the two rates, because the next room's air is not fresh
    // air. Enough for a log; ⭐ deliberately NOT enough for the 20 kg
    // stack above, which is honest: a bonfire in a closet with the door
    // open really does put itself out.
    await r.addExit(
      makeStuff(() => new Exit({ direction: 'out', source: r, destination: next })),
    );
    const fire = await burningStack(r, 1);
    await occupy(r);

    for (let i = 0; i < 80; i++) FireApi.onFireTick();
    expect(fire.isBurning()).toBe(true);
    expect(fire.getFlameTemperatureK()).toBe(1000); // complete → hot
    expect(airShare(r)).toBeGreaterThan(0.93);
  });

  it('⭐ outdoors nothing accumulates at all — the same fire, under the sky', async () => {
    const zone = makeStuff(() => new CartesianZone());
    const yard = room(zone, 0);
    // ⚠ `makeStuffAtPath`, not `makeStuff`: `setBiome` stores an IDENTITY
    // ref (a path string) and `getBiome()` re-resolves it, so a biome with
    // no template path is a biome the walk cannot find — silently, which
    // is the ref-shape doctrine's whole point.
    yard.setBiome(
      makeStuffAtPath(
        () => new SkyExposedBiome(),
        '/stuff/idea/biome/_test/open-yard',
      ) as unknown as SkyExposedBiome,
    );
    const fire = await burningStack(yard, 20);
    await occupy(yard);

    for (let i = 0; i < 80; i++) FireApi.onFireTick();
    expect(fire.isBurning()).toBe(true);
    expect(fire.getFlameTemperatureK()).toBe(1000);
    expect(airShare(yard)).toBe(1); // ⭐ not "high": nothing went in
    expect(amountOf(yard, CO2)).toBe(0);
    expect(yard.airChangesPerHour()).toBe(Infinity);
  });

  it('a scope with no derivable volume accepts nothing — an Offstage room is not a place', async () => {
    const zone = makeStuff(() => new CartesianZone());
    const r = makeStuff(() => new CartesianLocation());
    // No extent, no zone → getVolume() is null.
    const accepted = (r as unknown as {
      addAtmosphereContent(p: string, l: number): number;
    }).addAtmosphereContent(CO2, 1000);
    expect(accepted).toBe(0);
    expect(amountOf(r, CO2)).toBe(0);
    expect(zone).toBeDefined();
  });
});
