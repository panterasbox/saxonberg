/**
 * GradedReceptacle — a bulk holder that carries a quality {@link Grade}: the
 * working stock bottle.
 *
 * `BrandedMixin(GradedMixin(BulkableMixin(Thing)))` — a `Receptacle` that also
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
import { GradedMixin } from '../../lib/craft/Graded';
import { BrandedMixin } from '../../lib/corpo/Branded';

const GradedReceptacleBase = BrandedMixin(GradedMixin(BulkableMixin(Thing)));

export default class GradedReceptacle extends GradedReceptacleBase {}
