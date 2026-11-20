/**
 * ⭐⭐ One vaporization, one route (matter-model-overlaps D16–D17).
 *
 * Whatever becomes vapor — a lump of salt at a kiln's peak, a firing's tar, a
 * pot's steam, naphtha off an open dish — goes by ONE chain, `BiomeApi.vent`,
 * walking the source's holders outward:
 *
 *   1. the head — a holding chamber that hands it on (a retort's condenser);
 *   2. the chamber — any other LIT chamber keeps it as its own air, less
 *      `fire.chamber.leakShare` (0.1) that escapes at once;
 *   3. the room — the first scope with a volume; open to the sky, none (the
 *      sky is the sink);
 *   4. the flue — when the fire goes out the chamber's air goes up the flue,
 *      or into the room when there is no flue.
 *
 * And the steam a boil gives the room is HUMIDITY, which the room's own air
 * changes take back down.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import CartesianZone from '../../../platform/idea/location/CartesianZone';
import Location from '../../location/Location';
import { SkyExposedBiome } from '../../../platform/idea/SkyExposedBiome';
import Oven from '../../../platform/thing/Oven';
import Firebox from '../../fire/Firebox';
import { ContainerMixin } from '../../spatial/Container';
import Good from '../../stuff/Good';
import Gas from '../../../platform/idea/material/Gas';
import Water from '../../../platform/idea/material/Water';
import Flask from '../../../platform/thing/Flask';
import { BiomeApi } from '../../../api/biome';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import { WorldClockApi } from '../../../api/worldclock';
import WorldClockRegistry from '../../../platform/idea/WorldClockRegistry';
import { TemplatePaths } from '../../paths';
import { Quantity } from '../../quantity';
import type { Stuff } from '../../stuff/Stuff';
import type { Burner } from '../../fire/Burner';
import { chargeHot } from '../../fire/__tests__/burner-fuel';
import { makeStuff, makeStuffAtPath } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import { standRootBiome } from './root-biome';

beforeEach(() => void standRootBiome());

const TAR = '/stuff/idea/material/bulk/_vent-tar';

/** A chamber that takes everything — a retort with a condenser on its head. */
class HeadedChamber extends Oven {
  public taken = 0;
  public override receiveVolatiles(_vapor: string, litres: number): number {
    this.taken += litres;
    return litres;
  }
}

/** A flueless chamber — a clamp, a retort: ContainerMixin over a bare Firebox. */
class FluelessChamber extends ContainerMixin(Firebox) {}

let seq = 0;

function room(zone: CartesianZone, x: number): Location {
  const r = makeStuff(() => new Location());
  r.setShortDescription(`vent-room-${x}`);
  r.setTemperature(Quantity.of(293, 'K'));
  zone.addLocation(r, x, 0, 0);
  return r;
}

function fractionOf(r: Location, path: string): number {
  return BiomeApi.resolveAtmosphereContentsFor(r as unknown as Stuff).find((c) => c.type === path)?.amount ?? 0;
}

function lump(): Good {
  return makeStuff(() => new Good());
}

async function lit<T extends Stuff & Burner>(make: () => T, into: Location): Promise<T> {
  const o = makeStuff(make);
  chargeHot(o, 400);
  o.setBurnTemperatureK(900);
  await ContainmentApi.move(o as never, into);
  if (!o.isLit()) o.ignite();
  return o;
}

