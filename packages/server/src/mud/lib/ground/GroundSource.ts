/**
 * GroundSourceMixin — *this Idea can say what the ground is made of at a
 * spot and a depth.*
 *
 * ⭐⭐ **The seam that lets the kernel ask the ground a question it cannot
 * import the answer to.** A floor on grade wants to know what is under it,
 * and the two things that know are both pack-owned: `Deposit` (the
 * stratigraphic column) and `GroundCharacter` (the surface texture), which
 * the ground build moves into `/system/ground`. The kernel cannot import
 * either — and the reverse (a pack adding a field to a kernel class) is
 * the failure already recorded in `SpatialZone.ts`, where `deposit` and
 * `groundCharacter` sit as authorable strings the kernel interprets
 * nowhere.
 *
 * So the kernel declares the *capability* and the pack implements it, the
 * `SkyExposedMixin` / `RadioactiveMixin` shape: a trait narrowed through
 * `MixinApi.isGroundSource` with one method behind it.
 *
 * ## What crosses the seam
 *
 * The **address**, not a seed. Each model derives its own seed from the
 * address through `lib/Seeded.ts`, so neither side has to agree with the
 * other about mixing — and a model that wants a different resolution than
 * the floor asked at can still answer from the same string.
 *
 * ## Degrading honestly
 *
 * With the ground pack absent every citation is unreadable, rung 3 of the
 * floor's ladder yields `null`, and the room falls through to its
 * archetype default. Nothing errors and nothing pretends: a realm that
 * ships no ground model simply has floors whose material was chosen rather
 * than derived.
 */

import type { MixinConstructor } from '../mixin';

/** Public shape added by GroundSourceMixin. */
export interface GroundSource {
  /**
   * What is the ground made of at this spot and depth?
   *
   * @param spot `[x, y]` in metres, in the realm's own frame — the
   *   horizontal position the floor is asking about.
   * @param zM Vertical position in metres; `0` is the collar (grade),
   *   negative is below it. A source answers `null` outside the band it
   *   knows: a surface character knows its topsoil and nothing deeper, a
   *   column knows everything from the collar down.
   * @param address The place's rooted address. Carried so a source can
   *   derive its own seed; never a seed itself.
   * @returns A **Material template path**, or `null` for *I do not know
   *   what is there* — which is not *there is nothing there*.
   */
  groundMaterialAt(
    spot: readonly [number, number],
    zM: number,
    address: string
  ): string | null;
}

export function GroundSourceMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class GroundSourceMixin extends Base implements GroundSource {
    static _mixinName = 'GroundSourceMixin';

    /**
     * The permissive default: *I know nothing here.* A composer that
     * forgets to override answers `null`, which reads to the floor exactly
     * as an unauthored zone does — so the failure mode of a half-written
     * source is a fallthrough, never a wrong material.
     *
     * @hook Override on the composing Idea. Return a Material template
     *   path when the model knows what is at `(spot, zM)`, `null` when the
     *   question is outside what it models.
     */
    public groundMaterialAt(
      spot: readonly [number, number],
      zM: number,
      address: string
    ): string | null {
      void spot;
      void zM;
      void address;
      return null;
    }
  };
}
