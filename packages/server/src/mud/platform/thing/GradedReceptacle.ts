/**
 * GradedReceptacle — a bulk holder that carries a quality {@link Grade} AND
 * the maker's mark: the working stock bottle.
 *
 * Crafted (which composes Graded): the bottle has a making of its own.
 * The batch it holds carries ITS band and maker on the payload
 * (matter-model-overlaps D2) — the mark is how a `fine` gin stays
 * attributable on the rail, and the verdict below renders it.
 *
 * `BrandedMixin(CraftedMixin(BulkableMixin(Good)))` — a `Receptacle` that also
 * has a grade, so the input's quality flows through a craft to the output
 * (`with <brand>` substitution → a better or worse result). Per-bottle
 * construction (material, capacity, amount, grade, brand) is authored in each
 * seed's `data:`.
 *
 * The `Branded` layer makes the back-bar a corpo battlefield: set `brand`
 * on a bottle and the brand→corpo mark ("a product of Veshko") renders for
 * free via `markupAugmenters`. This is the booze-as-bulk + brand composition
 * corpo.md reserved for the bar build; `Mml.augment` collects every mixin's
 * augmenters up the chain, so the brand-mark line stacks with the bulk
 * contents line rather than clobbering it. An unset `brand` is a no-op —
 * an unbranded working bottle (e.g. fresh-squeezed lime).
 */

import Good from '../../lib/stuff/Good';
import { BulkableMixin } from '../../lib/bulk/Bulkable';
import { CraftedMixin } from '../../lib/craft/Crafted';
import { BrandedMixin } from '../../lib/corpo/Branded';
import { ThermalMixin } from '../../lib/thermal/Thermal';
import type { Grade } from '../../lib/craft/Grade';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { MarkupAugmenter } from '../../api/mml';
import { MixinApi } from '../../api/mixin';

/**
 * The bottle's OWN maker's mark (fermentation D9): a bottle somebody made
 * says so once it is in use — band word + maker attribution. ⭐ What is IN
 * it carries its own verdict, off the batch's payload (the holder's
 * `batchVerdictAugmenter`, matter-model-overlaps D2): a store bottle
 * refilled with somebody's fine gin reads as that somebody's gin, and the
 * bottle as the glassblower's. An unmarked bottle contributes nothing;
 * provenance carries worth.
 */
function verdictAugmenter(text: string, host: Stuff, viewer: Stuff): string {
  if (!MixinApi.isCrafted(host)) return text;
  if (host.getMaker() === '') return text;
  // ⭐ Quiet on an unused vessel (client-surface D10): an empty, unsoiled
  // bottle has nothing to be judged on yet.
  const used =
    (MixinApi.isBulkable(host) && host.hasInteriorBulk() && !host.getBulk('interior').isEmpty()) ||
    (MixinApi.isServiceable(host) && host.isSoiled());
  if (!used) return text;
  const verdict = host.renderVerdict(viewer);
  return text && text.length > 0 ? `${text}\n\n${verdict}` : verdict;
}

// ⭐ ThermalMixin OUTER of Bulkable — the `Receptacle` rule: a holder's
// heat capacity derives from its contents, so more in it means slower
// cooling. What composing it CLAIMS is that a graded receptacle has a
// temperature, and every one of them should: a bottle in a cellar is
// cold, and a bottled ale's freshness gauge has been reading a default
// holder temperature until now. `Bottle` composes `SealableMixin`, so a
// corked one also picks up the `vacuum` barrier and its hours-long tau —
// the Flask rule, and correct.
//
// ⚠ `VesselKindMixin` is deliberately NOT added here: `Bottle` already
// wraps it, and a double composition is the bug.
const GradedReceptacleBase = ThermalMixin(
  BrandedMixin(CraftedMixin(BulkableMixin(Good))),
);

export default class GradedReceptacle extends GradedReceptacleBase {
  static markupAugmenters: MarkupAugmenter[] = [verdictAugmenter];

  // TS re-surface of the inner GradedMixin's members — present at
  // runtime, but an anonymous mixin base's members don't surface
  // through CraftedMixin (the documented Crafted.ts cast quirk).
  // `declare` only: no runtime slots, no behavior change.
  declare getGradeBand: () => string;
  declare setGradeBand: (value: string) => void;
  declare getGrade: () => Grade;
  declare setGrade: (value: Grade) => void;
}
