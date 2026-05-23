/**
 * SkyExposedMixin — capability for biomes whose Locations look out
 * on the open sky.
 *
 * Composes onto `Biome` to form `SkyExposedBiome`. The outdoor biome
 * tier (`outdoor/temperate/...`) extends `SkyExposedBiome`; indoor
 * and underground tiers extend plain `Biome`. The `isSkyExposed()`
 * predicate is what `BiomeApi.isSkyExposed(scope)` consults after
 * walking the containment chain to find the nearest biome ancestor.
 *
 * v1 carries no celestial / weather state; future `getWeather()` /
 * `getCelestialBodies()` methods land with their consuming
 * subsystems. Today the mixin is a trait stamp — its presence is
 * the entire substrate.
 *
 * Parallels `RadioactiveMixin` on `Material`: a capability seam
 * narrowed via `MixinApi.isSkyExposed(biome)` for downstream code
 * that wants to branch on the trait.
 */

import type { MixinConstructor } from '../mixin';

export interface SkyExposed {
  /** Does this biome look out on the open sky? */
  isSkyExposed(): boolean;
}

export function SkyExposedMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class SkyExposedMixin extends Base implements SkyExposed {
    static _mixinName = 'SkyExposedMixin';

    public isSkyExposed(): boolean {
      return true;
    }
  };
}
