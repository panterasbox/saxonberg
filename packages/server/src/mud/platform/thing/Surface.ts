/**
 * Surface — a fixture you set things *on*: a shelf, counter, table, or the
 * bar's back-bar.
 *
 * `SurfacedMixin(DetailedMixin(Thing))` — a `Thing` (Tangible/Visible/
 * Containable, so it lives in a room) that **supports** resting items
 * (`Surfaced`, not `Container` — it doesn't enclose). Items placed on it via
 * `ContainmentApi.placeOn` keep `container = the room` and gain
 * `restingOn = this`, so they're reachable in room scope but render *under*
 * the surface rather than as loose room clutter.
 *
 * Backs the bar's back-bar (the working bottles + tools sit on it, visibly).
 *
 * ⭐ **Fixed in place.** A shelf, a counter, a workbench, a back-bar: all
 * joinery, none of it a good you pocket. A live drive of Dave's Bar
 * walked out carrying THE BACK-BAR — with the house tablet and the tip
 * jar resting on it — because nothing said otherwise. Encumbrance was
 * never going to catch it either: these masses are well inside a
 * person's lift, and what stops you is that the thing is built in.
 * `place` and a remodel still move it; only an agent pocketing it is
 * refused. A row that ships a genuinely portable surface authors
 * `fixedInPlace: false`.
 */

import Thing from '../../lib/stuff/Thing';
import { DetailedMixin } from '../../lib/description/Detailed';
import { SurfacedMixin } from '../../lib/spatial/Surfaced';
import type { FieldMeta } from '../../lib/mixin';

const SurfaceBase = SurfacedMixin(DetailedMixin(Thing));

export default class Surface extends SurfaceBase {
  static fieldMeta: FieldMeta = {};

  constructor() {
    super();
    this.fixedInPlace = true;
  }
}
