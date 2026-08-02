/**
 * Boundary — the shared abstraction for "anything that connects two
 * Adornable Containers and gates channels (light, sight, movement,
 * future sound) between them."
 *
 * A Boundary is a `Thing`: it has identity, `Visible` and `Perceptible`
 * surfaces (both inherited from Thing's default composition), and (via
 * `Containable` from Thing) can become inventory if detached from both
 * sides — same shape as a broken Door. It is NOT in either room's
 * `getContents()`. It surfaces on each side via a `BoundaryAnchor`
 * fixture that sits in the host's `Adornable.getFixtures()`.
 *
 * Composition: just `Thing` — Visible/Perceptible come baked in.
 * Subclasses that need closed/open state (`Window` shutters, `Door`)
 * compose `Sealable` themselves.
 *
 * Conduit registry: a Boundary subclass implements a subset of the
 * Conduit interfaces (LightConduit, LineOfSight, MovementConduit, …)
 * to declare which channels pass through it. The base class returns
 * an empty array; subclasses override `getConduits()` to list their
 * own. The propagation walks consume the registry directly — no
 * caching.
 *
 * Anchor model: a Boundary has two slots, `anchorA` / `anchorB`,
 * filled at install time by `BoundaryApi`. The anchors are the
 * per-side proxies in each host's `getFixtures()`. The pair plus the
 * Boundary is the runtime triple `BoundaryApi` manages — the spec
 * calls this the symmetric two-bearing model with the existing
 * `DoorBearingMixin` deliberately kept distinct (see
 * `docs/subsystems/light.md § Naming: BoundaryAnchor vs DoorBearing`).
 *
 * Persistence: Boundary itself is a Thing — its persistent fields are
 * subclass-specific (`Window.baseTransmissivity`, etc.). The two
 * anchors are runtime-only. For v1, anchor wiring is hydrate-only:
 * seed code constructs the Boundary, calls
 * `BoundaryApi.attachExistingBoundary`, and the result lives in
 * memory as long as the host rooms do.
 */

import Thing from '../stuff/Thing';
import type { Stuff } from '../stuff/Stuff';
import type { Conduit, BoundarySide } from './Conduit';
import type { BoundaryAnchor } from './BoundaryAnchor';
import type { Adornable } from './Adornable';
import { StuffApi } from '../../api/stuff';
import type { FieldMeta } from '../mixin';

export class Boundary extends Thing {
  /**
   * The two per-side anchors that surface this Boundary in each
   * host's `Adornable.getFixtures()`. Filled by
   * `BoundaryApi.attachExistingBoundary`; cleared by `detach()`.
   *
   * Not persistent — anchors are runtime-only; the Stuff-reference
   * cross-link to a per-side fixture follows the
   * `Containable.environment` precedent (composing classes wanting
   * survive-restart anchors would supply a custom `persistenceHandler`,
   * but v1 has no such use case).
   *
   * Public read access goes through `getAnchorA()` / `getAnchorB()` /
   * `getAnchors()`. Mutation is `BoundaryApi`'s job.
   */
  static fieldMeta: FieldMeta = {
    // An anchor exists only to surface THIS boundary on one host; it
    // has no meaning once the boundary is gone, so the boundary's death
    // is the anchor's death. The `detach()` policy (removing each
    // anchor from its host's fixtures) stays hand-written in
    // `onDestruct` — see the note there for why it must not null these.
    anchorA: { ref: 'instance', lifetime: 'owned' },
    anchorB: { ref: 'instance', lifetime: 'owned' },
  };

  protected anchorA: BoundaryAnchor | null = null;
  protected anchorB: BoundaryAnchor | null = null;

  /**
   * Marker so `Adornable.getFixtureBoundaries()` can dedupe via a
   * cheap structural test rather than importing this class. Set on
   * the BoundaryAnchor side, not here — included as a parallel
   * doc note for readers wondering why this class lacks the marker.
   */

  public getAnchorA(): BoundaryAnchor | null {
    return this.anchorA;
  }

  public getAnchorB(): BoundaryAnchor | null {
    return this.anchorB;
  }

  public getAnchors(): readonly [BoundaryAnchor | null, BoundaryAnchor | null] {
    return [this.anchorA, this.anchorB];
  }

  /**
   * Side opposite of the supplied anchor's side. Returns 'B' for an
   * 'A' anchor and vice versa, regardless of whether that anchor is
   * still wired to this Boundary — pure derivation from the side tag.
   */
  public getOtherSide(anchor: BoundaryAnchor): BoundarySide {
    return anchor.getSide() === 'A' ? 'B' : 'A';
  }

  /** The other slot's anchor, or null if it isn't wired. */
  public getOtherAnchor(anchor: BoundaryAnchor): BoundaryAnchor | null {
    if (anchor === this.anchorA) return this.anchorB;
    if (anchor === this.anchorB) return this.anchorA;
    return null;
  }

