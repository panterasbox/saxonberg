/**
 * Location — you FILL a location (one of many laid out to a plan); you
 * VISIT a locale. This is the grid geometry both share: a Place that
 * lives at `[x,y,z]` inside a `CartesianZone`, with a full Exitable map.
 * {@link Locale} adds the one-per-row restriction on top.
 *
 * Composition: `ExitableMixin(CartesianCoordinatesMixin(VisibleMixin(Place)))`
 *
 * Locations are positioned by integer grid coordinates in a zone's grid.
 * Exits are authored **explicitly** on every room — the zone does not derive
 * them from grid adjacency (a room connects to exactly what its template
 * declares, on both sides). The grid drives geometry (volume, ceiling,
 * light-scale) and the cardinal-only-intra-zone exit rule below, not exit
 * synthesis. Flat zones leave `z = 0`; vertical zones use `up`/`down`.
 *
 * Direction discipline: Locations only accept exits in one of the
 * 10 canonical cardinal directions (`n`/`s`/`e`/`w`/diagonals/`up`/`down`).
 * Labeled exits (`'portal'`, `'office'`) belong on SphericalLocation or
 * ExitableVessel — those spaces have no grid to be nonsensical against.
 * This keeps reciprocity sensible: every exit on a Location has a
 * known inverse.
 */

import Place from '../stuff/Place';
import { CartesianCoordinatesMixin } from './CartesianCoordinates';
import { ExitableMixin } from '../boundary/Exitable';
import { StagedMixin } from '../stuff/Staged';
import { NavigationApi } from '../../api/navigation';
import { ZoneApi } from '../../api/zone';
import { MixinApi } from '../../api/mixin';
import { Quantity } from '../quantity';
import type CartesianZone from '../../platform/idea/location/CartesianZone';
import type Exit from '../boundary/Exit';
import type { Boundary } from '../boundary/Boundary';
import type { Container } from '../spatial/Container';
import type { Stuff } from '../stuff/Stuff';
import type { FieldMeta } from '../mixin';

// ⭐ NOT singleton-shaped — and the asymmetry is the whole reason this
// class holds the unmarked name.
//
// A class WITHOUT `SingletonMixin` still backs singleton templates
// perfectly well: `StuffApi.singleton(path)` get-or-creates, which is
// how an eager exit resolves its destination. A class WITH the mixin can
// back ONLY singleton templates — `clone()` throws after the first. The
// mixin subtracts, so the permissive class is the default and
// {@link Locale} is the one that opts into the
// restriction.
//
// The restriction is worth opting into wherever one row IS one place: it
// catches a second `clone()` of the Registry office, which would
// otherwise silently produce two of them. It is wrong wherever a row
// describes a KIND of place minted many times — nine reaches of one
// lane, a landing per floor — which had nowhere to live before.
// ⚠⚠ `PublicLightingMixin` is NOT here, and was for one build. It went
// on this base on the reasoning that "any cartesian cell may be lit by a
// funded public service" — which gave a cellar, a smithy, a mine heading
// and a ploughed field a lighting field and a `onCreate` hook to
// answer for. FIVE rows in the realm declare the service. It lives on
// `platform/location/Street` now, which is what a town lights.
const LocationBase =
  StagedMixin(
    
      
        ExitableMixin(CartesianCoordinatesMixin(Place))
      
    
  );

