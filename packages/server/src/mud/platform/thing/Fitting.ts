/**
 * Fitting — a bare fixture things are placed on: a shelf, a counter, a
 * table, a rail, a hook, the bar's back-bar.
 *
 * `PlacingMixin(Good)` — a `Thing` (Tangible/Visible/
 * Containable, so it lives in a room) that **holds placed items**
 * (`Placing`, not `Container` — it doesn't enclose). Items placed on it
 * via `ContainmentApi.place` keep `container = the room` and gain a
 * placement pair naming this host, so they're reachable in room scope
 * but render *under* the fitting rather than as loose room clutter.
 *
 * ⭐ A row decides WHICH way of sitting it offers (`placements: [on]` by
 * default, `[from]` for a hook) and how airy it is (`airExposure`) — a
 * shelf, a meat hook and a wire line are all this class.
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
 * refused. A row that ships a genuinely portable fitting authors
 * `fixedInPlace: false`.
 */

import Good from '../../lib/stuff/Good';
import { PlacingMixin } from '../../lib/spatial/Placing';
import type { FieldMeta } from '../../lib/mixin';

const FittingBase = PlacingMixin(Good);

export default class Fitting extends FittingBase {
  static fieldMeta: FieldMeta = {};

  constructor() {
    super();
    this.fixedInPlace = true;
  }
}