  /**
   * Convenience: walk through this Boundary from one host to its
   * counterpart. Returns null if the other side isn't wired or its
   * anchor has lost its `adornedTo` back-reference.
   */
  public getOtherHost(host: Stuff & Adornable): (Stuff & Adornable) | null {
    if (this.anchorA?.getAdornedTo() === host) {
      return this.anchorB?.getAdornedTo() ?? null;
    }
    if (this.anchorB?.getAdornedTo() === host) {
      return this.anchorA?.getAdornedTo() ?? null;
    }
    return null;
  }

  /**
   * Conduit registry. Default empty — subclasses override to list
   * each `Conduit` interface they implement (e.g.
   * `[this satisfies LightConduit, this satisfies LineOfSight]`).
   * Walks consume the array directly; no caching.
   */
  public getConduits(): readonly Conduit[] {
    return [];
  }

  /**
   * BoundaryApi-only seam: install the two anchors. Public so the
   * Api can call across module boundaries; not intended for
   * application code (the Api wraps this with the host wiring).
   *
   * Idempotent for the no-change case; rejects an attempt to
   * re-install over already-occupied slots — that would silently
   * orphan the previous anchors. The Api always destructs first.
   */
  public _setAnchors(a: BoundaryAnchor, b: BoundaryAnchor): void {
    if (this.anchorA && this.anchorA !== a) {
      throw new Error(
        'Boundary._setAnchors: side A is already wired; detach first.'
      );
    }
    if (this.anchorB && this.anchorB !== b) {
      throw new Error(
        'Boundary._setAnchors: side B is already wired; detach first.'
      );
    }
    this.anchorA = a;
    this.anchorB = b;
  }

  /**
   * Internal seam used by an anchor's `onDestruct` to clear its
   * own slot when the anchor is being torn down (e.g., its host is
   * destructing). Idempotent.
   */
  public _clearAnchor(anchor: BoundaryAnchor): void {
    if (this.anchorA === anchor) this.anchorA = null;
    if (this.anchorB === anchor) this.anchorB = null;
  }

  /**
   * Walk both anchors, removing each from its host's `getFixtures()`
   * and clearing the slot. Idempotent. Does NOT destruct the anchors
   * — the caller decides whether to do that. Mirror of
   * `Door.detach()`.
   */
  public detach(): void {
    this._detachAnchorsOnly();
  }

  /**
   * Subclass-bypass seam: same logic as `detach()`, callable from
   * Stuff that wants to migrate boundary anchors without invoking a
   * subclass's overridden `detach` (e.g., `ExitableVessel`
   * relocating a `Door`'s boundary between (vessel, oldEnv) and
   * (vessel, newEnv) without touching the Door's `attachedTo` set).
   *
   * Public so cross-module callers (the ExitableVessel migration
   * helpers, BoundaryApi) can reach it; not part of the Boundary's
   * inter-Stuff contract — application code should always use
   * `BoundaryApi.attachExistingBoundary` / `BoundaryApi.destruct`.
   */
  public _detachAnchorsOnly(): void {
    const a = this.anchorA;
    const b = this.anchorB;
    this.anchorA = null;
    this.anchorB = null;
    if (a) {
      const host = a.getAdornedTo();
      if (host) host.removeFixture(a);
    }
    if (b) {
      const host = b.getAdornedTo();
      if (host) host.removeFixture(b);
    }
  }

  /**
   * Subclass-bypass seam combining `_detachAnchorsOnly` with
   * destruction of the orphaned anchors. The Boundary itself stays
   * alive and ready to be re-anchored. Used by
   * ExitableVessel's onMoved / setDoor migration so a Door survives
   * the vessel relocation while its anchor pair migrates.
   */
  public _detachAndDestructAnchors(): void {
    const orphaned: BoundaryAnchor[] = [];
    if (this.anchorA) orphaned.push(this.anchorA);
    if (this.anchorB) orphaned.push(this.anchorB);
    this._detachAnchorsOnly();
    for (const anchor of orphaned) {
      StuffApi.destruct(anchor as unknown as Stuff);
    }
  }

  /**
   * Destroy choreography: detach first (back-refs), then destruct
   * the anchors that were attached. Mirrors Door's `detach()`-then-
   * cleanup pattern, but Boundary owns the anchors so it also
   * destructs them.
   */
  public onDestruct(): void {
    // POLICY only: unhook each anchor from the host it adorns.
    //
    // This deliberately does NOT call `detach()` any more. The cascade
    // and the slot-clearing are declared (`anchorA`/`anchorB` are
    // `{ ref: 'instance', lifetime: 'owned' }`) and belong to slot 2.5 —
    // and `detach()` nulls both slots, so calling it here would leave
    // 2.5 nothing to destruct and the anchors would silently survive.
    // The fixture removal is the genuinely extra work and stays.
    for (const anchor of [this.anchorA, this.anchorB]) {
      if (!anchor) continue;
      const host = anchor.getAdornedTo();
      if (host) host.removeFixture(anchor);
    }
    super.onDestruct();
  }
}