export default class Location extends LocationBase {
// ⭐ `coords` gained `authorable` in the base-class narrowing
// (2026-09-30) — the other half of an inverted pair. This is the shape
// 117 rows already use and the one that registers a room with its zone
// via `setCoords → zone.addLocation`; it simply was never offered.
// `CartesianCoordinates.coordinates` had the flag and no authors, and
// authoring it would have bypassed zone registration silently.
//
// ⚠⚠ Note where this comment SITS. Written inside the `fieldMeta`
// object literal it broke `lint:instanceable`: `fieldMetaEntries`
// finds depth-1 keys by counting braces and parentheses, and prose
// containing either makes it lose the block — 117 rows reported as
// orphan keys by a gate that could no longer see the field. A textual
// instrument and a comment in the wrong place.
  static fieldMeta: FieldMeta = {
    coords: { persistent: true, authorable: true },
    extent: { persistent: true, authorable: true },
  };

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
    // without loading the destination Place as a Stuff.
    const destPath = exit.getDestinationTemplatePath();
    const sourcePath = (this as unknown as Stuff).getTemplatePath();
    if (!destPath || !sourcePath) {
      // Exotic: an exit or source without a templatePath (orphan ref
      // or runtime-only test object). Permissive — allow.
      return super.addExit(exit);
    }
    // ⭐ A holding lays its rooms out in its OWN frame (a dorm room, a
    // house's hall), so a door between a holding's room and the corridor
    // or street outside it crosses frames even when both resolve to one
    // zone — the dorm's `unit-3` and `out`.
    if (this.crossesHoldingFrame(exit)) return super.addExit(exit);
    const sourceZone = await ZoneApi.resolveZoneForPath(sourcePath);
    const destZone = await ZoneApi.resolveZoneForPath(destPath);
    if (sourceZone && destZone && sourceZone === destZone) {
      throw new Error(
        `Location.addExit: non-cardinal direction '${direction}' ` +
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
  public override async onCreate(context?: unknown): Promise<void> {
    // ⚠ Chain FIRST: `Place.onCreate` is what gives the room its
    // floor, and the mixin's default is a non-chaining no-op — so an
    // override that forgets this line leaves the room standable by nobody.
    await super.onCreate(context);
    this.verifyOutboundExits();
  }

  // onDestruct is inherited from ExitableMixin (exit teardown) and
  // chains via super to Place.onDestruct (zone detach). No
  // override needed.

  /**
   * Narrowed override: a `Location` lives in a `CartesianZone`
   * by `CartesianZone.addLocation`'s rejection of non-Cartesian
   * locations. The cast happens once here, at the boundary; every
   * caller within (or with a typed reference to) `Location`
   * gets the narrowed type for free. If a `Location` ever
   * landed in a non-Cartesian zone, `getCellSize` would be undefined
   * and any optional-call would short-circuit — defensive but
   * documented.
   */
  public override getZone(): CartesianZone | null {
    return super.getZone() as CartesianZone | null;
  }

  /**
   * Persistent per-room override of the linear cell extent, in metres.
   *
   * Cartesian cells are sized by the ZONE (`cellSize`, default 3.0),
   * which means a cramped shop and an open hall in the same zone could
   * not differ — the one gap the ranged build named as its single
   * dependency. `null` (the default) keeps the shipped behaviour
   * exactly: fall through to the zone.
   *
   * It is deliberately ONE number rather than a combat-only field.
   * Extent already drives light (via the squared area) and the
   * atmosphere (via the cubed volume); giving combat its own would let
   * a room be small for bands and large for lux, which is the kind of
   * disagreement the store-causes-derive-effects rule exists to
   * prevent. Authoring a bigger room makes it dimmer, airier AND
   * longer-ranged, because that is what a bigger room is.
   */
  protected _extent: number | null = null;

  public getExtent(): number | null {
    return this._extent;
  }

  /** Per-field invariant: a room's extent is a positive magnitude. */
  public setExtent(value: number | null): void {
    if (value !== null && (!Number.isFinite(value) || value <= 0)) {
      throw new Error(
        `extent: must be a positive number of metres (got ${value})`,
      );
    }
    this._extent = value;
  }

  /**
   * The linear cell extent in metres — the per-room override when one is
   * authored, else the zone's `cellSize`. The single cause the three
   * derivations below read.
   */
  public override getLinearExtent(): number | null {
    return this._extent ?? this.getZone()?.getCellSize() ?? null;
  }

  /**
   * ⭐ **Take the cell beside a plotted neighbour** — how a place a warren
   * MINTS gets its coordinates (a reach of lane, a corridor per floor).
   * Its exits already say where it is: an exit `down` to a lobby at
   * (0,1,0) puts this room at (0,1,1). The first cardinal exit to a
   * neighbour that is on this room's zone grid decides, and the room
   * joins that grid there.
   *
   * Refuses (returns `false`, and says why) rather than overwriting when
   * another place already holds the cell — the grid itself does not check.
   */
  public plotBesideNeighbour(): boolean {
    const self = this as unknown as Stuff;
    const zone = this.getZone();
    if (!zone) return false;
    if (zone.hasRoomAt(...this.getCoordinates(), this)) return true;
    for (const [direction, exit] of this.getExits()) {
      const off = NavigationApi.directionOffset(direction);
      if (!off) continue;
      let near: Stuff | null = null;
      try {
        near = exit.getDestination();
      } catch {
        continue;
      }
      if (!(near instanceof Location) || near.getZone() !== zone) continue;
      const [x, y, z] = near.getCoordinates();
      if (!zone.hasRoomAt(x, y, z, near)) continue;
      const cell: [number, number, number] = [x - off[0], y - off[1], z - off[2]];
      if (zone.hasRoomAt(...cell)) {
        console.warn(
          `Location.plotBesideNeighbour: ${self.getIdentityPath() ?? self.stuffId} ` +
            `wants (${cell.join(',')}) beside ${near.getIdentityPath() ?? near.stuffId}, ` +
            `and another place holds it — left off the grid.`,
        );
        return false;
      }
      zone.addLocation(this, ...cell);
      return true;
    }
    return false;
  }

  /**
   * ⭐⭐ **The edge rules** (boundary build, D8 — every way, owner's call
   * 2026-11-10). Inside one zone every room is one cell, so every shared
   * face is the same size, and a way between two rooms of the zone is where
   * two cells MEET:
   *
   *   1. the far place is the ADJACENT cell that way;
   *   2. the far side's way back, if it has one, is the OPPOSITE direction;
   *   3. the way's opening fits the face, and a boundary hung in it fits
   *      the way.
   *
   * ⭐ A **track** (`Exit.spansOpenGround`, the `track` kind) is the long
   * walk across open ground nobody has authored — a remote claim, the lane
   * up the valley: its far place lies along its direction any number of
   * cells on (it may climb: the ground is not flat), no room stands
   * between, and nothing can hang in it — a boundary needs a shared face.
   *
   * Across zones (or between a holding's own frame and another) a way is a
   * THRESHOLD: the grids share no face and nothing is checked. Only places
   * that stand plotted are judged; a room not yet loaded is not seen
   * between, which `lint:locations` checks from the rows. Returns the
   * reason, or null.
   *
   * @hook
   */
  public override edgeRefusal(exit: Exit, boundary: Boundary | null): string | null {
    const here = this as unknown as Stuff;
    const zone = this.getZone();
    const far = exit.peekDestination();
    if (zone === null || far === null || far.getZone() !== zone) return null;
    if (this.holdingFrameOf(here) !== this.holdingFrameOf(far)) return null;
    const a = this.getCoords();
    const b = far instanceof Location ? far.getCoords() : null;
    if (a === null || b === null) return null;
    const direction = exit.getDirection();
    const off = NavigationApi.directionOffset(direction);
    if (!off) return null; // a named way inside a zone is addExit's to refuse
    const [dx, dy, dz] = [b.x - a.x, b.y - a.y, b.z - a.z];
    if (exit.spansOpenGround()) {
      if (boundary) {
        return 'a track crosses open ground, and nothing can hang in it — a door or a window needs the shared face of two adjacent cells';
      }
      const why = this.trackRefusal(direction, off, dx, dy, dz);
      if (why) return why;
      // The cells the straight line crosses, ends excluded: a room standing
      // on one is in the way (the track would have to go through it).
      const steps = off[2] !== 0 ? 0 : Math.max(Math.abs(dx), Math.abs(dy));
      for (let i = 1; i < steps; i++) {
        const cx = a.x + Math.round((i * dx) / steps);
        const cy = a.y + Math.round((i * dy) / steps);
        const cz = a.z + Math.round((i * dz) / steps);
        if ((cx !== b.x || cy !== b.y) && zone.hasRoomAt(cx, cy, cz)) {
          return `a room stands in the way at (${cx},${cy},${cz}) — a track runs over open ground`;
        }
      }
    } else if (dx !== off[0] || dy !== off[1] || dz !== off[2]) {
      return `the far place (${b.x},${b.y},${b.z}) is not the cell ${direction} of (${a.x},${a.y},${a.z}) — a way joins adjacent cells (a long walk over open ground is a \`track\`)`;
    }
    const backDir = NavigationApi.invertDirection(direction);
    if (MixinApi.isExitable(far)) {
      const backs = [...far.getExits().entries()].filter(
        ([, x]) => x.peekDestination() === here,
      );
      if (backs.length > 0 && !backs.some(([d]) => d === backDir)) {
        return `the far side's way back is '${backs.map(([d]) => d).join("', '")}', and it must be '${backDir}' — the two sides are opposite`;
      }
    }
    const face = this.getLinearExtent();
    const opening = exit.getOpening();
    if (!exit.spansOpenGround() && face !== null && opening !== null &&
        (opening.width > face || opening.height > face)) {
      return `its opening (${opening.width} × ${opening.height} m) is larger than the ${face} m face it passes through`;
    }
    if (boundary) {
      const room = opening ?? (face !== null ? { width: face, height: face } : null);
      const size = boundary.getOpening();
      if (room !== null && (size.width > room.width || size.height > room.height)) {
        return `${boundary.getPresentation()} (${size.width} × ${size.height} m) is larger than the way it hangs in (${room.width} × ${room.height} m)`;
      }
    }
    return null;
  }

  /**
   * A track's far place lies IN its direction: for a level direction the
   * ground bearing to it rounds to that compass point (within 22.5°), at
   * any height (a track climbs); for `up`/`down` the height moves that way.
   * A compass word over open country is a bearing, never a promise of a
   * straight road. Null when it does.
   */
  private trackRefusal(
    direction: string,
    off: readonly [number, number, number],
    dx: number,
    dy: number,
    dz: number,
  ): string | null {
    if (off[2] !== 0) {
      return Math.sign(dz) === Math.sign(off[2])
        ? null
        : `a track ${direction} must go ${direction} — the far place is at a height of ${dz >= 0 ? '+' : ''}${dz}`;
    }
    if (dx === 0 && dy === 0) return `the far place is not ${direction} of here — it is the same ground`;
    const want = Math.atan2(off[1], off[0]);
    const got = Math.atan2(dy, dx);
    const diff = Math.abs(((got - want + 3 * Math.PI) % (2 * Math.PI)) - Math.PI);
    return diff <= Math.PI / 8 + 1e-9
      ? null
      : `the far place lies ${Math.round((got * 180) / Math.PI)}° from east, not ${direction} — a track's direction is its bearing`;
  }

  /**
   * Does this exit cross between a holding's own frame and another? A
   * place belongs to a holding's frame when it is a member of a warren
   * that {@link Warren.laysOutOwnFrame lays out its own}; two places in
   * different such frames (or one in a frame and one outside) are on
   * different grids, whatever zone their rows resolve to.
   */
  private crossesHoldingFrame(exit: Exit): boolean {
    let dest: Stuff | null = null;
    try {
      dest = exit.getDestination();
    } catch {
      return false;
    }
    return this.holdingFrameOf(this as unknown as Stuff) !== this.holdingFrameOf(dest);
  }

  private holdingFrameOf(place: Stuff): Stuff | null {
    if (!MixinApi.isWarrenMember(place)) return null;
    const warren = place.getWarren();
    return warren && warren.laysOutOwnFrame() ? warren : null;
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
    const c = this.getLinearExtent() ?? 1.0;
    return c * c;
  }

  /**
   * Cube-cell volume: `extent³`. The atmospheric-fill reservation
   * (`n = PV/RT` math operates against this scalar). Returns `null`
   * when the room reports no extent at all (no override, no zone).
   */
  public override getVolume(): Quantity<'m³'> | null {
    const c = this.getLinearExtent();
    if (c === undefined || c === null) return null;
    return Quantity.of(c * c * c, 'm³');
  }

  /**
   * Cube-cell ceiling height: `extent` — ⭐ **where there is a ceiling**
   * (size and carrying D7). A place open to the sky has none: `null`, so a
   * mast stands upright in a walled yard and nothing under the sky is ever
   * "too tall for the room". `null` too with no extent at all.
   */
  public override getCeilingHeight(): Quantity<'m'> | null {
    const c = this.getLinearExtent();
    if (c === undefined || c === null) return null;
    if (this.exposure().top === 'open') return null;
    return Quantity.of(c, 'm');
  }

  /**
   * Persistent declarative-content field. `_coords` holds the
   * YAML-shape input `{x, y, z}`; the runtime tuple lives on
   * `CartesianCoordinatesMixin.coordinates` (`[x, y, z]`). The setter
   * bridges them — see `setCoords`.
   *
   * Per declarative-content-slate § coords on Location,
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
   * `SphericalLocation.setFocus`.
   * Per declarative-content-slate § coords on Location.
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
        `Location.setCoords: expected { x, y, z } with ` +
          `numeric fields, got ${JSON.stringify(value)}`
      );
    }
    const zone = this.getZone();
    if (!zone) {
      const tag =
        (this as unknown as Stuff).getTemplatePath() ??
        (this as unknown as Stuff).stuffId;
      throw new Error(
        `Location.setCoords: no zone resolved for ${tag}; ` +
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
        `Location.setCoords: ${tag} already at ` +
          `(${this._coords.x},${this._coords.y},${this._coords.z}); ` +
          `refusing to re-set to (${value.x},${value.y},${value.z}).`
      );
    }
    // Fresh registration (first set, or re-set after a clear).
    zone.addLocation(this, value.x, value.y, value.z);
    this._coords = { ...value };
  }
}
