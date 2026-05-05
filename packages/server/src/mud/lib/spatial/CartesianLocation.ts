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
import { ExitableMixin } from './Exitable';
import { VisibleMixin } from '../description/Visible';
import { PostRegistrationMixin } from '../stuff/PostRegistration';
import { NavigationApi } from '../../api/navigation';
import type { Exit } from './Exit';

const CartesianLocationBase = PostRegistrationMixin(
  ExitableMixin(CartesianCoordinatesMixin(VisibleMixin(Location)))
);

export class CartesianLocation extends CartesianLocationBase {
  public override addExit(exit: Exit): boolean {
    if (!NavigationApi.isCardinalDirection(exit.direction)) {
      throw new Error(
        `CartesianLocation.addExit: direction '${exit.direction}' is not a cardinal direction. ` +
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

  // prepareDestroy is inherited from ExitableMixin (exit teardown) and
  // chains via super to Location.prepareDestroy (zone detach). No
  // override needed.
}
