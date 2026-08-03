/**
 * Room — the generic concrete `CartesianLocation`.
 *
 * `CartesianLocation` is the room substrate: grid geometry, zone
 * resolution, exits, and three subclasses that specialize it
 * (`Crossing`, `FloodedCell`, `SealedCellar`). Thirty-seven authored
 * rooms cloned it raw because a plain room needs nothing more.
 *
 * Those templates name this class instead, leaving
 * `CartesianLocation` free to be what it is — the base rooms inherit.
 * See docs/plans/lib-obj-taxonomy-plan.md §2.2.
 */

import CartesianLocation from '../../lib/location/CartesianLocation';

export default class Room extends CartesianLocation {}
