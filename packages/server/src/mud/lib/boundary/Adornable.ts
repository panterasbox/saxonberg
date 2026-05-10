/**
 * AdornableMixin — host of a `fixtures` set, parallel to ExitableMixin's
 * `exits` map.
 *
 * A Container with this mixin gains a separate, non-portable population
 * of Stuff attached *to* it: wall sconces, ceiling lamps, the per-side
 * `BoundaryAnchor` of a Boundary. Fixtures are NOT in `getContents()`;
 * they are surfaced separately via `getFixtures()` and (for
 * channel-shaped consumers) the convenience getters
 * `getFixtureBoundaries()` / `getFixtureLightSources()`. The latter are
 * the analog of `ExitableMixin.getExitDoors()` — collection helpers MQL
 * uses so a player can target a fixture by keyword without it living in
 * an inventory.
 *
 * Constraint: composed on `Stuff & Container`. Locations compose it for
 * free (this mixin layers in via `Location`), so every `CartesianLocation`
 * / `SphericalLocation` ships with `getFixtures()`. Vessels do not
 * compose it in v1 — there is no v1 use case for "fixture inside a
 * moving vessel" — but the constraint admits a future composition with
 * no surface change.
 *
 * Lifecycle: `onDestruct()` destructs every fixture before chaining
 * to super. The fixture's own `onDestruct()` is responsible for
 * unhooking from any Boundary it's an anchor of (see
 * `BoundaryAnchor.onDestruct`).
 *
 * Containment invariant: an `Adornment` whose `adornedTo` is non-null
 * cannot be moved into a Container's `contents` via
 * `ContainmentApi.move` — see the pre-flight veto in
 * `containment.ts`. Detaching the Adornment (set `adornedTo` to null
 * via `removeFixture`) is the prerequisite for moving it as inventory.
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { Container } from '../spatial/Container';
import type { Adornment } from './Adornment';
import { StuffApi } from '../../api/stuff';

// Forward declarations: the concrete `Boundary` and `LightSource`
// shapes are resolved structurally when Phase 4 wires through.
// Until then the helper getters live as filtered walks over
// `getFixtures()` and are typed against the eventual interfaces by
// way of the `_mixinName` marker check. Using imports here would
// drag in load-order tangles for files that do not exist yet, so
// these types are loose by design — the predicates live next to
// their owning class/mixin.
import type { Boundary } from './Boundary';
import type { BoundaryAnchor } from './BoundaryAnchor';

/** Public shape added by AdornableMixin. */
export interface Adornable {
  addFixture(f: Stuff & Adornment): boolean;
  removeFixture(f: Stuff & Adornment): boolean;
  hasFixture(f: Stuff & Adornment): boolean;
  getFixtures(): readonly (Stuff & Adornment)[];
  /**
   * Boundaries whose per-side `BoundaryAnchor` sits in this host's
   * fixtures, deduplicated. Parallel to `ExitableMixin.getExitDoors()`.
   * Useful for MQL `here` scope walks that want a single Boundary
   * per Boundary regardless of which anchor surfaced it.
   */
  getFixtureBoundaries(): Boundary[];
  /**
   * Fixtures composing `LightSourceMixin`, narrowed for the
   * propagation walk. Empty until Phase 3 lands; the surface is
   * declared from Phase 1 so callers can consume it with no churn.
   */
  getFixtureLightSources(): (Stuff & Adornment)[];
}

export function AdornableMixin<TBase extends MixinConstructor<Stuff & Container>>(
  Base: TBase
) {
  return class AdornableMixin extends Base {
    static _mixinName = 'AdornableMixin';

    /**
     * Fixtures attached to this host. Host-internal storage; external
     * callers go through `addFixture` / `removeFixture` / `getFixtures`.
     */
    protected fixtures: Set<Stuff & Adornment> = new Set();

    addFixture(f: Stuff & Adornment): boolean {
      if (this.fixtures.has(f)) return false;
      this.fixtures.add(f);
      f.setAdornedTo(this as unknown as Stuff & Adornable);
      return true;
    }

    removeFixture(f: Stuff & Adornment): boolean {
      if (!this.fixtures.delete(f)) return false;
      // Only clear the back-reference if it still points at us — a
      // re-attach to a different host would have repointed it
      // already, and we mustn't stomp that.
      if (f.getAdornedTo() === (this as unknown as Stuff & Adornable)) {
        f.setAdornedTo(null);
      }
      return true;
    }

    hasFixture(f: Stuff & Adornment): boolean {
      return this.fixtures.has(f);
    }

    getFixtures(): readonly (Stuff & Adornment)[] {
      return Array.from(this.fixtures);
    }

    getFixtureBoundaries(): Boundary[] {
      const seen = new Set<string>();
      const out: Boundary[] = [];
      for (const f of this.fixtures) {
        if (!isBoundaryAnchorMarker(f)) continue;
        const anchor = f as unknown as BoundaryAnchor;
        const boundary = anchor.getBoundary();
        if (!boundary) continue;
        const id = (boundary as unknown as Stuff).stuffId;
        if (seen.has(id)) continue;
        seen.add(id);
        out.push(boundary);
      }
      return out;
    }

    getFixtureLightSources(): (Stuff & Adornment)[] {
      const out: (Stuff & Adornment)[] = [];
      for (const f of this.fixtures) {
        if (isLightSourceMarker(f)) out.push(f);
      }
      return out;
    }

    /**
     * Tear down every fixture before chaining to super. A fixture's
     * own `onDestruct` is responsible for unhooking from any
     * Boundary it's an anchor of — see `BoundaryAnchor`.
     */
    onDestruct(): void {
      const toDestroy = Array.from(this.fixtures);
      for (const f of toDestroy) {
        StuffApi.destruct(f as unknown as Stuff);
      }
      this.fixtures.clear();
      super.onDestruct();
    }
  };
}

/**
 * Cheap structural check for "this fixture is a BoundaryAnchor". Avoids
 * an import cycle with `BoundaryAnchor.ts` and a hard dependency on
 * `MixinApi.isAdornment` introspection — the marker itself is what
 * `BoundaryAnchor` writes in its constructor.
 */
function isBoundaryAnchorMarker(f: object): boolean {
  return (f as { _isBoundaryAnchor?: boolean })._isBoundaryAnchor === true;
}

function isLightSourceMarker(f: object): boolean {
  // Phase 3 stamps `_isLightSourceFlag` on the LightSource mixin's
  // prototype; until then this returns false for every fixture, and
  // the propagation walk silently gets an empty list.
  const ctor = (f as { constructor?: { _mixinName?: string } | undefined })
    .constructor;
  // Walk the prototype chain looking for the LightSourceMixin marker.
  let proto: object | null = ctor as object | null;
  while (proto) {
    const named = (proto as { _mixinName?: string })._mixinName;
    if (named === 'LightSourceMixin') return true;
    proto = Object.getPrototypeOf(proto) as object | null;
  }
  return false;
}
