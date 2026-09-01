/**
 * MintedSphericalLocation — **a spherical location whose row describes a
 * KIND of place, not a place.**
 *
 * The spherical half of the minted axis; {@link MintedCartesianLocation}
 * is the cartesian one, and that file carries the full rationale.
 *
 * In short: every ordinary location row IS somewhere, which is why both
 * coordinate-system classes compose `SingletonMixin` — one row, one
 * place, unique by path. A row that describes a *kind* of place, minted
 * many times with per-instance coordinates, needs identity on the
 * instance instead (the D17 `asIdentityPath` channel, which is also what
 * carries it past the singleton guard).
 *
 * Composition — `SphericalLocation`'s, minus `SingletonMixin`:
 *
 *   PostRegistration → Exitable → SphericalCoordinates → Visible
 *     → Location
 *
 * ⚠ Not persistable, deliberately — see the sibling. A minted location
 * keeps no record: its fixtures come from its row on every mint, and
 * anything a player leaves there is chattel, which persists owner-side.
 *
 * **Nothing ships on this class yet**, and it exists anyway: the axis is
 * `{cartesian, spherical} × {authored, minted}` and leaving a quadrant
 * empty is how the cartesian one got filled by `FurnishableRoom` — the
 * only multi-instance location that existed — which quietly gave every
 * minted road and landing a persistence record nothing ever read back.
 * A named empty quadrant is cheaper than the next person inventing a
 * fifth thing.
 */

import Location from "../../lib/stuff/Location";
import { SphericalCoordinatesMixin } from "../../lib/location/SphericalCoordinates";
import { ExitableMixin } from "../../lib/boundary/Exitable";
import { VisibleMixin } from "../../lib/description/Visible";
import { PostRegistrationMixin } from "../../lib/stuff/PostRegistration";

const MintedSphericalLocationBase = PostRegistrationMixin(
  ExitableMixin(SphericalCoordinatesMixin(VisibleMixin(Location))),
);

export default class MintedSphericalLocation extends MintedSphericalLocationBase {}
