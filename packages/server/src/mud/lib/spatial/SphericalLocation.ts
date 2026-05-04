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

const SphericalLocationBase = ExitableMixin(
  SphericalCoordinatesMixin(VisibleMixin(Location))
);

export class SphericalLocation extends SphericalLocationBase {}
