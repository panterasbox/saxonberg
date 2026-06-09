/**
 * CartesianLocation — a Location that lives at `[x,y,z]` inside a
 * `CartesianZone`, with a full Exitable map.
 *
 * Composition: `ExitableMixin(CartesianCoordinatesMixin(VisibleMixin(Location)))`
 *
 * Locations are positioned by integer grid coordinates in a zone's grid.
 * Cardinal exits are derived on demand from grid adjacency (see
 * `CartesianZone.deriveExit`) unless an explicit exit is authored. Flat
 * zones leave `z = 0` and have no `up`/`down` neighbors; vertical zones
 * fill them in.
 *
 * Direction discipline: CartesianLocations only accept exits in one of the
 * 10 canonical cardinal directions (`n`/`s`/`e`/`w`/diagonals/`up`/`down`).
 * Labeled exits (`'portal'`, `'office'`) belong on SphericalLocation or
 * ExitableVessel — those spaces have no grid to be nonsensical against.
 * This keeps reciprocity sensible: every exit on a CartesianLocation has a
 * known inverse.
 */

import { Location } from '../stuff/Location';
import { CartesianCoordinatesMixin } from './CartesianCoordinates';
import { ExitableMixin } from '../boundary/Exitable';
import { VisibleMixin } from '../description/Visible';
import { PerceptibleMixin } from '../description/Perceptible';
import { DetailedMixin } from '../description/Detailed';
import { PostRegistrationMixin } from '../stuff/PostRegistration';
import { PopulatesMixin } from '../stuff/Populates';
import { SingletonMixin } from '../stuff/Singleton';
import { NavigationApi } from '../../api/navigation';
import { ZoneApi } from '../../api/zone';
import { Quantity } from '../quantity';
import type { CartesianZone } from './CartesianZone';
import type { Exit } from '../boundary/Exit';
import type { Stuff } from '../stuff/Stuff';

// CartesianLocation is singleton-shaped: every cartesian room is
// uniquely identified by its template path (a `[x,y,z]` cell in a
// specific zone). The mixin enforces this at clone-time; the same
// shape also satisfies `TemplateApi.validateSingletonContainerTarget`,
// which is what `Avatar.save()` needs when snapshotting
// `data.container` back to the player's per-room landing point.
const CartesianLocationBase = SingletonMixin(
  PostRegistrationMixin(
    PopulatesMixin(
      DetailedMixin(
        PerceptibleMixin(
          ExitableMixin(CartesianCoordinatesMixin(VisibleMixin(Location)))
        )
      )
    )
  )
);

export class CartesianLocation extends CartesianLocationBase {
  static persistentFields = ['coords'];

  /**
   * Tightened cardinal rule per zone-architecture-slate § The
   * cardinal-only-intra-zone exit invariant:
   *
   *   - Cardinal direction (n/s/e/w/diagonals/up/down): always allowed.
   *   - Non-cardinal direction: only allowed when the destination's
   *     templatePath resolves to a *different* zone than the source's.
   *     The check is **path-based** via `ZoneApi.resolveZoneForPath`
   *     (walks template ancestry in Mongo, no need to load the
   *     destination room as a Stuff). Zones materialize lazily —
   *     first reference triggers a clone, subsequent references hit
   *     the singleton cache.
   *
   * Result: a freely-authored CartesianZone can have semantic exits
   * (`portal`, `office`) that cross into a SphericalZone or another
   * CartesianZone, but never inside its own grid.
   *
   * The override is async because zone resolution may clone the
   * zone Stuff on first reference. The base interface already
   * carries `Promise<boolean>` so the override is type-safe.
   */
  public override async addExit(exit: Exit): Promise<boolean> {
    const direction = exit.getDirection();
    if (NavigationApi.isCardinalDirection(direction)) {
      return super.addExit(exit);
    }
    // Non-cardinal direction — must be cross-zone. Path-based check:
    // ZoneApi.resolveZoneForPath walks template ancestry in Mongo
    // without loading the destination Location as a Stuff.
    const destPath = exit.getDestinationTemplatePath();
    const sourcePath = (this as unknown as Stuff).getTemplatePath();
    if (!destPath || !sourcePath) {
      // Exotic: an exit or source without a templatePath (orphan ref
      // or runtime-only test object). Permissive — allow.
      return super.addExit(exit);
    }
    const sourceZone = await ZoneApi.resolveZoneForPath(sourcePath);
    const destZone = await ZoneApi.resolveZoneForPath(destPath);
    if (sourceZone && destZone && sourceZone === destZone) {
      throw new Error(
        `CartesianLocation.addExit: non-cardinal direction '${direction}' ` +
          `requires the destination to be in a different zone; both ` +
          `source '${sourcePath}' and destination '${destPath}' resolve ` +
          `to zone '${
            (sourceZone as unknown as Stuff).getTemplatePath() ??
            (sourceZone as unknown as Stuff).stuffId
          }'.`
      );
    }
    return super.addExit(exit);
  }

  /**
   * Mutual-exit verification: wires inverse pointers for any outbound
   * exit whose destination is already loaded, or marks the exit blocked
   * if the destination's topology doesn't match. Defers anything whose
   * destination hasn't been loaded yet — the destination's own load
   * (or the next traversal) will rerun the check. See
   * `ExitableMixin.verifyOutboundExits`.
   */
  public override async postRegister(_context?: unknown): Promise<void> {
    this.verifyOutboundExits();
  }

