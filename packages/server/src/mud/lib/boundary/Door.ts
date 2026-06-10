/**
 * Door — first-class shared door state referenced by exit pairs AND
 * surfaced as a `Boundary` on each adjacent room.
 *
 * Phase 5 retrofit: a Door is now a `Boundary` subclass. The two
 * sides of a bidirectional exit pair still reference the SAME `Door`
 * instance via `Exit.door` (the movement-channel fast path), and the
 * Door additionally lives in each adjacent room's
 * `Adornable.getFixtures()` via a `BoundaryAnchor` per side. This
 * lets a closed Door block light propagation between its two rooms
 * via the cross-boundary walk in `VisionModality.lightAt`, alongside the
 * pre-existing movement gate on `Exit.canTraverse`.
 *
 * Composition: `SealableMixin(Boundary)`. Boundary already supplies
 * `Visible + Perceptible + Thing` (Containable comes from Thing), so
 * a *broken* or *unhinged* door can still be moved into a Location
 * via `ContainmentApi.move(door, location)` once detached. The
 * `attachedTo: Set<Exit>` field is preserved as the runtime
 * back-reference from each Exit that still references this Door.
 *
 * Conduit registry: a Door advertises three conduits in
 * `getConduits()` — `LightConduit`, `LineOfSight`, and
 * `MovementConduit`. All three delegate to `isOpen()`: a closed
 * Door blocks light, line-of-sight, and movement uniformly. Per-mode
 * traversal logic (squeeze through, wedge open) is a future Door
 * subclass; v1 Door is binary-open.
 *
 * `Exit.canTraverse` is INTENTIONALLY unmodified by this retrofit —
 * it already consults `door.isOpen()`, which returns the same
 * answer as the new `MovementConduit.canPassThrough`. Generalizing
 * the call site is deferred to a future Door subclass that varies on
 * traversal mode (`'squeeze'`, `'climb'`, …).
 *
 * Mixin responsibilities (unchanged from pre-retrofit):
 *   - `SealableMixin`: open/closed state. `setOpen()` rejects
 *     non-boolean assignments. `isOpen()` is the predicate getter.
 *   - `PerceptibleMixin` (via Boundary): MQL keywords. Door
 *     overrides `getKeywords()` to union with shortDescription
 *     tokens.
 *   - `VisibleMixin` (via Boundary): short/long descriptions.
 *
 * Template-loadable: `Door` is cloned from a `domain` template via
 * `StuffApi.clone()` with
 * `hydratorClass: '/lib/persistence/PersistentHydrator'`. The
 * persistent field shape is `open` (Sealable) plus the inherited
 * Visible / Perceptible fields. Doors are wired transitively when an
 * exit declares `door:` (via `Exitable.addBidirectionalExit`); they
 * never declare `attachedHosts:` themselves — that's Window's shape.
 *
 * MQL: a Door surfaces twice on its containing Location — once via
 * `ExitableMixin.getExitDoors()` and once via
 * `Adornable.getFixtureBoundaries()`. The `getFixtureBoundaries`
 * walk dedupes by `stuffId`, and the resolver dedupes the (stuff, via)
 * pair so the existing `via.exit` attribution survives.
 */

import { Boundary } from './Boundary';
import { SealableMixin } from '../spatial/Sealable';
import type Exit from './Exit';
import type {
  Conduit,
  LightConduit,
  LineOfSight,
  MovementConduit,
  BoundarySide,
} from './Conduit';
import type { SmellConduit } from './SmellConduit';
import type { SoundConduit } from './SoundConduit';

const DoorBase = SealableMixin(Boundary);

export default class Door extends DoorBase {
  /**
   * Runtime back-reference: every Exit whose `door` currently points
   * at this Door. Maintained by `Exit`'s `door` setter — adding the
   * door to a new Exit registers; clearing the door (or
   * `Exit.onDestruct`) unregisters.
   *
   * Not persistent: the relationship is rebuilt at load time as
   * Exits are constructed. Wiping it on destroy is `onDestruct`'s
   * job (via `detach()`).
   *
   * Host-internal storage; external callers go through `attachExit`
   * / `detachExit` / `hasAttached` / `getAttachedExits`. The verb
   * pair stays `attach`/`detach` rather than `add`/`remove` because
   * the operation is semantically richer than mere set membership —
   * the exit's `door` slot points back here, so attach/detach are
   * the right names for the bidirectional wiring.
   */
  protected attachedTo: Set<Exit> = new Set();

