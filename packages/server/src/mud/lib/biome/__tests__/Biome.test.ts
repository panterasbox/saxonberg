import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Biome from '../Biome';
import { Idea } from '../../stuff/Idea';
import { Zone } from '../../zone/Zone';
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

  it('extends Idea (not Zone)', () => {
    const b = makeStuff(() => new Biome());
    expect(b).toBeInstanceOf(Idea);
    expect(b instanceof Zone).toBe(false);
  });

  it('round-trips _extendsBiomePath via getExtendsBiome / setExtendsBiome', () => {
    const parent = makeStuffAtPath(
      () => new Biome(),
      '/stuff/idea/biome/_fixtures/parent',
    );
    const child = makeStuffAtPath(
      () => new Biome(),
      '/stuff/idea/biome/_fixtures/child',
    );
    child.setExtendsBiome(parent);
    expect(child.getExtendsBiome()).toBe(parent);
    expect(child.getExtendsBiomePath()).toBe('/stuff/idea/biome/_fixtures/parent');
  });

  it('setExtendsBiome(null) clears the ref', () => {
    const parent = makeStuffAtPath(
      () => new Biome(),
      '/stuff/idea/biome/_fixtures/parent2',
    );
    const child = makeStuff(() => new Biome());
    child.setExtendsBiome(parent);
    child.setExtendsBiome(null);
    expect(child.getExtendsBiome()).toBeNull();
    expect(child.getExtendsBiomePath()).toBeNull();
  });

  it('round-trips the five atmospheric defaults', () => {
    const b = makeStuff(() => new Biome());
    b.setDefaultTemperature(Quantity.of(290, 'K'));
    b.setDefaultPressure(Quantity.of(101000, 'Pa'));
    b.setDefaultHumidity(Quantity.of(60, '%'));
    b.setDefaultGravity(Quantity.of(9.81, 'm/s²'));
    b.setDefaultWind(Quantity.of(0, 'm/s'));
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
      '/stuff/idea/biome/_fixtures/test1',
    );
    expect(StuffApi.findByTemplatePath('/stuff/idea/biome/_fixtures/test1')).toBe(b);
  });
});
