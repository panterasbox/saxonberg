/**
 * Location - Described, player-facing spatial container.
 *
 * Location is the standard concrete Place for the world: a room, clearing,
 * deck, plaza, or whatever else a player can be "in" and look at. It just
 * layers Visible onto Place so the location carries a short/long
 * description — everything else (exits, announcements, movement) lives on
 * the `Exitable` composition (`CartesianLocation`, `SphericalLocation`).
 *
 * A specific named location ("Town Square", "the Crystal Cavern") is a
 * special case — those subclasses opt into NamedMixin individually. The
 * default Location has a description but no proper name.
 *
 * Composition: VisibleMixin(Place)
 *
 * Provides:
 * - inventory + getContents() — inherited from Place/Container
 * - shortDescription, longDescription, getShort(), getLong() — from Visible
 */

import { Place } from './Place';
import { VisibleMixin } from '../description/Visible';

const LocationBase = VisibleMixin(Place);

export class Location extends LocationBase {}
