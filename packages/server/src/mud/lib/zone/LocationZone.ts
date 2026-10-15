/**
 * LocationZoneMixin — the half of a spatial zone that HOLDS ROOMS.
 *
 * Until the maritime build this surface lived on `SpatialZone` itself,
 * which made "a region in space" and "a set of member Locations" one
 * claim. They are two. A grid of rooms (`CartesianZone`) and a cluster of
 * spheres (`SphericalZone`) hold Locations; an `Expanse` — a sea, a
 * desert, a void — is a region in space whose points of interest are
 * Ideas, and nothing is ever inside its frame. Composing this mixin is
 * what says *Locations live here*; a frame that does not compose it
 * inherits nothing to guard against.
 *
 * The zone back-reference is still written only by a `SpatialZone`:
 * `Stuff.setZone` is gated `FromSpatialZone` with `includeSubclasses`,
 * and the caller that policy reads is this zone instance, so the move of
 * the method body into a mixin changes nothing about who may write it.
 */

import type Location from '../stuff/Location';
import type { VetoResult } from '../errors';
import type { MixinConstructor } from '../mixin';
import type { SpatialZone } from './SpatialZone';
import type { Stuff } from '../stuff/Stuff';
import { StuffApi } from '../../api/stuff';

export interface LocationZone {
  getLocations(): ReadonlySet<Location>;
  addLocation(location: Location): void;
  removeLocation(location: Location): boolean;
  contains(location: Location): boolean;
  canDestruct(): VetoResult;
}

export function LocationZoneMixin<TBase extends MixinConstructor<SpatialZone>>(
  Base: TBase
) {
  return class LocationZoneMixin extends Base implements LocationZone {
    static _mixinName: string = 'LocationZoneMixin';

    /**
     * Locations that live in this zone. Populated by `addLocation()`.
     * Host-internal storage; external callers go through
     * `getLocations()` / `contains()`.
     *
     * `Location.zone` (on the Stuff base) is the back-reference stamped
     * when the location is added.
     */
    protected locations: Set<Location> = new Set();

    /** Horizon targets already stood up from here (runtime only). */
    private sightedTargets: Set<string> | null = null;

    public getLocations(): ReadonlySet<Location> { return this.locations; }

    /**
     * Mark a location as belonging to this zone. Subclasses extend to
     * capture coordinates (CartesianZone stamps grid position,
     * SphericalZone stamps the focus tuple).
     */
    public addLocation(location: Location): void {
      this.locations.add(location);
      location.setZone(this as unknown as SpatialZone);
      this.standUpAttached(location);
      this.lookOutFrom(location);
    }

    /**
     * ⭐⭐ **What belongs with a room loads with the room** (the scan sweep,
     * 2026-10-14): the house that operates it, the structure it is part
     * of, the institution over its extent, the fixtures that seat in it —
     * read off the location graph's record, where each is DERIVED from a
     * reference the content already authors pointing at the place. Nothing
     * is booted, nothing is searched, and nothing is written twice.
     *
     * Kicked, never awaited: `addLocation` is a registration, and a ship
     * standing up reaches back for the sea it sails on. A caller that must
     * have the house awaits it through the employment path.
     */
    private standUpAttached(location: Location): void {
      const path = location.getIdentityPath() ?? location.getTemplatePath();
      if (!path) return;
      void import('../../api/navigation')
        .then(({ NavigationApi }) => NavigationApi.attachedTo(path))
        .then((paths) => {
          for (const p of paths) {
            void StuffApi.singleton<Stuff>(p).catch((err) =>
              console.warn(`LocationZone: '${p}', attached to '${path}', did not stand up:`, err),
            );
          }
        })
        .catch(() => undefined);
    }

    /**
     * ⭐ **What can be seen from a room loads with the room** (maritime
     * review, 2026-10-14), as its props do: the zones and seas its
     * `horizon` names are stood up — and with them the structures attached
     * within them — when the first room looking out at them is. Nothing is
     * loaded at boot and nothing is searched for.
     *
     * ⚠ It cannot cascade: a zone stood up only because somebody can SEE
     * it has no room in it, so it never looks out itself. Kicked, not
     * awaited — `addLocation` is a registration, and a horizon read made
     * the instant a room appears sees whatever has stood up by then.
     */
    private lookOutFrom(location: Location): void {
      // A zone's towers are the structures attached within it.
      const standStructuresWithin = (zonePath: string): void => {
        void import('../../api/navigation')
          .then(({ NavigationApi }) => NavigationApi.attachedWithin(zonePath, 'structure'))
          .then((paths) => {
            for (const p of paths) void StuffApi.singleton<Stuff>(p).catch(() => null);
          })
          .catch(() => undefined);
      };
      const own = location.getHorizon();
      const named = own ?? (this as unknown as SpatialZone).peekField<string[]>('horizon');
      if (!Array.isArray(named)) return;
      this.sightedTargets ??= new Set();
      for (const target of named) {
        if (this.sightedTargets.has(target)) continue;
        this.sightedTargets.add(target);
        standStructuresWithin(target);
        void StuffApi.singleton<Stuff>(target).catch((err) => {
          this.sightedTargets?.delete(target);
          console.warn(`LocationZone: horizon target '${target}' did not stand up:`, err);
        });
      }
    }

    /** Remove a location from this zone. Clears the back-reference. */
    public removeLocation(location: Location): boolean {
      const removed = this.locations.delete(location);
      if (removed && location.getZone() === (this as unknown as SpatialZone)) {
        location.setZone(null);
      }
      return removed;
    }

    /** Does this zone contain the given location? */
    public contains(location: Location): boolean {
      return this.locations.has(location);
    }

    /**
     * Refuse to destruct a zone that still holds rooms. The caller must
     * drain the member locations (destruct or relocate) first. Refusal is
     * bypassable via `StuffApi.forceDestruct` (admin-gated).
     *
     * @hook Invoked by `StuffApi.destruct` first, before `onDestruct`.
     *   **Veto** — return `{ ok: false, reason }` to refuse destruction
     *   (raises `DestructError`) or `{ ok: true }` to allow.
     *   `forceDestruct` still fires it (so observers run) but ignores the
     *   veto. There is no base declaration on `Stuff`; implement on any
     *   subclass that guards its own destruction — this declaration is
     *   the canonical contract for the optional hook.
     */
    public canDestruct(): VetoResult {
      if (this.locations.size > 0) {
        return {
          ok: false,
          reason:
            `cannot destruct zone '${(this as unknown as SpatialZone).getName()}' with ` +
            `${this.locations.size} live location(s); ` +
            `destruct locations first`,
        };
      }
      return { ok: true };
    }
  };
}
