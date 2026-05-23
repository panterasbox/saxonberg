/**
 * SurfacedMixin — a Stuff that supports items resting on its surface.
 *
 * Resting is auxiliary to containment, not a replacement for it.
 * An apple on a desk has `container = the desk's container` (e.g.,
 * the room) and `restingOn = the desk`. Surfaced doesn't enclose;
 * it supports. See `docs/plans/affordance-verb-plan.md` § 2 for the
 * architectural rationale (Option D).
 *
 * No storage on the mixin itself for the supported items.
 * `getResting()` lazily walks the surface's environment and filters
 * by `Containable._restingOnPath` resolving to this host. The
 * Surfaced host only carries the per-host MQL-keyword bridge field
 * (`userFacingDetail`) and the per-host `canRest` veto.
 *
 * Composition constraint: SurfacedMixin requires `ContainableMixin`
 * on the host (the surface itself has to live somewhere — a
 * free-floating Surfaced has no environment to walk). Enforced at
 * runtime via the `__validateComposition__` hook that
 * `StuffApi.register` dispatches once per concrete class.
 *
 * SurfacedMixin does NOT require `Container` on the host. A simple
 * table doesn't have an interior — just a surface. A desk with a
 * drawer happens to compose both Container (for the drawer-as-part)
 * and Surfaced (for the apples on top); each mixin works
 * independently.
 */

import type { MixinConstructor } from '../mixin';
import { Mixins } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { Containable } from './Containable';
import { ContainmentApi } from '../../api/containment';
import { MixinApi, type AnyConstructor } from '../../api/mixin';

/**
 * Public shape provided by SurfacedMixin.
 */
export interface Surfaced {
  /**
   * Items currently resting on this surface. Computed lazily by
   * walking the surface's environment and filtering by
   * `Containable.getRestingOn() === this`. Returned readonly;
   * mutate via `ContainmentApi.placeOn` / `ContainmentApi.move`.
   */
  getResting(): readonly (Stuff & Containable)[];

  /**
   * MQL keyword bridge. If set, `put X on <keyword>` resolves the
   * keyword against the host's Detailed map and lands on this
   * surface. Mirrors `SlotSpec.userFacingDetail`
   * (see slot.md § Detail-targeted resolution).
   */
  getUserFacingDetail(): string | undefined;
  setUserFacingDetail(v: string | undefined): void;

  /**
   * Per-host gate. Defaults to true; authors override to reject
   * specific items (a fragile shelf rejects heavy items; a sloped
   * surface rejects round items; a wax tabletop rejects hot items).
   */
  canRest(item: Stuff & Containable): boolean;
}

export function SurfacedMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class SurfacedMixin extends Base {
    // Mixin marker for detection by MixinApi
    static _mixinName = 'SurfacedMixin';

    static persistentFields = ['userFacingDetail'];

    /**
     * Composition-time check: hosts composing SurfacedMixin MUST
     * also compose ContainableMixin so the lazy `getResting` walk
     * has an environment to iterate. Dispatched once per concrete
     * class by `StuffApi.register`.
     */
    static __validateComposition__(ctor: AnyConstructor): void {
      if (!MixinApi.hasMixin(ctor, Mixins.Containable)) {
        throw new Error(
          `${(ctor as { name?: string }).name ?? 'class'} composes ` +
            `SurfacedMixin but is missing ContainableMixin — a Surfaced ` +
            `host has to live in an environment for getResting() to ` +
            `walk.`,
        );
      }
    }

    protected userFacingDetail: string | undefined = undefined;

    getResting(): readonly (Stuff & Containable)[] {
      // Lazy walk: items in our environment whose restingOn is us.
      // For a desk in a room, the environment is the room; apples
      // resting on the desk have container = room, restingOn = desk.
      const self = this as unknown as Stuff & Containable;
      const env = self.getContainer();
      if (!env) return [];
      const candidates = ContainmentApi.getContents(env);
      const selfStuff = this as unknown as Stuff;
      return candidates.filter((c) => {
        if (!MixinApi.isContainable(c)) return false;
        const support = c.getRestingOn();
        if (support === null) return false;
        return (support as Stuff).stuffId === selfStuff.stuffId;
      }) as readonly (Stuff & Containable)[];
    }

    getUserFacingDetail(): string | undefined {
      return this.userFacingDetail;
    }
    setUserFacingDetail(v: string | undefined): void {
      this.userFacingDetail = v;
    }

    canRest(_item: Stuff & Containable): boolean {
      // Default: accept any Containable. Subclasses / shadows
      // override for shape-specific gates (capacity, weight,
      // temperature, etc.).
      return true;
    }
  };
}
