/**
 * TangibleMixin — material reference(s) for physical Stuff.
 *
 * Composing this mixin says: "this Stuff is made of materials." A
 * Thing/Location/Vessel/Agent that composes Tangible reaches its
 * Material singleton(s) via `getMaterial()`; un-composed Stuff (Ideas,
 * command-staging entities) carry no Material concept at all.
 *
 * **Bulk + per-Detail.** The Stuff carries a *bulk default* Material
 * (the substance of the bulk of the object) plus optional per-Detail
 * overrides. `getMaterial()` with no argument returns the bulk
 * default; `getMaterial(detailKey)` returns the override for that
 * Detail when one is set, falling through to the bulk default
 * otherwise. An axe with a wooden haft and an iron head looks like:
 *
 * ```typescript
 * axe.setMaterial(oak);              // bulk = oak (the haft)
 * axe.setMaterial(iron, 'head');     // override for the 'head' Detail
 * axe.getMaterial();                 // → oak (bulk)
 * axe.getMaterial('haft');           // → oak (no override → bulk)
 * axe.getMaterial('head');           // → iron (override)
 * ```
 *
 * `detailKey` is whatever string a `DetailedMixin` host uses to
 * identify a Detail — `getMaterial` doesn't enforce that the key
 * actually maps to a registered Detail. That coupling lives in
 * `MaterialApi` / consumer call sites.
 *
 * **Cross-reference shape (LOCKED).** Persistent fields are path
 * strings, NOT serialized Material instances. The getter resolves on
 * each call via `StuffApi.findByTemplatePath`, which is sync and
 * HMR-safe — replacing the Material singleton at boot or via
 * hot-reload is observed immediately by every reader. No marshaller
 * required.
 */

import type { MixinConstructor } from '../mixin';
import { StuffApi } from '../../api/stuff';
import type { Material } from './Material';

export interface Tangible {
  /**
   * Resolve the Material at `detailKey`, falling through to the bulk
   * default when no per-Detail override is set. Omit `detailKey` to
   * read the bulk default directly.
   */
  getMaterial(detailKey?: string): Material | null;

  /**
   * Set the Material at `detailKey`, or the bulk default when
   * `detailKey` is omitted. `setMaterial(null, detailKey)` removes the
   * per-Detail override (later reads at that key fall through to the
   * bulk default again). `setMaterial(null)` clears the bulk default
   * AND every per-Detail override.
   */
  setMaterial(value: Material | null, detailKey?: string): void;
}

export function TangibleMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class TangibleMixin extends Base {
    static _mixinName = 'TangibleMixin';
    static persistentFields = ['_materialPath', '_detailMaterialPaths'];

    /**
     * Path to the bulk default Material singleton. Resolved lazily on
     * each `getMaterial()` call so HMR replacement is observed
     * immediately.
     */
    public _materialPath: string | null = null;

    /**
     * Per-Detail Material overrides — flat map from detailKey to the
     * Material's templatePath. Stored as a plain `Record` (not a
     * `Map`) so default JSON serialization handles it without a
     * marshaller.
     */
    public _detailMaterialPaths: Record<string, string> = {};

    public getMaterial(detailKey?: string): Material | null {
      if (detailKey !== undefined) {
        const override = this._detailMaterialPaths[detailKey];
        if (override) {
          return StuffApi.findByTemplatePath<Material>(override) ?? null;
        }
        // No override at this key — fall through to bulk default.
      }
      if (!this._materialPath) return null;
      return StuffApi.findByTemplatePath<Material>(this._materialPath) ?? null;
    }

    public setMaterial(value: Material | null, detailKey?: string): void {
      if (detailKey !== undefined) {
        if (value === null) {
          delete this._detailMaterialPaths[detailKey];
        } else {
          const path = value.getTemplatePath();
          if (path) this._detailMaterialPaths[detailKey] = path;
        }
        return;
      }
      // Bulk default. setMaterial(null) clears overrides too — the
      // alternative (only clearing the bulk while keeping overrides)
      // makes the defaultless Stuff observably weird.
      if (value === null) {
        this._materialPath = null;
        this._detailMaterialPaths = {};
        return;
      }
      this._materialPath = value.getTemplatePath() ?? null;
    }
  };
}
