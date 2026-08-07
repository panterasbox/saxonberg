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
 * Composition: `AmbientLitMixin(AdornableMixin(ContainerMixin(Stuff)))`
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
import { AmbientLitMixin } from '../perception/AmbientLit';
import { Suppressions, type MagicSuppression } from '../magic/Suppression';
import type { FieldMeta } from '../mixin';

// A Location represents *space*, not *matter* — so it is NOT `Tangible`
// (rooms have no material or mass; nothing ever read them). "Made of matter"
// is the Tangible seam (Thing / Vessel / Agent), which is also exactly the
// "can get wet" set — see lib/wetness/Wet.ts.
//
// `AmbientLitMixin` composes here because an ambient light level is a
// property of SPACE generally — "underground rooms keep 0 lumen (the
// default); outdoor rooms author a stored value", as its own docstring puts
// it. Until the husbandry build it was composed by test fixtures only, so
// `ambientIntensity` was authorable on no shipped room at all and every
// room read pitch-black. Composing it at the base is inert by default: the
// perception walk skips a zero-flux ambient, so an unauthored room reads
// exactly as it did before.
const LocationBase = AddressableMixin(
  AmbientLitMixin(AtmosphericMixin(AdornableMixin(ContainerMixin(Stuff)))),
);

export default class Location extends LocationBase {
  static fieldMeta: FieldMeta = {
    suppressesMagic: { persistent: true },
  };

  /**
   * The anti-magic field this place carries, or `null` (the overwhelming
   * default). Authored in room seeds (`suppressesMagic: { all: true }` /
   * a `verbs`/`nouns` grid filter); resolved at a position by the sync
   * outward containment walk (`Suppressions.fieldAt` — the biome-chain
   * precedent), so a field on a building covers its rooms. Read at
   * cast time (veto) and by the sustained-effect reconcile (a modifier
   * goes dormant inside it). See docs/subsystems/magic.md.
   */
  protected suppressesMagic: MagicSuppression | null = null;

  public getSuppressesMagic(): MagicSuppression | null {
    return this.suppressesMagic;
  }
  public setSuppressesMagic(value: MagicSuppression | null): void {
    // Per-field invariant: Suppressions.validate throws on bad filters.
    this.suppressesMagic = Suppressions.validate(value);
  }

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
   * The room's **linear extent in metres** — the one honest number the
   * physical systems derive from. Light already divides by an area
   * derived from it and the atmosphere already fills a volume derived
   * from it; combat's engagement bands read it too, so a 3 m cell
   * affords only the melee tiers while an authored 20 m outdoor cell
   * affords `far` (see {@link RangeBand.maxForExtent}).
   *
   * Topology-agnostic base: `null` — "this room does not report a
   * size." Concrete subclasses override per their geometry
   * (`CartesianLocation` from its cell, `SphericalLocation` from its
   * diameter). Consumers must treat `null` conservatively rather than
   * assuming a default, because an unmeasured room cannot promise the
   * distance a ranged weapon needs.
   */
  public getLinearExtent(): number | null {
    return null;
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