  // onDestruct is inherited from ExitableMixin (exit teardown) and
  // chains via super to Location.onDestruct (zone detach). No
  // override needed.

  /**
   * Narrowed override: a `CartesianLocation` lives in a `CartesianZone`
   * by `CartesianZone.addLocation`'s rejection of non-Cartesian
   * locations. The cast happens once here, at the boundary; every
   * caller within (or with a typed reference to) `CartesianLocation`
   * gets the narrowed type for free. If a `CartesianLocation` ever
   * landed in a non-Cartesian zone, `getCellSize` would be undefined
   * and any optional-call would short-circuit — defensive but
   * documented.
   */
  public override getZone(): CartesianZone | null {
    return super.getZone() as CartesianZone | null;
  }

  /**
   * Effective receiving-surface area in m² used by `VisionModality.lightAt`
   * to convert accumulated lumens to lux: the walk divides the total
   * flux at this room by `getSizeScale()`. Derived from the linear
   * cell extent by squaring it — `cellSize: 3` → 9 m² floor area.
   * Larger rooms read dimmer for the same total flux. The fallback
   * covers transient test state where the room hasn't been added to
   * a zone yet.
   */
  public override getSizeScale(): number {
    const c = this.getZone()?.getCellSize() ?? 1.0;
    return c * c;
  }

  /**
   * Cube-cell volume: `cellSize³`. The atmospheric-fill reservation
   * (`n = PV/RT` math operates against this scalar). Returns `null`
   * when the room hasn't been associated with a zone yet.
   */
  public override getVolume(): Quantity<'m³'> | null {
    const c = this.getZone()?.getCellSize();
    if (c === undefined || c === null) return null;
    return Quantity.of(c * c * c, 'm³');
  }

  /**
   * Cube-cell ceiling height: `cellSize`. Floor-to-ceiling vertical
   * extent. `null` falls through identically to `getVolume`.
   */
  public override getCeilingHeight(): Quantity<'m'> | null {
    const c = this.getZone()?.getCellSize();
    if (c === undefined || c === null) return null;
    return Quantity.of(c, 'm');
  }

  /**
   * Persistent declarative-content field. `_coords` holds the
   * YAML-shape input `{x, y, z}`; the runtime tuple lives on
   * `CartesianCoordinatesMixin.coordinates` (`[x, y, z]`). The setter
   * bridges them — see `setCoords`.
   *
   * Per declarative-content-slate § coords on CartesianLocation,
   * `feedback_property_vs_instruction_fields` (property field
   * shape: storage IS the value), and `ref-shapes.md` § Field
   * naming (backing slot is `_coords`, public surface is
   * `getCoords` / `setCoords`).
   */
  protected _coords: { x: number; y: number; z: number } | null = null;

  public getCoords(): { x: number; y: number; z: number } | null {
    return this._coords;
  }

  /**
   * Setter with side effect: stores the value AND registers this
   * location with its resolved CartesianZone via
   * `addLocation(this, x, y, z)`. Idempotent on the happy path
   * (same coords → no-op); throws with a conflict diagnostic when
   * already at different coords. The zone resolution uses
   * `getZone()` — at hydrate time, `Stuff.zone` has been stamped
   * (see lifecycle: zone stamp runs before hydrate).
   *
   * Pattern: setter with side effects, parallel to
   * `SphericalLocation.setFocus` and `Window.setAttachedHosts`.
   * Per declarative-content-slate § coords on CartesianLocation.
   */
  public async setCoords(value: {
    x: number;
    y: number;
    z: number;
  }): Promise<void> {
    if (
      !value ||
      typeof value.x !== 'number' ||
      typeof value.y !== 'number' ||
      typeof value.z !== 'number'
    ) {
      throw new TypeError(
        `CartesianLocation.setCoords: expected { x, y, z } with ` +
          `numeric fields, got ${JSON.stringify(value)}`
      );
    }
    const zone = this.getZone();
    if (!zone) {
      const tag =
        (this as unknown as Stuff).getTemplatePath() ??
        (this as unknown as Stuff).stuffId;
      throw new Error(
        `CartesianLocation.setCoords: no zone resolved for ${tag}; ` +
          `template-path ancestry must include a CartesianZone.`
      );
    }
    // Idempotency: zone already has THIS room at the same coords →
    // accept and no-op the side effect.
    if (zone.hasRoomAt(value.x, value.y, value.z, this)) {
      this._coords = { ...value };
      return;
    }
    // Conflict: this room already lives at different coords.
    if (
      this._coords &&
      (this._coords.x !== value.x ||
        this._coords.y !== value.y ||
        this._coords.z !== value.z)
    ) {
      const tag =
        (this as unknown as Stuff).getTemplatePath() ??
        (this as unknown as Stuff).stuffId;
      throw new Error(
        `CartesianLocation.setCoords: ${tag} already at ` +
          `(${this._coords.x},${this._coords.y},${this._coords.z}); ` +
          `refusing to re-set to (${value.x},${value.y},${value.z}).`
      );
    }
    // Fresh registration (first set, or re-set after a clear).
    zone.addLocation(this, value.x, value.y, value.z);
    this._coords = { ...value };
  }
}
