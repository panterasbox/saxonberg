/**
 * MaterialApi — facade for material-world queries on any Stuff.
 *
 * Today this is a thin shim over `Tangible.getMaterial`: dispatch on
 * `MixinApi.isTangible`, return the singleton, return `null` for
 * non-Tangible Stuff. The narrowness is by design — content has zero
 * material consumers in v1, so the surface lands as the consumers
 * arrive.
 *
 * Architecturally this is the home for "physical-world constraints"
 * queries. Future surface (lands as consumers do, not speculatively):
 * `weightOf(stuff)` (density × volume), `damageResistance(stuff,
 * damageType, detailKey?)`, `flammabilityOf(stuff, detailKey?)`,
 * `canConduct(stuff, kind)`, `nutrientsOf(stuff, detailKey?)`. The
 * counterpart to ZoneApi/ContainmentApi for the spatial side.
 */

import type { Stuff } from '../lib/stuff/Stuff';
import type { Material } from '../lib/material/Material';
import { MixinApi } from './mixin';
import { SecurityApi } from './security';

export class MaterialApi {
  /**
   * Resolve the Material at `detailKey`, falling through to the bulk
   * default when no per-Detail override is set. Omit `detailKey` to
   * read the bulk default directly. Returns `null` when `stuff` is
   * not Tangible (or is Tangible but unset).
   *
   * Sync; threads through `Tangible.getMaterial`, which uses
   * `findByTemplatePath` for HMR safety.
   */
  public static materialOf(
    stuff: Stuff,
    detailKey?: string
  ): Material | null {
    if (!MixinApi.isTangible(stuff)) return null;
    return stuff.getMaterial(detailKey);
  }
}

SecurityApi.decorateApiClass(MaterialApi);