describe('BiomeApi.vent — the one vapor route, rung by rung', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    WorldClockApi.setScale(1);
    if (!StuffApi.findByTemplatePath(TemplatePaths.worldClockRegistry)) {
      makeStuffAtPath(() => new WorldClockRegistry(), TemplatePaths.worldClockRegistry);
    }
  });
  afterEach(() => {
    WorldClockApi._resetForTesting();
    StuffApi.clearAll();
  });

  it('(1) the head: a chamber that hands it on takes all of it, and the room none', async () => {
    const zone = makeStuff(() => new CartesianZone());
    const r = room(zone, 0);
    const retort = await lit(() => new HeadedChamber(), r);
    const charge = lump();
    await ContainmentApi.move(charge, retort);
    const out = BiomeApi.vent({ from: charge, material: TAR, litres: 100 });
    expect(out).toEqual({ chamber: 100, room: 0, sky: 0 });
    expect(retort.taken).toBe(100);
    expect(fractionOf(r, TAR)).toBe(0);
  });

  it('(2) the chamber: a lit oven keeps nine tenths as its air and lets one into the room', async () => {
    const zone = makeStuff(() => new CartesianZone());
    const r = room(zone, 0);
    const oven = await lit(() => new Oven(), r);
    const charge = lump();
    await ContainmentApi.move(charge, oven);
    const out = BiomeApi.vent({ from: charge, material: TAR, litres: 100 });
    expect(out.chamber).toBeCloseTo(90);
    expect(out.room).toBeCloseTo(10);
    expect(oven.getChamberVapors()[TAR]).toBeCloseTo(90);
    expect(fractionOf(r, TAR)).toBeCloseTo(10 / 27000);
  });

  it('a COLD chamber keeps no air of its own: all of it is the room\'s', async () => {
    const zone = makeStuff(() => new CartesianZone());
    const r = room(zone, 0);
    const oven = makeStuff(() => new Oven());
    await ContainmentApi.move(oven, r);
    if (oven.isLit()) oven.douse();
    expect(oven.isLit()).toBe(false);
    const charge = lump();
    await ContainmentApi.move(charge, oven);
    const out = BiomeApi.vent({ from: charge, material: TAR, litres: 100 });
    expect(out).toEqual({ chamber: 0, room: 100, sky: 0 });
    expect(oven.getChamberVapors()[TAR]).toBeUndefined();
  });

  it('(3) the room: a thing standing in it vents into its air', async () => {
    const zone = makeStuff(() => new CartesianZone());
    const r = room(zone, 0);
    const dish = lump();
    await ContainmentApi.move(dish, r);
    expect(BiomeApi.vent({ from: dish, material: TAR, litres: 270 }).room).toBeCloseTo(270);
    expect(fractionOf(r, TAR)).toBeCloseTo(0.01);
  });

  it('the sink: under the open sky the air takes none — it goes up', async () => {
    const zone = makeStuff(() => new CartesianZone());
    const yard = room(zone, 0);
    seq += 1;
    yard.setBiome(
      makeStuffAtPath(() => new SkyExposedBiome(), `/stuff/idea/biome/_test/vent-yard-${seq}`) as unknown as SkyExposedBiome,
    );
    const dish = lump();
    await ContainmentApi.move(dish, yard);
    expect(BiomeApi.vent({ from: dish, material: TAR, litres: 100 })).toEqual({ chamber: 0, room: 0, sky: 100 });
  });

  it('(4) ⭐ the flue: a flued kiln\'s air goes to the sky when it goes out, a flueless one\'s into the room', async () => {
    const zone = makeStuff(() => new CartesianZone());
    const a = room(zone, 0);
    const b = room(zone, 5);
    const kiln = await lit(() => new Oven(), a); // an Oven is Flued
    const clamp = await lit(() => new FluelessChamber(), b);
    for (const chamber of [kiln, clamp]) {
      const charge = lump();
      await ContainmentApi.move(charge, chamber);
      BiomeApi.vent({ from: charge, material: TAR, litres: 1000 });
    }
    const leaked = fractionOf(a, TAR);
    expect(leaked).toBeCloseTo(100 / 27000);
    expect(fractionOf(b, TAR)).toBeCloseTo(100 / 27000);

    expect(kiln.douse()).toBe(true);
    expect(clamp.douse()).toBe(true);
    expect(kiln.getChamberVapors()).toEqual({});
    expect(clamp.getChamberVapors()).toEqual({});
    // Up the kiln's flue: its room has only what leaked as it fired.
    expect(fractionOf(a, TAR)).toBeCloseTo(leaked);
    // The clamp has no flue: its nine hundred litres are the room's now.
    expect(fractionOf(b, TAR)).toBeCloseTo(1000 / 27000);
  });
});

