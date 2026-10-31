/**
 * Compartment — ⭐ **a room of a ship** (harbors P20, first half; B1).
 *
 * Every ship room row names this class — a kind's deck, cabin and hold
 * (`/stuff/location/ship/<kind>/<leaf>`, minted keyed by her warren) and an
 * authored ship's own rooms (the Hesper's, the regulars', the Ostrander's,
 * loaded by their rows). One kind of ship room; how it is instanced is the
 * key, not the class.
 *
 * - **A shore of her sea** — `Shore` so a deck that cites the sea over her
 *   side (`waters: { sea: … }`, stamped by her warren at wake for a kind's
 *   deck) reads it as the Hesper's deck always has: `look sea`, a bucket
 *   over the side, the rod.
 * - **Her own record** — `Persistable`, keyed `(row, <serial>/<leaf>)` for a
 *   kind, by its row for an authored ship.
 * - **Her warren's member** — `WarrenMember`, so *which ship is this
 *   room?* is its warren's answer, and so an interactive arriving or
 *   leaving pokes the warren's population coalescer (the witness below),
 *   which is what puts a ship of a kind to sleep whole.
 *
 * ⛔ Not `Singleton` (it is `Location`, not `Locale`): one smack's deck row
 * is every smack's deck. An authored ship's room is still one instance per
 * row because it is loaded by `StuffApi.singleton`, exactly as a `Shore` is.
 *
 * ⚠ **Not yet a water place (B1, re-planned).** The plan composes
 * `WaterPlace(Swimmable(…))` here so a room can flood; but a water place
 * with no flood read is a place you SWIM in (`stateNow()` with no `water`
 * answers `swimming`), and fifty-odd readers of `isWaterPlace` would treat
 * everyone on deck as in the water. The composition lands with the flood
 * reads that make it honest (B5: `levelNow`/`depthNow`/`stateNow` asking
 * `ship.floodDepthAt(leaf)`); until then a compartment is a dry shore place
 * of her sea, which is exactly what the rooms it replaces were.
 */

import Location from './Location';
import { ShoreMixin } from '../../lib/location/Shore';
import { PersistableMixin } from '../../lib/persistence/Persistable';
import { WarrenMemberMixin } from '../../lib/location/WarrenMember';
import { MixinApi } from '../../api/mixin';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { Containable } from '../../lib/spatial/Containable';

export default class Compartment extends ShoreMixin(
  PersistableMixin(WarrenMemberMixin(Location)),
) {
  /**
   * Population witness (the `PersistentLocation` shape): an interactive
   * arriving or leaving pokes her warren, whose reconcile is what puts her
   * to sleep whole. A no-op before her warren has adopted the room.
   */
  public onContainableAdded(thing: Stuff & Containable): void {
    this.notePopulation(thing);
  }

  public onContainableRemoved(thing: Stuff & Containable): void {
    this.notePopulation(thing);
  }

  private notePopulation(thing: Stuff & Containable): void {
    if (!MixinApi.isHasInteractive(thing as unknown as Stuff)) return;
    this.getWarren()?.notifyPopulationChange(this as unknown as Stuff & Location);
  }
}
