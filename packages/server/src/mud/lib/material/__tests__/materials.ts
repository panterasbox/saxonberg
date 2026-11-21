/**
 * Materials, stood in for a suite (load-on-use W8).
 *
 * A running world loads a material with what cites it — a body plan's
 * tissues, a deposit's mineral — and every sync read of a cited material
 * throws when it is cold. A suite that builds the citer by hand stands the
 * cited materials in: BLANK (no figures authored), which is what such a
 * suite read before, when the cold read answered nothing; or tagged, where
 * the suite's reader asks a tag (a bone is `bone`).
 */

import Material from '../Material';
import Gas from '../../../platform/idea/material/Gas';
import Water from '../../../platform/idea/material/Water';
import { Quantity } from '../../quantity';
import { StuffApi } from '../../../api/stuff';
import { makeStuffAtPath } from '../../security/__tests__/test-setup';

/** Stand a material at each path (blank, or with `tags`), unless one is live. */
export function standMaterials(paths: Record<string, string[]> | string[]): void {
  const entries = Array.isArray(paths) ? paths.map((p) => [p, [] as string[]] as const) : Object.entries(paths);
  for (const [path, tags] of entries) {
    if (StuffApi.findByTemplatePath(path)) continue;
    const m = makeStuffAtPath(() => new Material(), path);
    if (tags.length > 0) m.setTags([...tags]);
  }
}

/** The tissue materials the test body plans cite — `bone` tagged as the shipped row is. */
export const TEST_TISSUES: Record<string, string[]> = {
  '/stuff/idea/material/tissue/flesh': ['tissue'],
  '/stuff/idea/material/tissue/bone': ['tissue', 'bone'],
  '/stuff/idea/material/tissue/muscle': ['tissue'],
};

/** The solvent every boiled-down solution gives off (`Solution.getSolvent`). */
export const SOLVENT_WATER = '/stuff/idea/material/bulk/water';
/** Its vapor row — what a boil vents into the air. */
export const SOLVENT_WATER_VAPOR = '/stuff/idea/material/gas/water-vapor';

/**
 * ⭐ Stand the SOLVENT (water, and its vapor row) unless it is live. A
 * running world loads it with any row that authors dissolved solids (the
 * `setSolidsKgPerL` door); a suite that builds a solution by hand and
 * boils it stands it here, because the boil vents water's vapor.
 */
export function standSolvent(): Water {
  if (!StuffApi.findByTemplatePath(SOLVENT_WATER_VAPOR)) {
    makeStuffAtPath(() => {
      const g = new Gas();
      g.setName('water vapor');
      g.setDensity(Quantity.of(0.6, 'kg/m³'));
      g.setTags(['gas', 'water-vapor']);
      return g;
    }, SOLVENT_WATER_VAPOR);
  }
  const live = StuffApi.findByTemplatePath<Water>(SOLVENT_WATER);
  if (live) return live;
  return makeStuffAtPath(() => {
    const m = new Water();
    m.setName('water');
    m.setDensity(Quantity.of(1000, 'kg/m³'));
    m.setSpecificHeat(Quantity.of(4186, 'J/(kg·K)'));
    m.setBoilingPoint(Quantity.of(373, 'K'));
    m.setLatentHeatOfVaporization(Quantity.of(2_260_000, 'J/kg'));
    m.setVapourMaterial(SOLVENT_WATER_VAPOR);
    return m;
  }, SOLVENT_WATER) as unknown as Water;
}
