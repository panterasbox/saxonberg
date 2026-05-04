/**
 * Location — root for spatial containers in the world.
 *
 * Pure structural role: a Location is any Stuff that can hold other
 * Stuff but doesn't itself live inside something. Concrete kinds of
 * Location (`CartesianLocation`, `SphericalLocation`, …) extend this
 * class and layer on Visible (for descriptions), Exitable (for
 * navigation), coordinate mixins, NamedMixin (for places with proper
 * names like "Town Square"), and whatever else they need.
 *
 * Composition: `ContainerMixin(Stuff)`
 *
 * Provides:
 * - inventory: Set<Stuff>
 * - addToInventory(), removeFromInventory(), hasInInventory()
 * - getInventoryContents(), getContents()
 */

import { Stuff } from './Stuff';
import { ContainerMixin } from '../spatial/Container';

const LocationBase = ContainerMixin(Stuff);

export class Location extends LocationBase {
  static persistentFields: string[] = [];
}
