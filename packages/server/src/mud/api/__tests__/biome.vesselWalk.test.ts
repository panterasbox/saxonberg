import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Location from '../../lib/stuff/Location';
import { Vessel } from '../../lib/stuff/Vessel';
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
class TestVessel extends Vessel {}
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
    b.setDefaultAtmosphere('air');
    return b;
  }, '/lib/biome/universe');
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
    const ship = makeStuff(() => new TestVessel());
    ContainmentApi.move(ship, room);

    expect((await BiomeApi.resolveTemperatureFor(ship)).rawValue()).toBe(285);
  });

  it('sealed vessel — overrides stop the walk at the vessel', async () => {
    const room = makeStuff(() => new TestLocation());
    room.setTemperature(Quantity.of(287, 'K'));
    room.setAtmosphere('water');
    const sub = makeStuff(() => new TestVessel());
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
    const jar = makeStuff(() => new TestVessel());
    jar.setAtmosphere('vacuum');
    ContainmentApi.move(jar, room);

    expect(await BiomeApi.resolveAtmosphereFor(jar)).toBe('vacuum');
    expect((await BiomeApi.resolveTemperatureFor(jar)).rawValue()).toBe(285);
  });

  it('nested vessels — inner walks past null entries to outer override', async () => {
    const room = makeStuff(() => new TestLocation());
    const outer = makeStuff(() => new TestVessel());
    outer.setTemperature(Quantity.of(295, 'K'));
    outer.setAtmosphere('air');
    const inner = makeStuff(() => new TestVessel());
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
    const vessel = makeStuff(() => new TestVessel());
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
});
