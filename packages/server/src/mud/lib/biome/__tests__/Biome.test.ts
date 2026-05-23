import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Biome } from '../Biome';
import { Zone } from '../../zone/Zone';
import { SpatialZone } from '../../zone/SpatialZone';
import { Quantity } from '../../quantity';
import { StuffApi } from '../../../api/stuff';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

describe('Biome', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
  });

  afterEach(() => {
    StuffApi.clearAll();
  });

  it('extends Zone but not SpatialZone', () => {
    const b = makeStuff(() => new Biome());
    expect(b).toBeInstanceOf(Zone);
    expect(b instanceof SpatialZone).toBe(false);
  });

  it('round-trips the five atmospheric defaults', () => {
    const b = makeStuff(() => new Biome());
    b.setDefaultTemperature(Quantity.of(290, 'K'));
    b.setDefaultPressure(Quantity.of(101000, 'Pa'));
    b.setDefaultHumidity(Quantity.of(60, '%'));
    b.setDefaultGravity(Quantity.of(9.81, 'm/s²'));
    b.setDefaultAtmosphere('air');

    expect(b.getDefaultTemperature()?.rawValue()).toBe(290);
    expect(b.getDefaultPressure()?.rawValue()).toBe(101000);
    expect(b.getDefaultHumidity()?.rawValue()).toBe(60);
    expect(b.getDefaultGravity()?.rawValue()).toBe(9.81);
    expect(b.getDefaultAtmosphere()).toBe('air');
  });

  it('null clears each default', () => {
    const b = makeStuff(() => new Biome());
    b.setDefaultTemperature(Quantity.of(290, 'K'));
    b.setDefaultTemperature(null);
    expect(b.getDefaultTemperature()).toBeNull();
  });

  it('setDefaultTemperature is strict-on-unit', () => {
    const b = makeStuff(() => new Biome());
    expect(() =>
      b.setDefaultTemperature(Quantity.of(290, 'Pa') as unknown as Quantity<'K'>),
    ).toThrow(TypeError);
  });

  it('setDefaultPressure is strict-on-unit', () => {
    const b = makeStuff(() => new Biome());
    expect(() =>
      b.setDefaultPressure(Quantity.of(290, 'K') as unknown as Quantity<'Pa'>),
    ).toThrow(TypeError);
  });

  it('round-trips ambient sound + smell MML', () => {
    const b = makeStuff(() => new Biome());
    b.setAmbientSoundMml('<markup>distant birdsong</markup>');
    b.setAmbientSmellMml('<markup>fresh grass</markup>');
    expect(b.getAmbientSoundMml()).toBe('<markup>distant birdsong</markup>');
    expect(b.getAmbientSmellMml()).toBe('<markup>fresh grass</markup>');
  });

  it('participates in findByTemplatePath via path stamping', () => {
    const b = makeStuffAtPath(
      () => new Biome(),
      '/lib/biome/_fixtures/test1',
    );
    expect(StuffApi.findByTemplatePath('/lib/biome/_fixtures/test1')).toBe(b);
  });
});
