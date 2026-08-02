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
 */

import Thing from '../stuff/Thing';
import { DetailedMixin } from '../description/Detailed';
import { SurfacedMixin } from './Surfaced';
import type { FieldMeta } from '../mixin';

const SurfaceBase = SurfacedMixin(DetailedMixin(Thing));

export default class Surface extends SurfaceBase {
  static fieldMeta: FieldMeta = {};
}
