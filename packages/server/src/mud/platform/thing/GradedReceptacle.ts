/**
 * GradedReceptacle — a bulk holder that carries a quality {@link Grade} AND
 * the maker's mark: the working stock bottle.
 *
 * Crafted (which composes Graded) rather than merely Graded since the
 * fermentation grade seam (W0/D9): a bottle filled from a graded batch
 * carries the batch's band and its maker — the mark is how a `fine`
 * gin stays attributable on the rail. Store-bought empties default to
 * an empty mark.
 *
 * `BrandedMixin(CraftedMixin(BulkableMixin(Thing)))` — a `Receptacle` that also
 * has a grade, so the input's quality flows through a craft to the output
 * (`with <brand>` substitution → a better or worse result). Per-bottle
 * construction (material, capacity, amount, grade, brand) is authored in each
 * seed's `data:`.
 *
 * The `Branded` layer makes the back-bar a corpo battlefield: set `_brandKey`
 * on a bottle and the brand→corpo mark ("a product of Veshko") renders for
 * free via `markupAugmenters`. This is the booze-as-bulk + brand composition
 * corpo.md reserved for the bar build; `Mml.augment` collects every mixin's
 * augmenters up the chain, so the brand-mark line stacks with the bulk
 * contents line rather than clobbering it. An unset `_brandKey` is a no-op —
 * an unbranded working bottle (e.g. fresh-squeezed lime).
 */

import Thing from '../../lib/stuff/Thing';
import { BulkableMixin } from '../../lib/bulk/Bulkable';
import { CraftedMixin } from '../../lib/craft/Crafted';
import { BrandedMixin } from '../../lib/corpo/Branded';
import type { Grade } from '../../lib/craft/Grade';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { MarkupAugmenter } from '../../api/mml';
import { MixinApi } from '../../api/mixin';

/**
 * The maker's mark on the rail (fermentation W7/D9): a MARKED bottle
 * appends its quality verdict — band word + maker attribution — to its
 * look. An unmarked store bottle contributes nothing; provenance
 * carries worth, and the mark is how a `fine` gin stays somebody's.
 */
function verdictAugmenter(text: string, host: Stuff, _viewer: Stuff): string {
  if (!MixinApi.isCrafted(host)) return text;
  if (host.getMaker() === '') return text;
  const verdict = host.renderVerdict();
  return text && text.length > 0 ? `${text}\n\n${verdict}` : verdict;
}

const GradedReceptacleBase = BrandedMixin(CraftedMixin(BulkableMixin(Thing)));

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
