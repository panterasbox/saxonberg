/**
 * TangibleMixin — material reference(s) for physical Stuff.
 *
 * Composing this mixin says: "this Stuff is made of materials." A
 * Thing/Location/Vessel/Agent that composes Tangible reaches its
 * Material singleton(s) via `getMaterial()`; un-composed Stuff (Ideas,
 * command-staging entities) carry no Material concept at all.
 *
 * **Bulk + per-Detail with prefix inheritance.** The Stuff carries a
 * *bulk default* Material (the substance of the bulk of the object)
 * plus optional per-Detail overrides keyed by the same dotted detail
 * paths that `DetailedMixin` uses (`'blade.edge'` is the edge of the
 * blade). `getMaterial()` with no argument returns the bulk default;
 * `getMaterial(detailKey)` walks **longest dotted prefix first** down
 * to the bulk default — so a sub-detail without its own override
 * inherits whichever ancestor path most recently set one.
 *
 * ```typescript
 * axe.setMaterial(oak);              // bulk = oak (the haft)
 * axe.setMaterial(iron, 'head');     // override for the 'head' Detail
 * axe.setMaterial(steel, 'head.edge'); // sub-override on the edge
 *
 * axe.getMaterial();                 // → oak  (bulk)
 * axe.getMaterial('haft');           // → oak  (no override → bulk)
 * axe.getMaterial('head');           // → iron (exact override)
 * axe.getMaterial('head.spine');     // → iron (no exact, inherits 'head')
 * axe.getMaterial('head.edge');      // → steel (exact override)
 * axe.getMaterial('head.edge.tip');  // → steel (no exact, inherits 'head.edge')
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
import { Quantity } from '../quantity';

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

  /**
   * Read the Stuff's mass as a `Quantity<'kg'>`. Reconstructed from
   * the scalar storage on each call.
   */
  getMass(): Quantity<'kg'>;

  /**
   * Set the Stuff's mass. Accepts numeric (kg canonical), a string
   * literal (`"5 kg"`, `"5000 g"`, `"medium"` via KG_TAGS), or a
   * `Quantity<'kg'>`. Bare-number authoring (`mass: 5`) is
   * canonical-kg per the §13.4 rule.
   */
  setMass(value: Quantity<'kg'> | number | string): void;
}

export function TangibleMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class TangibleMixin extends Base {
    static _mixinName = 'TangibleMixin';
    static persistentFields = [
      '_materialPath',
      '_detailMaterialPaths',
      'mass',
    ];

    /**
     * Mass scalar (kg implicit). Accessor pair `mass` validates and
     * coerces from string / Quantity / numeric input so YAML
     * authoring (`mass: heavy`, `mass: "12 kg"`, `mass: "12000 g"`,
     * bare numeric) all hydrate cleanly.
     */
    private _mass: number = 0;

    /**
     * Persistent-field accessor. Hydrator's bracket-assign goes here;
     * runtime callers use `getMass` / `setMass`.
     */
    protected get mass(): number {
      return this._mass;
    }
    protected set mass(value: number | string | { value: number; unit: 'kg' }) {
      if (typeof value === 'number') {
        if (!Number.isFinite(value) || value < 0) {
          throw new TypeError(
            `TangibleMixin.mass must be a non-negative finite number, got ${value}`
          );
        }
        this._mass = value;
        return;
      }
      if (typeof value === 'string') {
        this._mass = Quantity.parse(value, 'kg').rawValue();
        return;
      }
      if (
        typeof value === 'object' &&
        value !== null &&
        typeof (value as { value?: unknown }).value === 'number' &&
        (value as { unit?: unknown }).unit === 'kg'
      ) {
        this._mass = (value as { value: number }).value;
        return;
      }
      throw new TypeError(
        `TangibleMixin.mass must be number | string | {value,unit:'kg'}, got ${typeof value}`
      );
    }

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
        // Walk dotted prefixes from longest to shortest; first match
        // wins. Mirrors `DetailedMixin`'s parent-then-child path
        // convention so a sub-detail inherits its ancestor's
        // material when it has no override of its own.
        let key: string | undefined = detailKey;
        while (key !== undefined) {
          const override = this._detailMaterialPaths[key];
          if (override) {
            return StuffApi.findByTemplatePath<Material>(override) ?? null;
          }
          const dot = key.lastIndexOf('.');
          key = dot < 0 ? undefined : key.substring(0, dot);
        }
        // No override at any prefix — fall through to bulk default.
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
      if (value === null) {
        this._materialPath = null;
        this._detailMaterialPaths = {};
        return;
      }
      this._materialPath = value.getTemplatePath() ?? null;
    }

    public getMass(): Quantity<'kg'> {
      return Quantity.of(this._mass, 'kg');
    }

    public setMass(value: Quantity<'kg'> | number | string): void {
      if (value instanceof Quantity) {
        if (value.unit !== 'kg') {
          throw new TypeError(
            `TangibleMixin.setMass: expected Quantity<'kg'>, got Quantity<'${value.unit}'>`
          );
        }
        if (value.rawValue() < 0) {
          throw new Error(
            `TangibleMixin.setMass: mass must be non-negative, got ${value.rawValue()}`
          );
        }
        this._mass = value.rawValue();
        return;
      }
      if (typeof value === 'number') {
        if (!Number.isFinite(value) || value < 0) {
          throw new Error(
            `TangibleMixin.setMass: mass must be non-negative finite, got ${value}`
          );
        }
        this._mass = value;
        return;
      }
      if (typeof value === 'string') {
        this._mass = Quantity.parse(value, 'kg').rawValue();
        return;
      }
      throw new TypeError(
        `TangibleMixin.setMass: expected Quantity | number | string, got ${typeof value}`
      );
    }
  };
}
