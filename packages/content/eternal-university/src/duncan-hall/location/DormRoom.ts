/**
 * DormRoom — one leased dorm room. The shared, multi-instance persistence
 * host: many live rooms clone from THIS one template yet keep distinct
 * persisted state (the tenant's theme prose + its fixtures' captured prose),
 * keyed by the unit's parcel extent (D1) — the `(scope, key)` identity every
 * persistable host has, no marker needed. The room's born-with fixtures are
 * declared as **data** (`props:` in its seed, not code): the spine retains
 * the specs at hydration, and `DormWarren` drives seed-vs-restore with the
 * unit key — `seedBornWith` (laying the fixtures down once) on the no-record
 * branch, `materialize` (restoring captured prose) thereafter.
 *
 * A non-coordinate `Location` (a clone can't hold fixed grid coords; it
 * hangs off its floor corridor by a live-ref return exit) with the member +
 * description surface, `PersistableMixin` outermost, `StagedMixin` inner
 * (so the spine's `seedBornWith` reaches its applier via `super`):
 *
 *   Persistable → WarrenMember → Exitable → Detailed
 *     → Visible → Staged → Location  (Location carries Container/Adornable)
 *
 * The Warren coordinates instances; the room stays an ordinary containment
 * root. No `SingletonMixin` (repeated clones are the point), no `Named` (a
 * generic labelled room). Its prose fields (`shortDescription` /
 * `longDescription` on Visible, `details` on Detailed) are the theme
 * overlay's target — already persistent, so the spine captures/restores them
 * with no new field work.
 */

import FurnishableRoom from '@saxonberg/server/mud/platform/location/FurnishableRoom';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';

// ⭐⭐ **A `DormRoom` IS a `FurnishableRoom`, and that class's own
// docstring says so** — *"That the shipped dorm room already had
// exactly this stack is the reason to mirror it rather than re-derive:
// `DormRoom` IS a room archetype (a bedsit — bed, desk, footlocker,
// tap), and it has been carrying the correct composition all along."*
// `FurnishableRoom` was DERIVED from this class and then the two
// drifted by one mixin.
//
// ⚠ The population witness below was duplicated verbatim in both
// files, and this class had not gained the `Perceptible` that
// `FurnishableRoom` added when `lint:presentation` found ten rows
// authoring keywords into a void — so `dormroom.yaml`'s
// `keywords: [room, dorm]` was dead until the narrowing put the
// description mixins on the `Location` root (L0).
//
// Extending it keeps `SCOPE`/`ADDRESS` (which are this locality's) and
// gains `Reserved` + `postedAs`, which a bedsit wants anyway.
export default class DormRoom extends FurnishableRoom {
  /** The shared clone-namespace path — the D1 record `scope`. */
  static readonly SCOPE = '/world/terminus/eternal/duncan-hall/location/dormroom';

  /**
   * The dorm's address in the addressing namespace — content knows its
   * own address (matches the `_address` the duncan-hall room seeds
   * declare). The provision-time domicile stamp writes this onto the
   * tenant (the civics residency substrate).
   */
  static readonly ADDRESS = 'terminus/city/campus/duncan-hall';

  /**
   * Prose rides the Visible/Detailed slices; the Warren back-ref + exits are
   * runtime; the theme overlay + fixtures ride the spine's slices. The
   * born-with fixtures (Bed / Desk / Footlocker) are declared as `props:`
   * DATA in the seed and laid down once by the spine's `seedBornWith` — no
   * imperative install code lives here.
   */
  static fieldMeta: FieldMeta = {};

}

