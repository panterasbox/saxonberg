import { describe, it, expect } from 'vitest';
import { BiomeApi } from '../biome';

describe('BiomeApi.breathableOf', () => {
  it('air is breathable', () => {
    expect(BiomeApi.breathableOf('air')).toBe(true);
  });

  it('water is not breathable (a default air-breather drowns)', () => {
    expect(BiomeApi.breathableOf('water')).toBe(false);
  });

  it('vacuum is not breathable', () => {
    expect(BiomeApi.breathableOf('vacuum')).toBe(false);
  });

  it('throws on unknown tag (the validation seam)', () => {
    expect(() => BiomeApi.breathableOf('unobtanium')).toThrow(
      /unknown atmosphere tag/,
    );
  });
});
