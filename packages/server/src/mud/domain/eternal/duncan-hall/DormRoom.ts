/**
 * DormRoom — one leased dorm room. The shared, multi-instance persistence
 * host: many live rooms clone from THIS one template yet keep distinct
 * persisted state (the tenant's theme prose + its fixtures' captured prose),
 * keyed by the unit's parcel extent (D1) — the `(scope, key)` identity every
 * persistable host has, no marker needed. The room's born-with fixtures are
 * declared as **data** (`populates:` in its seed, not code): the spine retains
 * the specs at hydration, and `DormWarren` drives seed-vs-restore with the
 * unit key — `seedBornWith` (laying the fixtures down once) on the no-record
 * branch, `materialize` (restoring captured prose) thereafter.
 *
 * A non-coordinate `Location` (a clone can't hold fixed grid coords; it
 * hangs off its floor corridor by a live-ref return exit) with the member +
 * description surface, `PersistableMixin` outermost, `PopulatesMixin` inner
 * (so the spine's `seedBornWith` reaches its applier via `super`):
 *
 *   Persistable → WarrenMember → PostRegistration → Exitable → Detailed
 *     → Visible → Populates → Location  (Location carries Container/Adornable)
 *
 * The Warren coordinates instances; the room stays an ordinary containment
 * root. No `SingletonMixin` (repeated clones are the point), no `Named` (a
 * generic labelled room). Its prose fields (`shortDescription` /
 * `longDescription` on Visible, `details` on Detailed) are the theme
 * overlay's target — already persistent, so the spine captures/restores them
 * with no new field work.
 */

import Location from '../../../lib/stuff/Location';
import { PersistableMixin } from '../../../lib/persistence/Persistable';
import { PopulatesMixin } from '../../../lib/stuff/Populates';
import { WarrenMemberMixin, type WarrenMember } from '../../../lib/location/WarrenMember';
import { VisibleMixin } from '../../../lib/description/Visible';
import { DetailedMixin } from '../../../lib/description/Detailed';
import { ExitableMixin } from '../../../lib/boundary/Exitable';
import { PostRegistrationMixin } from '../../../lib/stuff/PostRegistration';
import { MixinApi } from '../../../api/mixin';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { Container } from '../../../lib/spatial/Container';
import type { Containable } from '../../../lib/spatial/Containable';
import type { FieldMeta } from '../../../lib/mixin';

const DormRoomBase = PersistableMixin(
  WarrenMemberMixin(
    PostRegistrationMixin(
      ExitableMixin(DetailedMixin(VisibleMixin(PopulatesMixin(Location)))),
    ),
  ),
);

/** Structural view of the DormWarren surface the population witness pokes. */
interface DormWarrenView {
  notifyPopulationChange(room: Stuff & Container): void;
}

export default class DormRoom extends DormRoomBase {
  /** The shared clone-namespace path — the D1 record `scope`. */
  static readonly SCOPE = '/domain/eternal/duncan-hall/dormroom';

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
   * born-with fixtures (Bed / Desk / Footlocker) are declared as `populates:`
   * DATA in the seed and laid down once by the spine's `seedBornWith` — no
   * imperative install code lives here.
   */
  static fieldMeta: FieldMeta = {};

  /**
   * Population witness (folded in — no separate mixin, since `DormRoom` is a
   * concrete class). An arrival/departure of a `HasInteractive` occupant
   * pokes the Warren's population-change coalescer, which drives
   * `reconcile`'s dormancy-reap. (Dorms don't population-bud, so — unlike the
   * lounge — there is no over-capacity re-seat here.)
   */
  public onContainableAdded(thing: Stuff & Containable): void {
    this.notePopulation(thing);
  }

  public onContainableRemoved(thing: Stuff & Containable): void {
    this.notePopulation(thing);
  }

  private notePopulation(thing: Stuff & Containable): void {
    if (!MixinApi.isHasInteractive(thing as unknown as Stuff)) return;
    const warren = (this as unknown as WarrenMember).getWarren() as unknown as
      | DormWarrenView
      | null;
    if (!warren) return;
    warren.notifyPopulationChange(this as unknown as Stuff & Container);
  }
}
