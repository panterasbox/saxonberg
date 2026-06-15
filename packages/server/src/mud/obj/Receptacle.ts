/**
 * Receptacle — a fluid-only liquid holder: `BulkableMixin(Thing)`.
 *
 * `Thing` already contributes Visible (description), Perceptible
 * (keywords, so `fill thermos` resolves it by name), Tangible (wall
 * material), and Containable (it can be carried and set down).
 * `BulkableMixin` adds the interior bulk slot — the liquid it holds.
 *
 * Named `Receptacle`, not `Vessel`, to stay clear of the existing
 * `lib/stuff/Vessel` (an enterable, portable-by-shape *container* — a
 * boat / wagon). A Receptacle is the opposite end: it holds bulk, not
 * discrete contents.
 *
 * Deliberately NOT a discrete `Container`: the demo receptacles hold
 * only liquid (no pen-in-the-thermos). The combined Container +
 * Bulkable case (an ice cube floating in water) is a documented future
 * content choice, not built here. Per-receptacle construction —
 * capacity, the `closure` retention level, and the unbounded-source
 * dial — is authored in each seed's `data:` block, not subclassed.
 *
 * This one class backs every demo holder (coffee urn, thermos, mug,
 * open colander); they differ only in authored data.
 */

import Thing from '../lib/stuff/Thing';
import { BulkableMixin } from '../lib/bulk/Bulkable';
import { ThermalMixin } from '../lib/thermal/Thermal';

// ThermalMixin outer of Bulkable: a fluid holder's Thermal capacity
// derives from its contents (more liquid → larger C → slower cooling),
// so the coffee in any receptacle has a real, drifting temperature. An
// open holder (a mug) has no sealing barrier → it cools in minutes; the
// sealable Flask switches to a vacuum barrier when closed (τ in hours).
const ReceptacleBase = ThermalMixin(BulkableMixin(Thing));

export default class Receptacle extends ReceptacleBase {}
