/**
 * PlacingMixin — a Stuff that offers one or more **placements**: named
 * ways of sitting on or in it.
 *
 * A placement is the relation *where inside its container a thing sits*,
 * and it is named by the preposition a player types: `on` a desk, `in` a
 * compartment, `from` a hook. One host may offer several
 * (`placements: [on, in]` — a range is a firebox and a hot plate), and a
 * host that says nothing offers `on`, which is what every shipped
 * surface did before the relation had a name.
 *
 * Placement is auxiliary to containment, not a replacement for it. An
 * apple on a desk has `container = the desk's container` (the room) and
 * `placement = { host: the desk, name: 'on' }`. Placing doesn't enclose
 * — the member row says whether the relation encloses, and `in` does.
 *
 * No storage on the mixin itself for the placed items. `getPlaced()`
 * lazily walks the host's environment and filters by
 * `Containable.getPlacement()` resolving to this host. The Placing host
 * carries only the per-host MQL-keyword bridge field
 * (`userFacingDetail`), the offered names, and the per-host `canPlace`
 * veto.
 *
 * **Two composition refusals**, both enforced at runtime by the
 * `__validateComposition__` hook `StuffApi.register` dispatches once per
 * concrete class:
 *
 * 1. A Placing host MUST compose `ContainableMixin` — the host has to
 *    live somewhere for the lazy walk to have an environment. This is
 *    what keeps `Location` out: a room is not a thing you put things on,
 *    its floor is.
 * 2. A Placing host must NOT compose `ExitableMixin` — a thing you can
 *    go inside cannot also be something you put things on, because
 *    *which exits does each region afford* is a question the model
 *    refuses to answer. Put a `Fitting` or a `Chamber` in its contents
 *    instead.
 *
 * PlacingMixin does NOT require `Container` on the host. A simple table
 * has no interior — just a top. A desk with a drawer composes both, and
 * each works independently.
 *
 * See `docs/subsystems/spatial.md` and the `Placement` vocabulary Idea
 * (`/platform/idea/Placement/<name>`).
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import { Mixins } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { VetoResult } from '../errors';
import type { Containable } from './Containable';
import { MixinApi, type AnyConstructor } from '../../api/mixin';

/**
 * Public shape provided by PlacingMixin.
 */
export interface Placing {
  /**
   * The placement names this host offers, primary first. Defaults to
   * `['on']` — every host that says nothing is a surface, which is
   * exactly what they all were. Authorable per row.
   */
  getPlacements(): readonly string[];
  setPlacements(names: readonly string[]): void;

  /**
   * Items currently placed on this host. Computed lazily by walking the
   * host's environment and filtering by
   * `Containable.getPlacement()?.host === this`. With `name`, only the
   * items placed under that member. Returned readonly; mutate via
   * `ContainmentApi.place` / `ContainmentApi.move`.
   */
  getPlaced(name?: string): readonly (Stuff & Containable)[];

  /**
   * Resolve a typed preposition to one of this host's placement names.
   * Primary word first (`words[0]` of the member's row), then any
   * secondary word. With no word: the sole member when there is one,
   * else the first offered. `null` when the word matches nothing.
   */
  resolvePlacement(word?: string): string | null;

  /**
   * MQL keyword bridge. If set, `put X on <keyword>` resolves the
   * keyword against the host's Detailed map and lands on this host.
   * Mirrors `SlotSpec.userFacingDetail`
   * (see slot.md § Detail-targeted resolution).
   */
  getUserFacingDetail(): string | undefined;
  setUserFacingDetail(v: string | undefined): void;

  /**
   * Per-host gate on placing `item` under the member `name`. Defaults
   * to refusing a name this host does not offer and, once the
   * vocabulary ships, refusing an enclosing member on a shut host;
   * authors override to reject specific items (a fragile shelf rejects
   * heavy items; a sloped surface rejects round ones; a wax tabletop
   * rejects hot ones). The refusal's `reason` is what the verb reads
   * into its prose, so name it for a player.
   */
  canPlace(item: Stuff & Containable, name: string): VetoResult;

  /**
   * ⭐ **How much of a thing placed here the air can reach**, `[0, 1]`.
   *
   * Drying is **surface-limited** — the air has to get to the water. A ham
   * on a slatted rack dries all over; the same ham flat on a stone slab
   * dries on top and goes off underneath; cheese sits on open shelves and
   * turf is built into an openwork lattice for exactly this reason; and a
   * ham hung from a hook is in the air on every side.
   *
   * `1` is the default, because a host a thing is *put on* to be worked
   * with is normally an airy one, and because the alternative was a list of
   * blessed drying furniture. An author who wants a close, stifling host
   * turns the number down — which is the whole affordance: a drying rack, a
   * meat hook, a cheese shelf, a turf stack, a wire line and a bad drying
   * shed all come out of rows.
   *
   * ⚠ This is the *host's* claim about its own airiness, not a claim
   * about the room. Read by `WaterActivityMixin`'s two-way arm off
   * `Containable.getPlacement()`; a thing merely dropped on the floor is
   * placed on nothing and reads the `cure.groundExposure` dial instead.
   */
  getAirExposure(): number;
  setAirExposure(v: number): void;

