/**
 * CartesianLocation — a Location that lives at `[x,y,z]` inside a
 * `CartesianZone`, with a full Exitable map.
 *
 * Composition: `ExitableMixin(CartesianCoordinatesMixin(VisibleMixin(Location)))`
 *
 * Locations are positioned by integer grid coordinates in a zone's grid.
 * Cardinal exits are derived on demand from grid adjacency (see
 * `CartesianZone.deriveExit`) unless an explicit exit is authored. Flat
 * zones leave `z = 0` and have no `up`/`down` neighbors; vertical zones
 * fill them in.
 *
 * Direction discipline: CartesianLocations only accept exits in one of the
 * 10 canonical cardinal directions (`n`/`s`/`e`/`w`/diagonals/`up`/`down`).
 * Labeled exits (`'portal'`, `'office'`) belong on SphericalLocation or
 * ExitableVessel — those spaces have no grid to be nonsensical against.
 * This keeps reciprocity sensible: every exit on a CartesianLocation has a
 * known inverse.
 */

import { Location } from '../stuff/Location';
import { CartesianCoordinatesMixin } from './CartesianCoordinates';
import { ExitableMixin } from '../boundary/Exitable';
import { VisibleMixin } from '../description/Visible';
import { PostRegistrationMixin } from '../stuff/PostRegistration';
import { NavigationApi } from '../../api/navigation';
import type { CartesianZone } from './CartesianZone';
import type { Exit } from '../boundary/Exit';

const CartesianLocationBase = PostRegistrationMixin(
  ExitableMixin(CartesianCoordinatesMixin(VisibleMixin(Location)))
);

export class CartesianLocation extends CartesianLocationBase {
  public override addExit(exit: Exit): boolean {
    const direction = exit.getDirection();
    if (!NavigationApi.isCardinalDirection(direction)) {
      throw new Error(
        `CartesianLocation.addExit: direction '${direction}' is not a cardinal direction. ` +
          `Cartesian locations only accept n/s/e/w/diagonals/up/down exits.`
      );
    }
    return super.addExit(exit);
  }

  /**
   * Mutual-exit verification: wires inverse pointers for any outbound
   * exit whose destination is already loaded, or marks the exit blocked
   * if the destination's topology doesn't match. Defers anything whose
   * destination hasn't been loaded yet — the destination's own load
   * (or the next traversal) will rerun the check. See
   * `ExitableMixin.verifyOutboundExits`.
   */
  public override async postRegister(_context?: unknown): Promise<void> {
    this.verifyOutboundExits();
  }

  // onDestruct is inherited from ExitableMixin (exit teardown) and
  // chains via super to Location.onDestruct (zone detach). No
  // override needed.

  /**
   * Narrowed override: a `CartesianLocation` lives in a `CartesianZone`
   * by `CartesianZone.addLocation`'s rejection of non-Cartesian
   * locations. The cast happens once here, at the boundary; every
   * caller within (or with a typed reference to) `CartesianLocation`
   * gets the narrowed type for free. If a `CartesianLocation` ever
   * landed in a non-Cartesian zone, `getCellSize` would be undefined
   * and any optional-call would short-circuit — defensive but
   * documented.
   */
  public override getZone(): CartesianZone | null {
    return super.getZone() as CartesianZone | null;
  }

  /**
   * Effective receiving-surface area in m² used by `LightApi.lightAt`
   * to convert accumulated lumens to lux: the walk divides the total
   * flux at this room by `getSizeScale()`. For a Cartesian room the
   * scale is the owning zone's `cellSize` (already in m²). Larger
   * rooms read dimmer for the same total flux. The fallback covers
   * transient test state where the room hasn't been added to a zone
   * yet.
   */
  public getSizeScale(): number {
    return this.getZone()?.getCellSize() ?? 1.0;
  }
}
