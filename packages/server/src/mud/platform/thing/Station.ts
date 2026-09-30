/**
 * Station — a built-in work surface: a trade's bench, flue, trough or
 * back-counter. `PlacingMixin(Thing)`.
 *
 * ⭐⭐ **The class that was missing, found by the base-class narrowing.**
 * Every one of these used to extend {@link Fitting}, and `Fitting` is two
 * different things wearing one name:
 *
 * - **a piece of furniture you BUY** — a table, a shelf, a rail. The
 *   general store's furnishings line stocks `/stuff/thing/fixture/table`
 *   and sells it, so it is somebody's chattel and `Fitting` rightly sits
 *   on `Good`.
 * - **a station built into the premises** — a smoke chimney, a salting
 *   trough, a bar's back-station. Nobody buys the flue; it is masonry,
 *   it is part of the shop, and its ownership is the PARCEL's.
 *
 * Both hold placed items, which is the one behaviour they share, and it
 * is a mixin — so this class composes that mixin on the matter root and
 * claims nothing else. The narrowing's own test caught the conflation:
 * a first attempt moved `Fitting` itself onto `Thing`, and the
 * general-store standup failed on a TABLE that could no longer be
 * stamped. ⭐ **The failing assertion was the design review.**
 *
 * `fixedInPlace` in the constructor for the same reason `Fitting` sets
 * it: `place` and a remodel still move it; only an agent pocketing it is
 * refused.
 */

import Thing from '../../lib/stuff/Thing';
import { PlacingMixin } from '../../lib/spatial/Placing';
import type { FieldMeta } from '../../lib/mixin';

const StationBase = PlacingMixin(Thing);

export default class Station extends StationBase {
  static fieldMeta: FieldMeta = {};

  constructor() {
    super();
    this.fixedInPlace = true;
  }
}
