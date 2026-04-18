/**
 * Location - Described, player-facing spatial container.
 *
 * Location is the standard concrete Place for the world: a room, clearing,
 * deck, plaza, or whatever else a player can be "in" and look at. It adds
 * Visible to Place so the location can be examined, and carries the
 * traditional name/description fields used by clients and templates.
 *
 * Composition: VisibleMixin(Place)
 *
 * Provides:
 * - name: string — title shown to clients (e.g., "The Void")
 * - description: string — prose shown on look
 * - inventory + getContents() — inherited from Place/Container
 * - shortDescription, longDescription, getShort(), getLong() — from Visible
 *
 * Note: `name` and `description` are Location's own fields, kept for
 * template/data compatibility. VisibleMixin's shortDescription/longDescription
 * are also available for uses that want the standard Visible shape.
 */

import { Place } from '../stuff/Place';
import { VisibleMixin } from '../description/Visible';

const LocationBase = VisibleMixin(Place);

export class Location extends LocationBase {
  static persistentFields = ['name', 'description'];

  name: string = '';
  description: string = '';
}
