/**
 * TangibleMixin — bulk-material reference for physical Stuff.
 *
 * Composing this mixin says: "this Stuff is made of a (bulk) Material." A
 * Thing/Location/Vessel/Agent that composes Tangible reaches its Material
 * singleton via `getMaterial()`; un-composed Stuff (Ideas, command-staging
 * entities) carry no Material concept at all.
 *
 * **Cross-reference shape (LOCKED — see implementation plan).** The
 * persistent field is the path string `_materialPath`, NOT a serialized
 * Material instance. The getter resolves on each call via
 * `StuffApi.findByTemplatePath`, which is sync and HMR-safe — replacing
 * the Material singleton at boot or via hot-reload is observed
 * immediately by every reader. No marshaller required.
 *
 * v1 is bulk-only: a single Material per Stuff. Per-Detail materials
 * (the wood haft vs iron head of an axe) and edibility machinery
 * (`DietApi`, `Edible`) are deferred to follow-on builds.
 */

import type { MixinConstructor } from '../mixin';
import { StuffApi } from '../../api/stuff';
import type { Material } from './Material';

export interface Tangible {
  getMaterial(): Material | null;
  setMaterial(value: Material | null): void;
}

export function TangibleMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class TangibleMixin extends Base {
    static _mixinName = 'TangibleMixin';
    static persistentFields = ['_materialPath'];

    /**
     * Path to the Material singleton. Resolved lazily on each
     * `getMaterial()` call so HMR replacement is observed immediately.
     */
    public _materialPath: string | null = null;

    public getMaterial(): Material | null {
      if (!this._materialPath) return null;
      return StuffApi.findByTemplatePath<Material>(this._materialPath) ?? null;
    }

    public setMaterial(value: Material | null): void {
      this._materialPath = value?.getTemplatePath() ?? null;
    }
  };
}
