/**
 * Location - Described, player-facing spatial container.
 *
 * Location is the standard concrete Place for the world: a room, clearing,
 * deck, plaza, or whatever else a player can be "in" and look at. It
 * layers Named + Visible onto Place so the location carries a name and
 * short/long descriptions — everything else (exits, announcements,
 * movement) lives on the `Exitable` composition (`CartesianLocation`,
 * `SphericalLocation`).
 *
 * Composition: NamedMixin(VisibleMixin(Place))
 *
 * Provides:
 * - inventory + getContents() — inherited from Place/Container
 * - shortDescription, longDescription, getShort(), getLong() — from Visible
 * - name, surname, fullName, alternateNames — from Named
 */

import { Place } from './Place';
import { VisibleMixin } from '../description/Visible';
import { NamedMixin } from '../description/Named';

const LocationBase = NamedMixin(VisibleMixin(Place));

export class Location extends LocationBase {}
