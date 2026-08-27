import "../../../../test-bootstrap";
import { describe, it, expect, afterEach } from 'vitest';
import Biome from '../Biome';
import { SkyExposedBiome } from '../../../platform/idea/SkyExposedBiome';
import { MixinApi } from '../../../api/mixin';
import { Mixins } from '../../mixin';
import { StuffApi } from '../../../api/stuff';
import { makeStuff } from '../../security/__tests__/test-setup';

describe('SkyExposedMixin', () => {
  afterEach(() => {
    StuffApi.clearAll();
  });

  it('SkyExposedBiome composes SkyExposedMixin', () => {
    const b = makeStuff(() => new SkyExposedBiome());
    expect(MixinApi.hasMixin(b, Mixins.SkyExposed)).toBe(true);
    expect(b.isSkyExposed()).toBe(true);
  });

  it('plain Biome does not compose SkyExposedMixin', () => {
    const b = makeStuff(() => new Biome());
    expect(MixinApi.hasMixin(b, Mixins.SkyExposed)).toBe(false);
  });

  it('SkyExposedBiome is still a Biome', () => {
    const b = makeStuff(() => new SkyExposedBiome());
    expect(b).toBeInstanceOf(Biome);
  });

  it('isSkyExposed predicate narrows correctly', () => {
    const b = makeStuff(() => new SkyExposedBiome());
    if (MixinApi.isSkyExposed(b)) {
      expect(b.isSkyExposed()).toBe(true);
    } else {
      throw new Error('expected narrowing to succeed');
    }
  });
});
