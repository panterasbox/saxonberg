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
 * See CLAUDE.md § Instanceable Lives in `obj/`.
 */

import SingletonCartesianLocation from '../../lib/location/SingletonCartesianLocation';

export default class Room extends SingletonCartesianLocation {}
