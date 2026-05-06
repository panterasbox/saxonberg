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
 * - contents: Set<Stuff & Containable> (host-internal storage)
 * - addContainable(), removeContainable(), hasContainable()
 * - getContents()
 */

import { Stuff } from './Stuff';
import { ContainerMixin } from '../spatial/Container';

const LocationBase = ContainerMixin(Stuff);

export class Location extends LocationBase {
  static persistentFields: string[] = [];

  /**
   * Detach from the owning Zone on destruct. Clears `locations`
   * membership and any coordinate-keyed indexes the zone maintains
   * (CartesianZone grid, SphericalZone focus index).
   *
   * `ExitableMixin.prepareDestroy` super-chains here after handling
   * the exit-side teardown.
   */
  protected override prepareDestroy(): void {
    const zone = this.getZone();
    if (zone) {
      zone.removeLocation(this);
    }
  }
}
