/**
 * Crop — a harvested edible, carrying the **grower's mark and a grade**.
 *
 * It is a plain `Thing` plus {@link CraftedMixin}, which is the whole
 * point: crafting already models "a made thing whose quality is a verdict
 * and whose maker is recorded", and a harvest is a making. Reusing that
 * wholesale rather than inventing a parallel stamp means a crop shows up
 * in the same `renderVerdict()` prose, bands on the same five-rung
 * `Grade`, and is attributable through the same maker's mark as a knife
 * off a bench.
 *
 * Two consequences worth stating, because both are load-bearing and
 * neither needed new code:
 *
 *   - **It is eaten through the shipped metabolism path.** The crop's
 *     material (`/obj/material/food/root-vegetable`) already declares
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

import Thing from "../lib/stuff/Thing";
import { DetailedMixin } from "../lib/description/Detailed";
import { CraftedMixin } from "../lib/craft/Crafted";
import type { FieldMeta } from "../lib/mixin";

const CropBase = CraftedMixin(DetailedMixin(Thing));

export default class Crop extends CropBase {
  static fieldMeta: FieldMeta = {};
}
