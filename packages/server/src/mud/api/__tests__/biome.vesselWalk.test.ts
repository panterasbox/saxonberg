import "../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Location from '../../lib/stuff/Location';
import { Vessel } from '../../lib/stuff/Vessel';
import { AtmosphericMixin } from '../../lib/biome/Atmospheric';
import { Idea } from '../../lib/stuff/Idea';
import { ContainerMixin } from '../../lib/spatial/Container';
import { ContainableMixin } from '../../lib/spatial/Containable';
import Biome from '../../lib/biome/Biome';
import { BiomeApi } from '../biome';
import { Quantity } from '../../lib/quantity';
import { StuffApi } from '../stuff';
import { ContainmentApi } from '../containment';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../lib/persistence/__tests__/quantity-marshaller-test-helpers';

class TestLocation extends Location {}

/**
 * ⭐ A CABIN — the `ExitableVessel` shape (`Atmospheric(Vessel)`) without
 * the exit machinery, which needs an async clone these sync fixtures
 * cannot do. A ship's cabin, a submarine, a bell jar: something you are
 * INSIDE, with air of its own.
 *
 * ⚠ This was `class TestVessel extends Vessel {}` until the base-class
 * narrowing build, when `AtmosphericMixin` moved off `Vessel` and onto
 * `ExitableVessel` — *a bag is not a place; a thing you can go inside
 * is*. The rename is the point: every case below is about a scope with
 * its own air, and a plain `Vessel` is not one any more. What a plain
 * vessel does now is in the last case.
 */
class TestCabin extends AtmosphericMixin(Vessel) {}

// A plain Vessel — Container + Containable and nothing else, post-move.
class PlainVessel extends Vessel {}

// Pure Container — composes Container + Containable but NOT Atmospheric.
// Stand-in for Box / Backpack / treasure chest in the v1 codebase.
class PureContainer extends ContainerMixin(ContainableMixin(Idea)) {}

function installRootBiome(): Biome {
  return makeStuffAtPath(() => {
    const b = new Biome();
    b.setDefaultTemperature(Quantity.of(295, 'K'));
    b.setDefaultPressure(Quantity.of(101325, 'Pa'));
    b.setDefaultHumidity(Quantity.of(50, '%'));
    b.setDefaultGravity(Quantity.of(9.81, 'm/s²'));
    b.setDefaultWind(Quantity.of(0, 'm/s'));
    b.setDefaultAtmosphere('air');
    return b;
  }, '/stuff/idea/biome/universe');
}

describe('BiomeApi resolve* — vessel walk', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    BiomeApi.invalidateRootBiomeCache();
    installRootBiome();
  });

  afterEach(() => {
    StuffApi.clearAll();
    BiomeApi.invalidateRootBiomeCache();
  });

  it('porous vessel — no overrides → reads outer Location values', async () => {
    const room = makeStuff(() => new TestLocation());
    room.setTemperature(Quantity.of(285, 'K'));
    const ship = makeStuff(() => new TestCabin());
    ContainmentApi.move(ship, room);

    expect((await BiomeApi.resolveTemperatureFor(ship)).rawValue()).toBe(285);
  });

  it('sealed vessel — overrides stop the walk at the vessel', async () => {
    const room = makeStuff(() => new TestLocation());
    room.setTemperature(Quantity.of(287, 'K'));
    room.setAtmosphere('water');
    const sub = makeStuff(() => new TestCabin());
    sub.setTemperature(Quantity.of(295, 'K'));
    sub.setAtmosphere('air');
    ContainmentApi.move(sub, room);

    expect((await BiomeApi.resolveTemperatureFor(sub)).rawValue()).toBe(295);
    expect(await BiomeApi.resolveAtmosphereFor(sub)).toBe('air');
    // The room itself reads its own values, unaffected.
    expect((await BiomeApi.resolveTemperatureFor(room)).rawValue()).toBe(287);
    expect(await BiomeApi.resolveAtmosphereFor(room)).toBe('water');
  });

  it('partial sealing — bell jar overrides atmosphere only', async () => {
    const room = makeStuff(() => new TestLocation());
    room.setTemperature(Quantity.of(285, 'K'));
    const jar = makeStuff(() => new TestCabin());
    jar.setAtmosphere('vacuum');
    ContainmentApi.move(jar, room);

    expect(await BiomeApi.resolveAtmosphereFor(jar)).toBe('vacuum');
    expect((await BiomeApi.resolveTemperatureFor(jar)).rawValue()).toBe(285);
  });

  it('nested vessels — inner walks past null entries to outer override', async () => {
    const room = makeStuff(() => new TestLocation());
    const outer = makeStuff(() => new TestCabin());
    outer.setTemperature(Quantity.of(295, 'K'));
    outer.setAtmosphere('air');
    const inner = makeStuff(() => new TestCabin());
    inner.setAtmosphere('water');
    ContainmentApi.move(outer, room);
    ContainmentApi.move(inner, outer);

    // Inner walks past its null temperature to outer's 295 K.
    expect((await BiomeApi.resolveTemperatureFor(inner)).rawValue()).toBe(295);
    // Inner's own atmosphere override stops the walk locally.
    expect(await BiomeApi.resolveAtmosphereFor(inner)).toBe('water');
  });

  it('detail-key locality — outer Location IS queried with the detail key', async () => {
    const room = makeStuff(() => new TestLocation());
    room.setTemperature(Quantity.of(800, 'K'), 'hearth');
    const vessel = makeStuff(() => new TestCabin());
    ContainmentApi.move(vessel, room);

    // Per requirements: detail key applies only at innermost scope.
    // The vessel has no 'hearth' detail; the walk should NOT pass the
    // detail key onto outer ancestors. The outer Location's hearth
    // override is therefore NOT visible to a vessel-scope query.
    expect(
      (await BiomeApi.resolveTemperatureFor(vessel, 'hearth')).rawValue(),
    ).toBe(295); // falls through to universe default

    // Querying the Location with the detail key DOES read the override.
    expect(
      (await BiomeApi.resolveTemperatureFor(room, 'hearth')).rawValue(),
    ).toBe(800);
  });

  it('pure container is atmospherically transparent', async () => {
    const room = makeStuff(() => new TestLocation());
    room.setTemperature(Quantity.of(310, 'K'));
    const box = makeStuff(() => new PureContainer());
    ContainmentApi.move(box, room);

    // The chain walker should skip box (no AtmosphericMixin) and read
    // the room's override.
    expect((await BiomeApi.resolveTemperatureFor(box)).rawValue()).toBe(310);
  });

  it('⭐ a PLAIN vessel is a transparent step — a bag is not a place', async () => {
    // The base-class narrowing build's whole claim, as an assertion.
    // Before it, a backpack composed `Atmospheric` and could hold its own
    // temperature; thirty-seven rows over fifteen composers had the
    // capability and **none of them ever authored a field of it**. Now a
    // bag is exactly what a `PureContainer` is to the walk: something to
    // step through on the way to the air.
    const room = makeStuff(() => new TestLocation());
    room.setTemperature(Quantity.of(281, 'K'));
    const bag = makeStuff(() => new PlainVessel());
    ContainmentApi.move(bag, room);

    expect((await BiomeApi.resolveTemperatureFor(bag)).rawValue()).toBe(281);
    // And it cannot be told otherwise: there is no setter to call.
    expect('setTemperature' in bag).toBe(false);
  });

});
