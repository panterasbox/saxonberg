/**
 * RadioactiveMixin — capability for Materials whose nuclei undergo
 * spontaneous decay.
 *
 * **Why a mixin and not a tag.** Most material classification —
 * `metal`, `igneous`, `organic`, `fantasy` — is pure metadata: a flat
 * string label that downstream code intersects. Radioactivity is
 * different: it carries a non-trivial behavioral surface (half-life
 * arithmetic, decay-product cross-references, decay-mode taxonomy)
 * that's only meaningful for a sparse minority of Materials. A
 * `RadioactiveMixin` lets those Materials carry the full surface;
 * narrowing via `MixinApi.isRadioactive(m)` threads the typed methods
 * into the call site without contaminating the base `Material` class
 * with fields that are meaningless for everything else.
 *
 * **Why this is intrinsic.** Phase of matter (solid/liquid/gas) is
 * state-dependent — iron is solid at room temp, liquid at 1538 °C.
 * Phase doesn't earn a mixin. Radioactivity is a property of the
 * nucleus itself: uranium-238 is radioactive whether it's a solid
 * ingot, a liquid hexafluoride, or a gas. Decay rate is invariant to
 * state.
 *
 * **Pattern.** A capability mixin like this composes onto `Material`
 * as a subclass declaration:
 *
 * ```typescript
 * export class RadioactiveMaterial extends RadioactiveMixin(Material) {}
 * ```
 *
 * Templates that need the capability use `class:
 * /lib/material/RadioactiveMaterial`. Templates that don't stay on
 * plain `class: /lib/material/Material`. Future capability mixins
 * (`SuperconductorMixin`, `PiezoelectricMixin`, …) layer the same
 * way — one subclass per composed combination.
 *
 * **Cross-reference shape (LOCKED).** `_decayProductPath` is a path
 * string, not a serialized Material. `getDecayProduct()` resolves on
 * each call via `StuffApi.findByTemplatePath` — same HMR-safe pattern
 * as every other Material cross-reference.
 */

import type { MixinConstructor } from '../mixin';
import { StuffApi } from '../../api/stuff';
import type Material from './Material';

/**
 * Radioactive decay modes. Lower-division pedagogy ships the four
 * common types; rarer modes (electron capture, internal conversion,
 * cluster decay) are content-extensions when the curriculum needs
 * them.
 */
export type DecayMode =
  | 'alpha'
  | 'beta-minus'
  | 'beta-plus'
  | 'gamma'
  | 'spontaneous-fission'
  | 'electron-capture';

export interface Radioactive {
  /** Half-life in years. Use the more readable unit for very-short-lived materials at the presentation layer. */
  getHalfLife(): number;
  setHalfLife(value: number): void;
  /** Decay mode. See `DecayMode` for the v1 vocabulary. */
  getDecayMode(): DecayMode | '';
  setDecayMode(value: DecayMode | ''): void;
  /**
   * Material this decays into, or `null` when the decay product isn't
   * modeled in the current content (e.g., the chain isn't fully
   * authored). Cross-reference resolves lazily.
   */
  getDecayProduct(): Material | null;
  setDecayProduct(value: Material | null): void;
}

export function RadioactiveMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class RadioactiveMixin extends Base {
    static _mixinName = 'RadioactiveMixin';
    static persistentFields = ['halfLife', 'decayMode', '_decayProductPath'];

    /**
     * Half-life in years. 0 default reads as "not yet authored" — the
     * mixin is composed onto Materials whose halfLife is meaningful;
     * a zero value during testing should round-trip without crashing.
     */
    public halfLife: number = 0;

    /**
     * Empty default for the same reason as `halfLife`. Production
     * materials should set this in the seed `data` block.
     */
    public decayMode: DecayMode | '' = '';

    /**
     * Path to the daughter Material singleton. Resolves lazily on
     * each `getDecayProduct()` call via `findByTemplatePath`.
     */
    public _decayProductPath: string | null = null;

    public getHalfLife(): number { return this.halfLife; }
    public setHalfLife(value: number): void { this.halfLife = value; }

    public getDecayMode(): DecayMode | '' { return this.decayMode; }
    public setDecayMode(value: DecayMode | ''): void { this.decayMode = value; }

    public getDecayProduct(): Material | null {
      if (!this._decayProductPath) return null;
      return (
        StuffApi.findByTemplatePath<Material>(this._decayProductPath) ?? null
      );
    }

    public setDecayProduct(value: Material | null): void {
      this._decayProductPath = value?.getTemplatePath() ?? null;
    }
  };
}
