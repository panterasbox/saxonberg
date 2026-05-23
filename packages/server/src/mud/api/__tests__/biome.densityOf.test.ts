import { describe, it, expect } from 'vitest';
import { BiomeApi } from '../biome';

describe('BiomeApi.densityOf', () => {
  it('returns 1.225 kg/m³ for air', () => {
    const d = BiomeApi.densityOf('air');
    expect(d.rawValue()).toBeCloseTo(1.225, 5);
    expect(d.unit).toBe('kg/m³');
  });

  it('returns 1000 kg/m³ for water', () => {
    expect(BiomeApi.densityOf('water').rawValue()).toBe(1000);
  });

  it('returns 0 kg/m³ for vacuum', () => {
    expect(BiomeApi.densityOf('vacuum').rawValue()).toBe(0);
  });

  it('throws on unknown tag', () => {
    expect(() => BiomeApi.densityOf('unobtanium')).toThrow(
      /unknown atmosphere tag/,
    );
  });
});
