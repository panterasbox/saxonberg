/**
 * Crop — a harvested edible, carrying the **grower's mark and a grade**.
 *
 * It is a `Provision` (which composes {@link CraftedMixin}), and that is
 * the whole point: crafting already models "a made thing whose quality
 * is a verdict and whose maker is recorded", and a harvest is a making;
 * a provision already models matter that spoils. Reusing both
 * wholesale rather than inventing a parallel stamp means a crop shows up
 * in the same `renderVerdict()` prose, bands on the same five-rung
 * `Grade`, and is attributable through the same maker's mark as a knife
 * off a bench.
 *
 * Two consequences worth stating, because both are load-bearing and
 * neither needed new code:
 *
 *   - **It is eaten through the shipped metabolism path.** The crop's
 *     material (`/stuff/idea/material/food/root-vegetable`) already declares
 *     `edibility` and nutrients, so `eat` works with no new consumer.
 *   - **The maker is never a parameter.** `CraftedMixin`'s rule is that
 *     the maker derives from the execution context; the harvest verb
 *     honours it, so you cannot hand someone else's name to a crop.
 *
 * What a crop does NOT carry is an *owner*. `CraftedMixin` stamps who
 * grew it; chattel-title stamps who owns it, and those are different
 * questions on different registries. Once chattel-title lands, a
 * harvested crop may want both.
 *
 * See [docs/subsystems/husbandry.md] and [docs/subsystems/crafting.md].
 */

import Provision from "./Provision";
import type { FieldMeta } from "../../lib/mixin";

/**
 * ⭐⭐ A crop is a **`Provision`** — harvested matter that spoils, cures,
 * carries the gauge and the mark. It was `CraftedMixin(DetailedMixin(
 * Thing))` while its rows authored `material:` — a key the Hydrator
 * never wrote — so no crop had a material, none could be eaten, and
 * `lint:perishable` had nothing to read. The day the key was fixed the
 * gate said what a sack of carrots is: matter that rots, on a class that
 * could not. Narrow the HOST, never drop the material.
 */
export default class Crop extends Provision {
  static fieldMeta: FieldMeta = {};
}