  public attachExit(exit: Exit): void {
    this.attachedTo.add(exit);
  }
  public detachExit(exit: Exit): boolean {
    return this.attachedTo.delete(exit);
  }
  public hasAttached(exit: Exit): boolean {
    return this.attachedTo.has(exit);
  }
  public getAttachedExits(): ReadonlySet<Exit> {
    return this.attachedTo;
  }

  /**
   * Union of the PerceptibleMixin keyword list with the tokens of
   * the door's shortDescription. A door constructed with only
   * `shortDescription: 'heavy oak door'` should still be targetable
   * as `oak` / `door` without re-listing those as explicit keywords.
   */
  override getKeywords(): string[] {
    const base = super.getKeywords();
    const nameTokens = this.shortDescription
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length > 0);
    return Array.from(new Set([...base, ...nameTokens]));
  }

  // --- Conduit surface ---------------------------------------------------

  /**
   * Conduit registry: a Door advertises Light, Sight, and Movement
   * conduits, all gated on `isOpen()`. Closed Door → all three
   * return 0 / false. The dual-tag exposure pattern follows
   * `Window.getConduits()` — wrappers rebadge `conduitKind` so a
   * single Door instance can serve all three channel queries.
   */
  public override getConduits(): readonly Conduit[] {
    return [
      lightConduitFor(this),
      lineOfSightFor(this),
      movementConduitFor(this),
      smellConduitFor(this),
      soundConduitFor(this),
    ];
  }

  public transmissivity(_from: BoundarySide, _to: BoundarySide): number {
    // v1 Door: binary open/closed. A future muffled-door subclass
    // could return a partial transmissivity instead.
    return this.isOpen() ? 1 : 0;
  }

  public canSeeThrough(_from: BoundarySide, _to: BoundarySide): boolean {
    return this.isOpen();
  }

  public canPassThrough(
    _from: BoundarySide,
    _to: BoundarySide,
    _mode: string
  ): boolean {
    return this.isOpen();
  }

  /**
   * Detach this door from every Exit currently referencing it AND
   * from its Boundary anchors on each side's host. The first step
   * mirrors pre-retrofit behaviour — Exit.door slots clear, the
   * door becomes a free-standing Thing addressable as inventory.
   * The second step (super.detach) clears each room's
   * BoundaryAnchor fixture so the cross-boundary light walk no
   * longer passes through this door.
   *
   * Idempotent.
   */
  public override detach(): void {
    const exits = [...this.attachedTo];
    for (const exit of exits) {
      exit.setDoor(null);
    }
    this.attachedTo.clear();
    super.detach();
  }

  // onDestruct is inherited from Boundary, which calls our
  // overridden detach() (clearing both attachedTo and Boundary
  // anchors) and then destructs the anchors. No override needed
  // here — the Boundary chain is the single source of truth for
  // destruct choreography.
}

function lightConduitFor(door: Door): LightConduit {
  return {
    conduitKind: 'light',
    transmissivity(from, to) {
      return door.transmissivity(from, to);
    },
  };
}

function lineOfSightFor(door: Door): LineOfSight {
  return {
    conduitKind: 'sight',
    canSeeThrough(from, to) {
      return door.canSeeThrough(from, to);
    },
  };
}

function movementConduitFor(door: Door): MovementConduit {
  return {
    conduitKind: 'movement',
    canPassThrough(from, to, mode) {
      return door.canPassThrough(from, to, mode);
    },
  };
}

function smellConduitFor(door: Door): SmellConduit {
  return {
    conduitKind: 'smell',
    // v1 Door: closed → 0 (blocks smell), open → 1 (transparent).
    transmissivity(from, to) {
      return door.transmissivity(from, to);
    },
  };
}

function soundConduitFor(door: Door): SoundConduit {
  return {
    conduitKind: 'sound',
    // v1 Door: binary open/closed. Future muffled-door subclasses
    // can return a partial transmissivity (~0.01 = -20 dB) instead.
    transmissivity(from, to) {
      return door.transmissivity(from, to);
    },
  };
}
