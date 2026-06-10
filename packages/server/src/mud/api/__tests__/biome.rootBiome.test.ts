import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Biome from '../../lib/biome/Biome';
import { BiomeApi } from '../biome';
import { Quantity } from '../../lib/quantity';
import { StuffApi } from '../stuff';
import { makeStuffAtPath } from '../../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../lib/persistence/__tests__/quantity-marshaller-test-helpers';

/** Stand-in for the root universe biome that boot would seed. */
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

describe('BiomeApi.getRootBiome', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    BiomeApi.invalidateRootBiomeCache();
  });

  afterEach(() => {
    StuffApi.clearAll();
    BiomeApi.invalidateRootBiomeCache();
  });

  it('resolves the universe biome at /lib/biome', () => {
    const root = installRootBiome();
    expect(BiomeApi.getRootBiome()).toBe(root);
  });

  it('carries all five universal defaults', () => {
    installRootBiome();
    const root = BiomeApi.getRootBiome();
    expect(root.getDefaultTemperature()?.rawValue()).toBe(295);
    expect(root.getDefaultPressure()?.rawValue()).toBe(101325);
    expect(root.getDefaultHumidity()?.rawValue()).toBe(50);
    expect(root.getDefaultGravity()?.rawValue()).toBeCloseTo(9.81);
    expect(root.getDefaultAtmosphere()).toBe('air');
  });

  it('caches the root biome instance', () => {
    installRootBiome();
    const first = BiomeApi.getRootBiome();
    const second = BiomeApi.getRootBiome();
    expect(first).toBe(second);
  });

  it('invalidateRootBiomeCache forces a re-lookup', () => {
    installRootBiome();
    BiomeApi.getRootBiome();
    BiomeApi.invalidateRootBiomeCache();
    // Removing the root mid-test should now surface an error.
    StuffApi.clearAll();
    expect(() => BiomeApi.getRootBiome()).toThrow(/not loaded/);
  });

  it('throws when no root biome is installed', () => {
    expect(() => BiomeApi.getRootBiome()).toThrow(/not loaded/);
  });

  it('findByPath of /lib/biome surfaces the same singleton', () => {
    const root = installRootBiome();
    expect(BiomeApi.findByPath('/lib/biome/universe')).toBe(root);
  });
});
