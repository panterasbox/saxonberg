import { describe, it, expect } from 'vitest';
import { BiomeApi } from '../biome';

describe('BiomeApi.conductivityOf', () => {
  it('returns air conductivity ~0.026 W/(m·K)', () => {
    const k = BiomeApi.conductivityOf('air');
    expect(k.rawValue()).toBeCloseTo(0.026, 5);
    expect(k.unit).toBe('W/(m·K)');
  });

  it('water conducts far faster than air (immersion danger)', () => {
    const air = BiomeApi.conductivityOf('air').rawValue();
    const water = BiomeApi.conductivityOf('water').rawValue();
    expect(water).toBeGreaterThan(air * 10);
  });

  it('vacuum is positive but vastly less than air (cools slowly, not never)', () => {
    const vac = BiomeApi.conductivityOf('vacuum').rawValue();
    const air = BiomeApi.conductivityOf('air').rawValue();
    expect(vac).toBeGreaterThan(0);
    expect(vac).toBeLessThan(air);
  });

  it('throws on unknown tag', () => {
    expect(() => BiomeApi.conductivityOf('unobtanium')).toThrow(
      /unknown atmosphere tag/,
    );
  });
});
