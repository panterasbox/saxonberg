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

import { Location } from '../stuff/Location';
import { SphericalCoordinatesMixin } from './SphericalCoordinates';
import { ExitableMixin } from '../boundary/Exitable';
import { VisibleMixin } from '../description/Visible';
import { PostRegistrationMixin } from '../stuff/PostRegistration';
import type { SphericalZone } from './SphericalZone';
import type { Stuff } from '../stuff/Stuff';

const SphericalLocationBase = PostRegistrationMixin(
  ExitableMixin(SphericalCoordinatesMixin(VisibleMixin(Location)))
);

export class SphericalLocation extends SphericalLocationBase {
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
   * Effective receiving-surface area used by `LightApi.lightAt` to
   * convert accumulated lumens to lux. v1 commits to the room's own
   * radius (interpreted as m²) — bigger spheres read dimmer for the
   * same total flux. The exact-physics version (full surface area
   * `4πr²` or a cross-section) is deferred until content needs the
   * fidelity; a single scalar keeps the propagation walk simple.
   */
  public getSizeScale(): number {
    return this.getRadius();
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

  static persistentFields = ['focus'];

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
