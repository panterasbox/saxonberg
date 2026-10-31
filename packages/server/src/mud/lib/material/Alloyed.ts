/**
 * AlloyedMixin — ⭐ **what is dissolved in THIS piece of metal, and how
 * much.**
 *
 * A `Material` tabulates a composition: what *steel* is, as a kind. That
 * is the right home for the kind, and it is a singleton — one row, one
 * answer, shared by every object made of it. So it cannot say how *your*
 * bar came out of *your* furnace, and for the metal chain that is the
 * only number that matters.
 *
 * ⭐⭐ **Carbon is the one number the whole ferrous ladder turns on**,
 * and every rung of it is the same iron with a different amount of
 * carbon in it:
 *
 * | carbon | what you have | why |
 * |---|---|---|
 * | ~0.05 % | a **bloom** — spongy, slag-shot, solid-state | reduced, never melted |
 * | 0.2–2 % | **steel** | the band, and historically the hardest thing to hit on purpose |
 * | 3–4 % | **cast iron** | carbon LOWERS iron's melting point, so it ran liquid — and it is unforgeable |
 *
 * Nobody authored that ladder. It is one scalar and two thresholds, and
 * the furnace computes the scalar from the charge's fuel ratio and the
 * heat it was held at.
 *
 * ⭐ **Named for what it is, not for its first consumer.** The field is
 * `alloying` and it speaks the same `{materialPath, fraction}`
 * vocabulary `Material.composition` already does, so the tin in a bronze
 * (Stage C) is this field and not a second one. Carbon is simply
 * `fractionOf('/stuff/idea/material/element/carbon')`.
 *
 * ## Where it composes, and what that claims
 *
 * **Metal stock only** — `Ingot`, `MetalCasting`, and the smelting pack's
 * `Bloom`. ⭐ Since 2026-10-17 this is a COMPOSITE: {@link CompositionMixin}
 * (what is dissolved in the piece — also true of a glass or wax or ice
 * lump, which is why the generic `Casting` composes it alone) plus
 * {@link TemperedMixin} (what a heat treatment left — true of metal only).
 * `MixinApi.isAlloyed` means both; ask `isComposition` for a reader that
 * wants only the fractions and `isTempered` for one that wants only the
 * temper.
 *
 * ⚠ **Not on `Weapon` or `Garment`**, and the test is the standing one:
 * if a guard is needed to re-narrow the host set, the host is wrong.
 * A blade's metal is its `Material` ROW — the row the stock's carbon
 * band chose — and every reader downstream (material height, the
 * covering fold, `repair`, `salvage`, recipe matching) reads that row
 * and learns nothing new. Carbon on a blade would force both mint paths
 * to guard `isAlloyed(output)` on every mint, and would claim a linen
 * shirt can alloy.
 *
 * ⚠ **Not a per-instance `composition` override**, either: that collides
 * with what `Material.composition` means and with every reader that
 * walks it. The minor constituents are a separate list, and
 * {@link Alloyed.effectiveMakeup} is where the two meet.
 *
 * See [docs/subsystems/materials-response.md].
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import { CompositionMixin, type Composition } from './Composition';
import { TemperedMixin, type Tempered } from './Tempered';

export type { Temper } from './Tempered';

/** Metal stock: a composition AND a temper. */
export interface Alloyed extends Composition, Tempered {}

/** The two halves composed — the type the composite answers with. */
type AlloyedClass<TBase extends MixinConstructor> = ReturnType<
  typeof TemperedMixin<ReturnType<typeof CompositionMixin<TBase>>>
>;

export function AlloyedMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase): AlloyedClass<TBase> {
  // ⚠ The explicit return type is load-bearing: a class expression that
  // extends a generic mixin call inside a generic function loses the
  // halves' members from its instance type (TS cannot see through the
  // deferred base). The class still carries the `AlloyedMixin` marker the
  // registry walks; `MixinApi.isAlloyed` threads the contract.
  return class AlloyedMixin extends TemperedMixin(CompositionMixin(Base)) {
    static _mixinName: string = 'AlloyedMixin';
  } as unknown as AlloyedClass<TBase>;
}
