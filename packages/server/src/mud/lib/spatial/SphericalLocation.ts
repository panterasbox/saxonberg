/**
 * SphericalLocation — a Location shaped as a sphere of given radius,
 * positioned by focus inside a `SphericalZone`.
 *
 * Composition: `ExitableMixin(SphericalCoordinatesMixin(VisibleMixin(Location)))`
 *
 * Spherical zones have no implicit adjacency — every exit on a
 * SphericalLocation is explicit and semantic (e.g., `'office'`, `'plaza'`).
 * `CartesianZone`-style derivation returns nothing here.
 */

import { Location } from '../stuff/Location';
import { SphericalCoordinatesMixin } from './SphericalCoordinates';
import { ExitableMixin } from './Exitable';
import { VisibleMixin } from '../description/Visible';
import { PostRegistrationMixin } from '../stuff/PostRegistration';

const SphericalLocationBase = PostRegistrationMixin(
  ExitableMixin(SphericalCoordinatesMixin(VisibleMixin(Location)))
);

export class SphericalLocation extends SphericalLocationBase {
  /**
   * Mutual-exit verification — same as CartesianLocation. The verifier
   * skips non-cardinal directions, so spherical exits authored with
   * semantic labels (`'office'`, `'plaza'`) are no-ops here; they rely
   * on `addBidirectionalExit` for inverse wiring at construction time.
   */
  public override async postRegister(_context?: unknown): Promise<void> {
    this.verifyOutboundExits();
  }

  // prepareDestroy inherited from ExitableMixin → Location chain.

  /**
   * Spatial scale used by `LightApi.bandAt`. For a spherical room
   * the scale is the room's own radius (the focus index of a
   * spherical zone is purely positional). A bigger sphere means
   * the same total light reads dimmer.
   */
  public getSizeScale(): number {
    return this.getRadius();
  }
}
