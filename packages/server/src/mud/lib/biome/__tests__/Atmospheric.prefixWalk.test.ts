import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Location from '../../stuff/Location';
import Biome from '../Biome';
import { BiomeApi } from '../../../api/biome';
import { Quantity } from '../../quantity';
import { StuffApi } from '../../../api/stuff';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

class TestLocation extends Location {}

function installRootBiome(): void {
  makeStuffAtPath(() => {
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

describe('AtmosphericMixin — prefix walk', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    BiomeApi.invalidateRootBiomeCache();
    installRootBiome();
  });

  afterEach(() => {
    StuffApi.clearAll();
    BiomeApi.invalidateRootBiomeCache();
  });

  it('exact detail override beats prefix', async () => {
    const room = makeStuff(() => new TestLocation());
    room.setTemperature(Quantity.of(800, 'K'), 'hearth');
    room.setTemperature(Quantity.of(1200, 'K'), 'hearth.embers');
    expect((await room.getTemperature('hearth.embers')).rawValue()).toBe(1200);
  });

  it('prefix walks to ancestor when exact key has no override', async () => {
    const room = makeStuff(() => new TestLocation());
    room.setTemperature(Quantity.of(800, 'K'), 'hearth');
    expect((await room.getTemperature('hearth.something-else')).rawValue())
      .toBe(800);
  });

  it('unrelated detail key falls through to the universe default', async () => {
    const room = makeStuff(() => new TestLocation());
    room.setTemperature(Quantity.of(800, 'K'), 'hearth');
    expect((await room.getTemperature('elsewhere')).rawValue()).toBe(295);
  });

  it('null detail clears the entry', async () => {
    const room = makeStuff(() => new TestLocation());
    room.setTemperature(Quantity.of(800, 'K'), 'hearth');
    room.setTemperature(null, 'hearth');
    expect((await room.getTemperature('hearth')).rawValue()).toBe(295);
  });
});