describe('⭐ a boil makes the room humid, and its air changes take it down (D17)', () => {
  let realMs = 0;
  beforeEach(() => {
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    realMs = 1_000_000;
    WorldClockApi._setNowProviderForTesting(() => realMs);
    if (!StuffApi.findByTemplatePath(TemplatePaths.worldClockRegistry)) {
      makeStuffAtPath(() => new WorldClockRegistry(), TemplatePaths.worldClockRegistry);
    }
  });
  afterEach(() => {
    WorldClockApi._resetForTesting();
    StuffApi.clearAll();
  });

  it('steam off a boiling flask raises the room\'s humidity; a day of air changes takes it back', async () => {
    seq += 1;
    const vaporPath = `/stuff/idea/material/gas/_vent-water-vapor-${seq}`;
    makeStuffAtPath(() => {
      const g = new Gas();
      g.setName('water vapor');
      g.setDensity(Quantity.of(0.75, 'kg/m³'));
      g.setTags(['gas', 'water-vapor']);
      return g;
    }, vaporPath);
    const water = makeStuffAtPath(() => {
      const m = new Water();
      m.setName('water');
      m.setDensity(Quantity.of(1000, 'kg/m³'));
      m.setSpecificHeat(Quantity.of(4186, 'J/(kg·K)'));
      m.setMeltingPoint(Quantity.of(273, 'K'));
      m.setBoilingPoint(Quantity.of(373, 'K'));
      m.setLatentHeatOfVaporization(Quantity.of(2260000, 'J/kg'));
      m.setVapourMaterial(vaporPath);
      return m;
    }, `/stuff/idea/material/_vent/water-${seq}`) as unknown as Water;

    const zone = makeStuff(() => new CartesianZone());
    const kitchen = room(zone, 0);
    kitchen.setHumidity(Quantity.of(50, '%'));
    const before = BiomeApi.localHumidityFor(kitchen as unknown as Stuff)!;
    const beforeFull = (await BiomeApi.resolveHumidityFor(kitchen as unknown as Stuff)).rawValue();

    const flask = makeStuff(() => new Flask());
    flask.interiorBulk = true;
    flask.setInteriorCapacity(Quantity.of(2, 'L'));
    flask.setBulkMaterial('interior', water);
    flask.setBulkAmount('interior', Quantity.of(1, 'L'));
    await ContainmentApi.move(flask, kitchen);
    // Hot well past the boil, held hot (its ambient the fire's): it boils.
    flask.setStampedTemperatureK(420);
    flask.setLastAmbientK(420);
    flask.reconcileThermal();
    realMs += 600_000;
    flask.reconcileThermal();
    expect(flask.getBulkAmount('interior').rawValue()).toBeLessThan(1);

    const steam = fractionOf(kitchen, vaporPath);
    expect(steam).toBeGreaterThan(0);
    const humid = BiomeApi.localHumidityFor(kitchen as unknown as Stuff)!;
    expect(humid).toBeGreaterThan(before);
    expect((await BiomeApi.resolveHumidityFor(kitchen as unknown as Stuff)).rawValue()).toBeGreaterThan(beforeFull);
    expect(BiomeApi.airFor(kitchen as unknown as Stuff).humidityPct).toBeGreaterThan(before);
    expect(humid).toBeLessThanOrEqual(100);

    // A shut room still leaks (0.1 air changes an hour): two days on, the
    // steam is nearly all gone and the humidity with it.
    realMs += 48 * 3600 * 1000;
    expect(fractionOf(kitchen, vaporPath)).toBeLessThan(steam * 0.01);
    expect(BiomeApi.localHumidityFor(kitchen as unknown as Stuff)!).toBeCloseTo(before, 0);
  });
});