  /** Public so the Hydrator can reflect into it. Not the contract. */
  airExposure: number;
  /** Public so the Hydrator can reflect into it. Not the contract. */
  placements: string[];
}

export function PlacingMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class PlacingMixin extends Base {
    // Mixin marker for detection by MixinApi
    static _mixinName: string = 'PlacingMixin';

    static fieldMeta: FieldMeta = {
      userFacingDetail: { persistent: true, authorable: true },
      airExposure: { persistent: true, authorable: true },
      placements: { persistent: true, authorable: true },
    };

    /**
     * Composition-time check — the two refusals in the module
     * docstring. Dispatched once per concrete class by
     * `StuffApi.register`.
     */
    static __validateComposition__(ctor: AnyConstructor): void {
      const name = (ctor as { name?: string }).name ?? 'class';
      if (!MixinApi.hasMixin(ctor, Mixins.Containable)) {
        throw new Error(
          `${name} composes PlacingMixin but is missing ` +
            `ContainableMixin — a Placing host has to live in an ` +
            `environment for getPlaced() to walk.`,
        );
      }
      if (MixinApi.hasMixin(ctor, Mixins.Exitable)) {
        throw new Error(
          `${name} composes both PlacingMixin and ExitableMixin — a ` +
            `thing you can go inside cannot also be something you put ` +
            `things on, because "what exits does each region afford" ` +
            `is a question this model refuses to answer. Put a Fitting ` +
            `or a Chamber in its contents instead (that is how a boot ` +
            `works), or, if the outside of this vehicle really must ` +
            `carry things, write the class.`,
        );
      }
    }

    protected userFacingDetail: string | undefined = undefined;

    /** `[0, 1]` — how much of a placed thing the air reaches. Default airy. */
    public airExposure = 1;

    /** The offered members, primary first. A bare host is a surface. */
    public placements: string[] = ['on'];

    getPlacements(): readonly string[] {
      const v = this.placements;
      if (!Array.isArray(v) || v.length === 0) return ['on'];
      return v;
    }

    setPlacements(names: readonly string[]): void {
      this.placements = [...names];
    }

    getPlaced(name?: string): readonly (Stuff & Containable)[] {
      // Lazy walk: items in our environment placed on us. For a desk in
      // a room, the environment is the room; apples placed on the desk
      // have container = room, placement host = desk.
      const self = this as unknown as Stuff & Containable;
      const env = self.getContainer();
      if (!env) return [];
      const candidates = env.getContents();
      const selfStuff = this as unknown as Stuff;
      return candidates.filter((c) => {
        if (!MixinApi.isContainable(c)) return false;
        const placement = c.getPlacement();
        if (placement === null) return false;
        if (name !== undefined && placement.name !== name) return false;
        return (placement.host as Stuff).stuffId === selfStuff.stuffId;
      }) as readonly (Stuff & Containable)[];
    }

    resolvePlacement(word?: string): string | null {
      const offered = this.getPlacements();
      if (word === undefined) {
        return offered[0] ?? null;
      }
      const w = word.toLowerCase();
      // Primary word first: a host offering both `on` and `from` takes
      // `put X on host` as `on`, because `on` is `on`'s primary.
      for (const nm of offered) {
        if (wordsFor(nm)[0] === w) return nm;
      }
      for (const nm of offered) {
        if (wordsFor(nm).includes(w)) return nm;
      }
      return null;
    }

    getUserFacingDetail(): string | undefined {
      return this.userFacingDetail;
    }
    setUserFacingDetail(v: string | undefined): void {
      this.userFacingDetail = v;
    }

    getAirExposure(): number {
      const v = this.airExposure;
      if (!Number.isFinite(v)) return 1;
      return v < 0 ? 0 : v > 1 ? 1 : v;
    }

    setAirExposure(v: number): void {
      if (!Number.isFinite(v)) return;
      this.airExposure = v < 0 ? 0 : v > 1 ? 1 : v;
    }

    canPlace(_item: Stuff & Containable, name: string): VetoResult {
      if (!this.getPlacements().includes(name)) {
        return { ok: false, reason: 'no-such-placement' };
      }
      // Default: accept any Containable under an offered member.
      // Subclasses / shadows override for shape-specific gates
      // (capacity, weight, temperature). The `shut` clause for an
      // enclosing member lands with the vocabulary (W2).
      return { ok: true };
    }
  };
}

/**
 * The words a member accepts, primary first. Until the `Placement`
 * vocabulary ships (W2) this is the one shipped member's fixed map;
 * `Placing.resolvePlacement` is the only reader.
 */
function wordsFor(name: string): readonly string[] {
  return name === 'on' ? ['on', 'onto'] : [name];
}
