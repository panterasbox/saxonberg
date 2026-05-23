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
 * Composition: `AdornableMixin(ContainerMixin(Stuff))`
 *
 * Provides:
 * - contents: Set<Stuff & Containable> (host-internal storage)
 * - fixtures: Set<Stuff & Adornment> (host-internal, non-portable
 *   attached Stuff: wall sconces, ceiling lamps, BoundaryAnchors)
 * - addContainable(), removeContainable(), hasContainable()
 * - getContents()
 * - addFixture(), removeFixture(), hasFixture(), getFixtures(),
 *   getFixtureBoundaries(), getFixtureLightSources() (from AdornableMixin)
 */

import { Stuff } from './Stuff';
import { ContainerMixin } from '../spatial/Container';
import { AdornableMixin } from '../boundary/Adornable';
import { TangibleMixin } from '../material/Tangible';
import { AtmosphericMixin } from '../biome/Atmospheric';

const LocationBase = AtmosphericMixin(
  TangibleMixin(AdornableMixin(ContainerMixin(Stuff))),
);

export class Location extends LocationBase {
  static persistentFields: string[] = [];

  // `getVolume` / `getCeilingHeight` live on AtmosphericMixin (composed
  // above) so Vessels — which also have meaningful interior volume —
  // pick them up too. Concrete Location subclasses (`CartesianLocation`,
  // `SphericalLocation`) override per their topology.

  /**
   * Detach from the owning Zone on destruct. Clears `locations`
   * membership and any coordinate-keyed indexes the zone maintains
   * (CartesianZone grid, SphericalZone focus index).
   *
   * `ExitableMixin.onDestruct` super-chains here after handling the
   * exit-side teardown. We chain to super in turn so
   * `AdornableMixin.onDestruct` (fixture teardown — wall sconces,
   * BoundaryAnchors) runs before the chain bottoms out at `Stuff`
   * (which has no `onDestruct` of its own).
   */
  public override onDestruct(): void {
    const zone = this.getZone();
    if (zone) {
      zone.removeLocation(this);
    }
    super.onDestruct();
  }
}

Stuff._registerTopLevelBranch(Location);
