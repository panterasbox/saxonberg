/**
 * Biome — the generic concrete biome.
 *
 * `lib/biome/Biome` is substrate: the atmospheric field every locality
 * resolves outward to, with `SkyExposedBiome` specializing it for
 * anything under open sky. The base-library pack clones the base
 * directly for indoor biomes, which need no sky behavior.
 *
 * Those pack entries name this class. See
 * docs/plans/lib-obj-taxonomy-plan.md §2.2.
 */

import BiomeBase from '../lib/biome/Biome';

export default class Biome extends BiomeBase {}
