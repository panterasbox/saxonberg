/**
 * Wind atmospheric field — a mechanical clone of the humidity spine.
 * Pins the chain resolution (universe terminus → biome override →
 * room override → detail override) for the `m/s` wind field that the
 * Phase-2 body effective-ambient resolver reads as its wind-chill
 * input.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Location from '../../lib/stuff/Location';
import Biome from '../../lib/biome/Biome';
import { BiomeApi } from '../biome';
import { Quantity } from '../../lib/quantity';
import { StuffApi } from '../stuff';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../lib/persistence/__tests__/quantity-marshaller-test-helpers';

class TestLocation extends Location {}

function installRootBiome(): Biome {
  return makeStuffAtPath(() => {
    const b = new Biome();
    b.setDefaultTemperature(Quantity.of(295, 'K'));
    b.setDefaultPressure(Quantity.of(101325, 'Pa'));
    b.setDefaultHumidity(Quantity.of(50, '%'));
    b.setDefaultWind(Quantity.of(0, 'm/s'));
    b.setDefaultGravity(Quantity.of(9.81, 'm/s²'));
    b.setDefaultAtmosphere('air');
    return b;
  }, '/obj/biome/universe');
}

describe('BiomeApi.resolveWindFor — chain walk', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    BiomeApi.invalidateRootBiomeCache();
    installRootBiome();
  });
  afterEach(() => {
    StuffApi.clearAll();
    BiomeApi.invalidateRootBiomeCache();
  });

  it('falls through to the calm universe default (0 m/s)', async () => {
    const room = makeStuff(() => new TestLocation());
    expect((await BiomeApi.resolveWindFor(room)).rawValue()).toBe(0);
  });

  it('a windy biome overrides the universe calm', async () => {
    const windy = makeStuffAtPath(() => {
      const b = new Biome();
      b._extendsBiomePath = '/obj/biome/universe';
      b.setDefaultWind(Quantity.of(8, 'm/s'));
      return b;
    }, '/obj/biome/outdoor/windy-pass');
    const room = makeStuff(() => new TestLocation());
    room.setBiome(windy);
    expect((await BiomeApi.resolveWindFor(room)).rawValue()).toBe(8);
  });

  it('a room override beats the biome default', async () => {
    const room = makeStuff(() => new TestLocation());
    room.setWind(Quantity.of(3, 'm/s'));
    expect((await BiomeApi.resolveWindFor(room)).rawValue()).toBe(3);
  });

  it('a detail override beats the room scope', async () => {
    const room = makeStuff(() => new TestLocation());
    room.setWind(Quantity.of(1, 'm/s'));
    room.setWind(Quantity.of(20, 'm/s'), 'cliff-edge');
    expect(
      (await BiomeApi.resolveWindFor(room, 'cliff-edge')).rawValue(),
    ).toBe(20);
  });

  it('setWind is strict on the m/s unit', () => {
    const room = makeStuff(() => new TestLocation());
    expect(() =>
      room.setWind(Quantity.of(5, 'm') as unknown as Quantity<'m/s'>),
    ).toThrow(TypeError);
  });

  it('traceResolveAll includes the wind field', async () => {
    const room = makeStuff(() => new TestLocation());
    room.setWind(Quantity.of(4, 'm/s'));
    const traces = await BiomeApi.traceResolveAll(room);
    expect(traces.wind.value.rawValue()).toBe(4);
    expect(traces.wind.source).toBe('room');
  });
});
