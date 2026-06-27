/**
 * GradedReceptacle — a bulk holder that carries a quality {@link Grade}: the
 * working stock bottle.
 *
 * `GradedMixin(BulkableMixin(Thing))` — a `Receptacle` that also has a grade,
 * so the input's quality flows through a craft to the output (`with <brand>`
 * substitution → a better or worse result). Per-bottle construction
 * (material, capacity, amount, grade) is authored in each seed's `data:`.
 */

import Thing from '../../lib/stuff/Thing';
import { BulkableMixin } from '../../lib/bulk/Bulkable';
import { GradedMixin } from '../../lib/craft/Graded';

const GradedReceptacleBase = GradedMixin(BulkableMixin(Thing));

export default class GradedReceptacle extends GradedReceptacleBase {}
