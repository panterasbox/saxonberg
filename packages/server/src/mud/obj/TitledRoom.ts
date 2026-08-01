/**
 * TitledRoom — **a room that stands on ground somebody holds title to**,
 * and remembers what is in it.
 *
 * The generic counterpart of `DormRoom`. Both are rooms whose contents
 * belong to a player, so both must be persistence hosts; the dorm's is a
 * Warren member with a floor and a corridor, and this one is tied to none
 * of that. A yard behind a house, a shopfront, a dock — whatever a
 * `LotHolder` stands up when a lot is sold.
 *
 * ## Why it has to exist
 *
 * A plain `CartesianLocation` is **not persistable**, so nothing it holds
 * would survive a reload and `PersistableApi.restoreOrSeed` throws on it
 * outright.
 *
 * ## Why it rebuilds the stack instead of extending CartesianLocation
 *
 * `CartesianLocation` composes `SingletonMixin` — one live instance per
 * templatePath — because a cartesian room "is uniquely identified by its
 * template path (a `[x,y,z]` cell in a specific zone)". That is right for
 * an authored room and wrong for one cloned once per lot, where N
 * instances legitimately share a template and are told apart by their
 * persistence key. So this composes the same stack **without** the
 * singleton guard and with `PersistableMixin` outermost (the host rule).
 *
 * Nothing narrows on `instanceof CartesianLocation`, and `getSizeScale()`
 * is virtual, so the zone's `cellSize²` light denominator still resolves.
 *
 * ## ⚠ Keying is the CALLER's business — and the shared-template shape
 *     has a known limit
 *
 * A `TitledRoom` does not know how it is identified. `LotHolder` clones
 * one per lot and keys it on the lot's parcel extent today, so N lots
 * share one template.
 *
 * That works for the room's own contents, but it leaves **two things
 * resolving to the district rather than the lot**, because every clone
 * carries the same `templatePath`:
 *
 *   1. Anything reading the parcel *from the room's template path* — the
 *      land-use gate does, so it now prefers the persistence key, which
 *      IS the lot extent. Fixed there.
 *   2. **An avatar's captured placement.** `capturePlacement` records
 *      `container: <templatePath>`, so logging out in your own yard and
 *      back in would land you in a freshly cloned one. The dorm dodges
 *      this by being a `WarrenMember` (the placement records the WARREN
 *      and `admit` re-derives the keyed room); a lot has no warren.
 *
 * Both dissolve if a residence becomes **one minted template each**
 * rather than N clones of one — then the template path IS the identity,
 * placement is exact, and no key is needed at all. This class works
 * unchanged in that model; only `LotHolder` stops passing a key. Until
 * then, treat a titled lot as somewhere you visit rather than somewhere
 * you log out.
 *
 * See [docs/subsystems/smallholding.md] and
 * [docs/subsystems/persistence.md].
 */

import Location from "../lib/stuff/Location";
import { PersistableMixin } from "../lib/persistence/Persistable";
import { PostRegistrationMixin } from "../lib/stuff/PostRegistration";
import { PopulatesMixin } from "../lib/stuff/Populates";
import { DetailedMixin } from "../lib/description/Detailed";
import { PerceptibleMixin } from "../lib/description/Perceptible";
import { ExitableMixin } from "../lib/boundary/Exitable";
import { CartesianCoordinatesMixin } from "../lib/location/CartesianCoordinates";
import { VisibleMixin } from "../lib/description/Visible";

// CartesianLocation's stack, minus SingletonMixin, plus Persistable
// OUTERMOST — its `cleanupOnDestruct` must fire before any inner
// evacuation, and its `applyPopulates` override must wrap `Populates`.
const TitledRoomBase = PersistableMixin(
  PostRegistrationMixin(
    PopulatesMixin(
      DetailedMixin(
        PerceptibleMixin(
          ExitableMixin(CartesianCoordinatesMixin(VisibleMixin(Location))),
        ),
      ),
    ),
  ),
);

export default class TitledRoom extends TitledRoomBase {
  static persistentFields: string[] = [];
}
