/**
 * MintedCartesianLocation — **a cartesian cell whose row describes a
 * KIND of place, not a place.**
 *
 * Every other location row IS somewhere: `/world/terminus/registry/office`
 * is the Registry office, and there is one of it. That is why
 * `CartesianLocation` composes `SingletonMixin` — one row = one
 * `[x, y, z]` cell in one zone, and two instances of the same cell is
 * incoherent. The constraint is right and stays.
 *
 * Some rows are not somewhere. `road-segment.yaml` describes *any*
 * reach of Hinkley Lane; the warren mints nine of them as frontage
 * sells, each at its own coordinates. `corridor.yaml` describes a
 * Seznick landing; there is one per occupied floor. The row is a
 * description and the instances are the places — so identity moves off
 * the template path and onto the **minted identity** the D17 split
 * introduced (`asIdentityPath`), which is also what carries them past
 * the singleton guard: it keys on identity, not on template path.
 *
 * Composition — `CartesianLocation`'s, minus `SingletonMixin`:
 *
 *   PostRegistration → Populates → Detailed → Perceptible → Exitable
 *     → CartesianCoordinates → Visible → Location
 *
 * ⚠ **It is NOT persistable, and that is the point.** Before this class
 * existed the only multi-instance location in the game was
 * `FurnishableRoom`, so anything minted many-times-from-one-row had
 * nowhere else to go — and `FurnishableRoom` is `Persistable`.
 * `PersistableMixin.cleanupOnDestruct` fires with
 * `scope = getTemplatePath()`, so every reap wrote a `holder_snapshots`
 * row, and every landing in the building shared ONE scope. Write-only
 * records nothing ever read back, rewritten each time a floor emptied.
 * Circulation reaps constantly by design (outside-in, the moment a
 * reach empties), so that was the hot path.
 *
 * A minted location keeps no record because there is nothing to keep:
 * its fixtures come from its row on every mint (`Populates` stays), and
 * anything a PLAYER leaves there is chattel, which persists owner-side
 * against the owner's estate, not against the room.
 *
 * The spherical half of the axis is {@link MintedSphericalLocation} —
 * the pair exists so the next author on the other coordinate system
 * does not hit this same wall and invent a third thing.
 *
 * **Choosing:** is this row a place (`CartesianLocation` /
 * `SphericalLocation`),
 * a kind of place minted many times (`MintedCartesianLocation` /
 * `MintedSphericalLocation`), or an interior
 * somebody furnishes and whose contents must survive
 * (`FurnishableRoom`)?
 */

import { CartesianCoordinatesMixin } from "../../lib/location/CartesianCoordinates";
import Location from "../../lib/stuff/Location";
import { ExitableMixin } from "../../lib/boundary/Exitable";
import { VisibleMixin } from "../../lib/description/Visible";
import { PerceptibleMixin } from "../../lib/description/Perceptible";
import { DetailedMixin } from "../../lib/description/Detailed";
import { PostRegistrationMixin } from "../../lib/stuff/PostRegistration";
import { PopulatesMixin } from "../../lib/stuff/Populates";
import type { FieldMeta } from "../../lib/mixin";

const MintedCartesianLocationBase = PostRegistrationMixin(
  PopulatesMixin(
    DetailedMixin(
      PerceptibleMixin(
        ExitableMixin(CartesianCoordinatesMixin(VisibleMixin(Location))),
      ),
    ),
  ),
);

export default class MintedCartesianLocation extends MintedCartesianLocationBase {
  static fieldMeta: FieldMeta = {
    coords: { persistent: true },
    extent: { persistent: true, authorable: true },
  };
}
