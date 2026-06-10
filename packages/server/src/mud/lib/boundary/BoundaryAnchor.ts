/**
 * BoundaryAnchor — per-side proxy for a `Boundary` in an `Adornable`
 * host's `getFixtures()`.
 *
 * Composition: `AdornmentMixin(Thing)`. A Thing because anchors have
 * identity and (via `Containable` from Thing) should never legitimately
 * land in a Container's `contents` while wired — the `Adornment`
 * pre-flight veto in `ContainmentApi.move` enforces the not-portable
 * invariant.
 *
 * One BoundaryAnchor per side of a Boundary. The anchor knows:
 *   - its `boundary` (the shared Stuff this anchor proxies for);
 *   - its `side` ('A' | 'B' — assigned at creation time by
 *     `BoundaryApi`);
 *   - its host (`adornedTo`, supplied by the host's
 *     `Adornable.addFixture`).
 *
 * The anchor itself carries no Conduit or Sealable state — those live
 * on the Boundary subclass. The anchor is the dedupable handle that
 * the propagation walks discover when iterating `getFixtures()`.
 *
 * Persistence: `boundary` is a Stuff cross-reference and follows the
 * `Containable.environment` precedent (no `persistentFields` entry).
 * `side` is a tag string and could be persisted, but v1 anchor wiring
 * is hydrate-only — seed code rebuilds the boundary triple at boot.
 */

import Thing from '../stuff/Thing';
import { AdornmentMixin } from './Adornment';
import type { Boundary } from './Boundary';
import type { BoundarySide } from './Conduit';
import type { Stuff } from '../stuff/Stuff';
import type { Adornable } from './Adornable';

const BoundaryAnchorBase = AdornmentMixin(Thing);

export class BoundaryAnchor extends BoundaryAnchorBase {
  /**
   * Structural marker so fixtures can be recognized as anchors
   * without an `instanceof` (avoiding a tangled load order for the
   * spatial/perception folders). Read only through the
   * `isBoundaryAnchor` guard exported below.
   */
  public readonly _isBoundaryAnchor = true;

  /**
   * The shared Boundary this anchor proxies for. Maintained by
   * `BoundaryApi.attachExistingBoundary` (set) and
   * `Boundary.detach` / this anchor's own `onDestruct` (clear).
   * Not persistent — see file header.
   */
  protected boundary: Boundary | null = null;

  /**
   * Which side this anchor sits on. Set once at creation; does not
   * change for the lifetime of the anchor.
   */
  protected side: BoundarySide;

  constructor(side: BoundarySide = 'A') {
    super();
    this.side = side;
  }

  public getBoundary(): Boundary | null {
    return this.boundary;
  }

  public getSide(): BoundarySide {
    return this.side;
  }

  /**
   * Walk through the boundary to the other host. Convenience for the
   * propagation walks. Returns null when the boundary isn't wired,
   * the other anchor is missing, or the other anchor has lost its
   * `adornedTo` back-reference.
   */
  public getOtherHost(): (Stuff & Adornable) | null {
    if (!this.boundary) return null;
    const other = this.boundary.getOtherAnchor(this);
    if (!other) return null;
    return other.getAdornedTo();
  }

  /**
   * BoundaryApi-only seam: bind this anchor to a Boundary. Idempotent
   * for the same boundary; rejects re-binding to a different one.
   */
  public _setBoundary(boundary: Boundary): void {
    if (this.boundary && this.boundary !== boundary) {
      throw new Error(
        'BoundaryAnchor._setBoundary: anchor is already bound to a different Boundary.'
      );
    }
    this.boundary = boundary;
  }

  /**
   * Cleanup hook fired by `StuffApi.destruct(this)`. Clears the
   * boundary's slot for this anchor (so the boundary's
   * `getAnchorA()`/`B` no longer dangle). Removal from the host's
   * `getFixtures()` is the host's `Adornable.onDestruct`
   * responsibility — when an Adornable destructs, it walks its
   * fixtures and calls `StuffApi.destruct` on each — so this hook
   * doesn't need to call `removeFixture` itself.
   */
  public onDestruct(): void {
    if (this.boundary) {
      this.boundary._clearAnchor(this);
      this.boundary = null;
    }
  }
}

/**
 * Canonical narrowing guard for "this fixture is a BoundaryAnchor".
 * Reads the `_isBoundaryAnchor` structural marker rather than using
 * `instanceof`, so callers in load-order-sensitive folders (perception
 * modalities, `Adornable`) can narrow with only a *type* import of this
 * class — the marker keeps the check from forcing a runtime dependency
 * on the boundary class graph. The single source of truth for the four
 * call sites that previously open-coded the marker read.
 */
export function isBoundaryAnchor(fx: object): fx is BoundaryAnchor {
  return (fx as { _isBoundaryAnchor?: boolean })._isBoundaryAnchor === true;
}
