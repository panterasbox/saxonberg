/**
 * CartesianLocation — the concrete, instanceable face of the cartesian
 * room substrate (`lib/location/CartesianLocation`), following the
 * same-name split pattern (`NPC`, `Vessel`, `Exit`, `Material`, `Biome`)
 * and mirroring `platform/location/SphericalLocation` on the spherical
 * side.
 *
 * ⭐ The vocabulary is LOCATION, deliberately: a Location belongs to a
 * Zone, and the Zone adopts one of two coordinate systems — cartesian or
 * spherical — which is the whole naming axis. "Room" implies an
 * interior and is reserved for the furnishing archetypes
 * (`FurnishableRoom`), where rooms are genuinely what is meant. This
 * class was briefly named `Room`; that divergence is corrected.
 *
 * The lib base stays free to be what it is — the substrate rooms
 * inherit; templates name this class. The import aliases the base; the
 * module registry keys on class identity, not name.
 */

import CartesianLocationBase from '../../lib/location/CartesianLocation';

export default class CartesianLocation extends CartesianLocationBase {}
