/**
 * SkyExposedBiome — concrete Biome subclass carrying the
 * SkyExposedMixin capability. Outdoor biome leaves (and the
 * observatory-dome special case) use `class:
 * /stuff/idea/biome/SkyExposedBiome`; indoor and underground biomes use
 * plain `class: /stuff/idea/biome/Biome`.
 *
 * Parallels `RadioactiveMaterial extends RadioactiveMixin(Material)`
 * in the Material substrate.
 */

import Biome from '../../lib/biome/Biome';
import { SkyExposedMixin } from '../../lib/biome/SkyExposed';

export class SkyExposedBiome extends SkyExposedMixin(Biome) {}
