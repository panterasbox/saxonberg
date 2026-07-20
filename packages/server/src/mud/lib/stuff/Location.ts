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
import { AtmosphericMixin } from '../biome/Atmospheric';
import { AddressableMixin } from '../address/Addressable';

// A Location represents *space*, not *matter* — so it is NOT `Tangible`
// (rooms have no material or mass; nothing ever read them). "Made of matter"
// is the Tangible seam (Thing / Vessel / Agent), which is also exactly the
// "can get wet" set — see lib/wetness/Wet.ts.
const LocationBase = AddressableMixin(
  AtmosphericMixin(AdornableMixin(ContainerMixin(Stuff))),
);

export default class Location extends LocationBase {
  static persistentFields: string[] = [];

  // `getVolume` / `getCeilingHeight` live on AtmosphericMixin (composed
  // above) so Vessels — which also have meaningful interior volume —
  // pick them up too. Concrete Location subclasses (`CartesianLocation`,
  // `SphericalLocation`) override per their topology.

  /**
   * Effective light-receiving floor area in m², used by
   * `VisionModality.lightAt` to convert accumulated lumens to lux.
   * The base is topology-agnostic and returns 1.0 (m²); concrete
   * Location subclasses (`CartesianLocation`, `SphericalLocation`)
   * override per their cell geometry. Larger rooms read dimmer for
   * the same total flux.
   */
  public getSizeScale(): number {
    return 1.0;
  }

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


// Self-register as a top-level branch (the one sanctioned module-scope
// self-registration — see `Stuff._registerTopLevelBranch` for why the
// hierarchy's root invariant must populate at branch-module load, and
// `scripts/check-module-scope.ts`'s allowlist).
Stuff._registerTopLevelBranch(Location);
