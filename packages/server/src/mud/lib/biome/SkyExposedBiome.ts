/**
 * SkyExposedBiome — concrete Biome subclass carrying the
 * SkyExposedMixin capability. Outdoor biome leaves (and the
 * observatory-dome special case) use `class:
 * /lib/biome/SkyExposedBiome`; indoor and underground biomes use
 * plain `class: /lib/biome/Biome`.
 *
 * Parallels `RadioactiveMaterial extends RadioactiveMixin(Material)`
 * in the Material substrate.
 */

import { Biome } from './Biome';
import { SkyExposedMixin } from './SkyExposed';

export class SkyExposedBiome extends SkyExposedMixin(Biome) {}
