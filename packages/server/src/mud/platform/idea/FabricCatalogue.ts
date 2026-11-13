/**
 * FabricCatalogue — the singleton that serves the `fabric` documents (the
 * non-resisting textile forms: `woven`, `knit`, `felted`,
 * `/trade/textiles/fabrics/sackcloth`, any pack's `content/fabrics/`),
 * reached as `MaterialApi.fabrics()`. What a fabric IS: `FabricSpec` in
 * `lib/material/Construction.ts`.
 *
 * ⭐ A garment cites its fabric BY PATH (`constructionForm:
 * /platform/fabrics/woven`, load-on-use W2), so a misspelling is caught by
 * `lint:census` before merge and `Constructed.setConstructionForm` loads the
 * document with the garment. The kernel's resist-bearing forms (`plate`,
 * `mail`…) stay bare words — a path is never a kernel form.
 *
 * ## Why this is content and the resist grid is not
 *
 * A form's resist profile is combat mitigation; a fabric carries drape,
 * loft and weave density and contributes no resist — every fabric shares
 * the kernel's one `TEXTILE_RESIST_PROFILE`. Content chooses the weave,
 * the kernel decides that cloth resists poorly.
 *
 * ⚠ `layerBand` is required and validated here: `getLayerDepth()` is
 * called unconditionally in three hot paths, so a bad band fails at
 * install, never at the moment somebody swings.
 */

import { DocumentCatalogue } from '../../lib/document/DocumentCatalogue';
import type { BoundaryRole } from '../../lib/security/BoundaryRole';
import { MAX_LAYER_BAND, type FabricSpec } from '../../lib/material/Construction';

export default class FabricCatalogue extends DocumentCatalogue<FabricSpec> {
  /** A reference catalogue everyone reads — `look`, `fit`, `wear` inside a circle (the commons). */
  static boundaryRole: BoundaryRole = 'commons';

  protected readonly kind = 'fabric';

  /** Validate a fabric document at `path` (the installer's validator too); throws naming what is wrong. */
  public parse(data: Record<string, unknown>, path: string): FabricSpec {
    const why = (r: string): never => {
      throw new Error(`fabric '${path}': ${r}`);
    };
    const key = path.slice(path.lastIndexOf('/') + 1);
    if (!/^[a-z][a-z0-9-]*$/.test(key)) why(`'${key}' is not a kebab form word`);
    const num = (field: string, fallback?: number): number => {
      const v = data[field] ?? fallback;
      if (typeof v !== 'number' || !Number.isFinite(v)) return why(`${field} must be a number`);
      return v;
    };
    const unit = (field: string, fallback?: number): number => {
      const v = num(field, fallback);
      if (v < 0 || v > 1) why(`${field} ${v} is outside 0..1`);
      return v;
    };
    const layerBand = num('layerBand');
    if (!Number.isInteger(layerBand) || layerBand < 0 || layerBand > MAX_LAYER_BAND) {
      why(`layerBand ${layerBand} is outside the 0..${MAX_LAYER_BAND} ladder`);
    }
    const stretch = num('stretch', 1);
    if (stretch < 0) why(`stretch ${stretch} is negative`);
    return {
      key,
      layerBand,
      loft: unit('loft', 0),
      weaveDensity: unit('weaveDensity', 0),
      drape: unit('drape', 0.5),
      stretch,
    };
  }
}
