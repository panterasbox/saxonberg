/**
 * SphericalLocation — a Location shaped as a sphere of given radius,
 * positioned by focus inside a `SphericalZone`.
 *
 * Composition: `ExitableMixin(SphericalCoordinatesMixin(VisibleMixin(Location)))`
 *
 * Spherical zones have no implicit adjacency — every exit on a
 * SphericalLocation is explicit and semantic (e.g., `'office'`, `'plaza'`).
 * `CartesianZone`-style derivation returns nothing here.
 */

import Location from '../../lib/stuff/Location';
import { SphericalCoordinatesMixin } from '../../lib/location/SphericalCoordinates';
import { ExitableMixin } from '../../lib/boundary/Exitable';
import { VisibleMixin } from '../../lib/description/Visible';
import { PostRegistrationMixin } from '../../lib/stuff/PostRegistration';
import { Quantity } from '../../lib/quantity';
import type SphericalZone from '../idea/location/SphericalZone';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { FieldMeta } from '../../lib/mixin';

// ⭐ NOT singleton — the same asymmetry as `CartesianLocation`, and the
// same reason it holds the unmarked name: the mixin SUBTRACTS. A class
// without it still backs singleton templates via
// `StuffApi.singleton(path)`; a class with it can back ONLY those,
// because `clone()` throws after the first.
// {@link SingletonSphericalLocation} is the opt-in.
const SphericalLocationBase = PostRegistrationMixin(
  ExitableMixin(SphericalCoordinatesMixin(VisibleMixin(Location)))
);

export default class SphericalLocation extends SphericalLocationBase {
  /**
   * Mutual-exit verification — same as CartesianLocation. The verifier
   * skips non-cardinal directions, so spherical exits authored with
   * semantic labels (`'office'`, `'plaza'`) are no-ops here; they rely
   * on `addBidirectionalExit` for inverse wiring at construction time.
   */
  public override async postRegister(_context?: unknown): Promise<void> {
    this.verifyOutboundExits();
  }

  // onDestruct inherited from ExitableMixin → Location chain.

  /**
   * Narrowed override: a `SphericalLocation` lives in a `SphericalZone`
   * by `SphericalZone.addLocation`'s rejection of non-Spherical
   * locations. The cast happens once here, at the boundary; callers
   * with a typed `SphericalLocation` reference get the narrowed type
   * for free. Symmetric with `CartesianLocation.getZone`.
   */
  public override getZone(): SphericalZone | null {
    return super.getZone() as SphericalZone | null;
  }

  /**
   * Effective receiving-surface area used by `VisionModality.lightAt` to
   * convert accumulated lumens to lux. v1 commits to the room's own
   * radius (interpreted as m²) — bigger spheres read dimmer for the
   * same total flux. The exact-physics version (full surface area
   * `4πr²` or a cross-section) is deferred until content needs the
   * fidelity; a single scalar keeps the propagation walk simple.
   */
  public override getSizeScale(): number {
    return this.getRadius();
  }

  /**
   * The linear extent is the **diameter**, `2r` — the longest straight
   * line across the room, which is the distance a shot actually has to
   * cross. Spherical rooms already carry a per-room radius, so they need
   * no authored override (unlike cartesian cells, which are sized by
   * their zone).
   */
  public override getLinearExtent(): number | null {
    const r = this.getRadius();
    if (r === null || r === undefined || r === 0) return null;
    return 2 * r;
  }

  /**
   * Full-sphere volume `(4/3)πr³`. The reservation that adjacent
   * spheres can't overlap; also what gas-law math (`n = PV/RT`)
   * operates against. Returns `null` when radius is unset.
   */
  public override getVolume(): Quantity<'m³'> | null {
    const r = this.getRadius();
    if (r === null || r === undefined || r === 0) {
      // Radius zero is functionally an unset room — let consumers
      // see null rather than a degenerate zero volume.
      return r === 0 ? null : null;
    }
    return Quantity.of((4 / 3) * Math.PI * r * r * r, 'm³');
  }

  /**
   * Usable ceiling height — the side of the cube inscribed in the
   * sphere, `2r/√3`. The cube's space diagonal equals the sphere's
   * diameter; the cube's side is the practical floor-to-ceiling
   * extent of the room.
   */
  public override getCeilingHeight(): Quantity<'m'> | null {
    const r = this.getRadius();
    if (r === null || r === undefined || r === 0) return null;
    return Quantity.of((2 * r) / Math.sqrt(3), 'm');
  }

  /**
   * Persistent declarative-content field. `_focus` holds the YAML-
   * shape input `{rho, theta, phi, radius}`; the runtime tuple lives
   * on `SphericalCoordinatesMixin.coordinates` (`[rho, theta, phi]`)
   * and `radius` (number). The setter bridges them — see `setFocus`.
   *
   * Parallel to `CartesianLocation.coords` per declarative-content-
   * slate § coords on CartesianLocation (Spherical note).
   */
  protected _focus: {
    rho: number;
    theta: number;
    phi: number;
    radius: number;
  } | null = null;

  static fieldMeta: FieldMeta = {
    focus: { persistent: true },
  };

  public getFocus(): {
    rho: number;
    theta: number;
    phi: number;
    radius: number;
  } | null {
    return this._focus;
  }

  /**
   * Setter with side effect. Stamps the runtime coordinate tuple
   * and radius via the existing
   * `SphericalCoordinatesMixin.setCoordinates / setRadius`, then
   * registers this location with the resolved SphericalZone via
   * `addLocation(this)` (Spherical's `addLocation` reads the
   * coordinates that we just stamped — no per-arg coordinate
   * delivery).
   *
   * Idempotent on the happy path (same focus → no-op). The
   * idempotency check uses `SphericalZone.hasLocationAtFocus`.
   */
  public async setFocus(value: {
    rho: number;
    theta: number;
    phi: number;
    radius: number;
  }): Promise<void> {
    if (
      !value ||
      typeof value.rho !== 'number' ||
      typeof value.theta !== 'number' ||
      typeof value.phi !== 'number' ||
      typeof value.radius !== 'number'
    ) {
      throw new TypeError(
        `SphericalLocation.setFocus: expected { rho, theta, phi, radius } ` +
          `with numeric fields, got ${JSON.stringify(value)}`
      );
    }
    const zone = this.getZone();
    if (!zone) {
      const tag =
        (this as unknown as Stuff).getTemplatePath() ??
        (this as unknown as Stuff).stuffId;
      throw new Error(
        `SphericalLocation.setFocus: no zone resolved for ${tag}; ` +
          `template-path ancestry must include a SphericalZone.`
      );
    }
    const focusTuple: [number, number, number] = [
      value.rho,
      value.theta,
      value.phi,
    ];
    // Stamp the runtime tuple + radius unconditionally — the inputs
    // are the source of truth, the mixin's coordinates field is the
    // derived runtime value.
    this.setCoordinates(focusTuple);
    this.setRadius(value.radius);
    if (zone.hasLocationAtFocus(focusTuple, this)) {
      this._focus = { ...value };
      return;
    }
    zone.addLocation(this);
    this._focus = { ...value };
  }
}
