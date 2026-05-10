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
import { ExitableMixin } from '../boundary/Exitable';
import { VisibleMixin } from '../description/Visible';
import { PostRegistrationMixin } from '../stuff/PostRegistration';
import type { SphericalZone } from './SphericalZone';

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

  // onDestruct inherited from ExitableMixin → Location chain.

  /**
   * Narrowed override: a `SphericalLocation` lives in a `SphericalZone`
   * by `SphericalZone.addLocation`'s rejection of non-Spherical
   * locations. The cast happens once here, at the boundary; callers
   * with a typed `SphericalLocation` reference get the narrowed type
   * for free. Symmetric with `CartesianLocation.getZone`.
   */
  public override getZone(): SphericalZone | null {
    return super.getZone() as SphericalZone | null;
  }

  /**
   * Effective receiving-surface area used by `LightApi.lightAt` to
   * convert accumulated lumens to lux. v1 commits to the room's own
   * radius (interpreted as m²) — bigger spheres read dimmer for the
   * same total flux. The exact-physics version (full surface area
   * `4πr²` or a cross-section) is deferred until content needs the
   * fidelity; a single scalar keeps the propagation walk simple.
   */
  public getSizeScale(): number {
    return this.getRadius();
  }
}
