/**
 * Place - Base class for spatial containers in the Stuff hierarchy.
 *
 * A Place is any Stuff that exists as a spatial container in the world:
 * something other Stuff can be inside, but which itself is not typically
 * contained by anything else. Pure structural role — no identity, no
 * visible description. Concrete player-facing places (rooms, clearings,
 * decks, etc.) extend Place in /lib/spatial/ and layer on Visible and
 * whatever other defaults belong on a described location.
 *
 * Composition: ContainerMixin(Stuff)
 *
 * Inherits from ContainerMixin:
 * - inventory: Set<Stuff>
 * - addToInventory(), removeFromInventory(), hasInInventory()
 * - getInventoryContents(), getContents()
 */

import { Stuff } from './Stuff';
import { ContainerMixin } from '../spatial/Container';

const PlaceBase = ContainerMixin(Stuff);

export class Place extends PlaceBase {
  static persistentFields: string[] = [];
}
