/**
 * SingletonCartesianLocation — the instanceable face of the grid
 * location that **opts into one live instance per row.**
 *
 * The vocabulary is LOCATION: a Location belongs to a Zone, and the Zone
 * adopts one of two coordinate systems. "Room" implies an interior and
 * is reserved for {@link FurnishableRoom}, the interior somebody
 * furnishes — this class was called `Room` and it was never one; a city
 * crossing, a station hall and a bank frontage are not rooms.
 *
 * Opt into the restriction wherever **one row IS one place**. The guard
 * then catches a second `clone()` of the Registry office that would
 * otherwise silently produce two of them sharing a template path.
 *
 * ⚠ The mixin SUBTRACTS, which is why this is the marked name and
 * `CartesianLocation` is the default: a class without `SingletonMixin`
 * backs singleton templates perfectly well (`StuffApi.singleton(path)`
 * get-or-creates, which is how an eager exit resolves its destination),
 * while a class with it can back ONLY singleton templates. Reach for
 * plain `CartesianLocation` when a row describes a KIND of place minted
 * many times — a reach of road, a landing per floor.
 */

import SingletonCartesianLocationBase from '../../lib/location/SingletonCartesianLocation';

export default class SingletonCartesianLocation extends SingletonCartesianLocationBase {}
