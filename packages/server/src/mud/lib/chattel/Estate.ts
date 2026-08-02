/**
 * EstateMixin — **owner-based persistence**: the second persistence scope.
 *
 * A host that composes this owns an *estate* — every stamped good it holds
 * title to, wherever that good happens to sit. It is the counterpart to
 * `ContainerMixin.captureSlice`'s skip rule (D2): a host's contents slice
 * drops goods someone has been *stamped* as owning, and this is where they
 * persist instead.
 *
 * Why the good cannot simply ride the room it stands in — the three
 * directions the old behaviour was wrong in (D1):
 *
 *   - a chair carried into a dorm became durably part of the ROOM, losing
 *     the connection between a good and its owner;
 *   - a guest's dropped possessions rode a stranger's record;
 *   - "move house" was impossible in principle.
 *
 * ## The `place` routing
 *
 * Each entry carries a `place` (D3), and restore routes on it:
 *
 *   - `'inventory'` — cloned into the owner's own container.
 *   - `'storage'`   — cloned **nothing at all**. The good is live in the
 *                     registry and in this record and has no presence in
 *                     the world. This is what makes storage free: it is the
 *                     absence of a placement, not a place.
 *   - a room identity — **deferred to that room's materialize**, not done
 *                     here. That is what makes "my chair is in my living
 *                     room while I am at work" true.
 *
 * ## Capture is synchronous, which shapes everything
 *
 * `captureSlice` cannot await, so it cannot go to the store for the goods
 * it can no longer see. It serializes the host's **live estate map**:
 *
 *   - an entry whose good is live (in inventory, or standing in a room that
 *     is still loaded) is **re-captured fresh**, so state that changed since
 *     it was placed (a plant that grew, a lamp that burned down) is kept;
 *   - an entry whose good is not live is **carried forward verbatim** from
 *     the last capture, which is the only correct thing to do — the host has
 *     nothing newer to say about it.
 *
 * The remaining case is a good placed in a room that goes dormant **while
 * its owner is offline**. Nobody is live to re-capture it, so the room's own
 * capture pass reports it (`CaptureContext.noteOwnedGood`) and
 * `PersistableLogic` flushes it into this record asynchronously, after its
 * synchronous state build. Without that, a skipped good would be captured by
 * nobody and destroyed with the room — the guest-drop feature losing the
 * book instead of leaving it at your friend's.
 */

import type { MixinConstructor, FieldMeta } from "../mixin";
import type { Stuff } from "../stuff/Stuff";
import { CallSecurity, Final, Unshadowable } from "../security/decorators";
import { SecurityPolicies } from "../security/SecurityPolicies";
import {
  ESTATE_INVENTORY,
  ESTATE_STORAGE,
  type EstateEntry,
  type EstateSlice,
  type MixinSlice,
  type CaptureContext,
  type RestoreContext,
} from "../persistence/PersistenceSlice";

/**
 * Who may write an estate — three named principals and nothing else:
 *
 *   - the **chattel logic singleton**, when an act moves a good;
 *   - the **persistence logic singleton**, when the capture flush pushes a
 *     skipped good into an owner's estate;
 *   - the **host itself** (`SelfOnly`), because the spine restores every
 *     record *as its owning principal* — so during `restoreSlice` the
 *     caller IS the host whose estate is being rebuilt, not the Logic that
 *     started the walk.
 *
 * That third arm is a real participant contract rather than a loophole: it
 * admits exactly one caller, and only for its own estate.
 */
const ByEstateWriters = SecurityPolicies.AnyOf(
  SecurityPolicies.FromTemplate("/obj/api/chattel"),
  SecurityPolicies.FromTemplate("/obj/api/persistable"),
  SecurityPolicies.SelfOnly,
);

/** The public surface an estate-bearing host exposes. */
export interface Estate {
  /** Every entry, in capture order. */
  getEstateEntries(): readonly EstateEntry[];
  /** The entry for `chattelId`, or null. */
  getEstateEntry(chattelId: string): EstateEntry | null;
  /** Privileged: add or replace one entry — spine/chattel-logic only. */
  _putEstateEntry(entry: EstateEntry, live: Stuff | null): void;
  /** Privileged: drop one entry (a released or destroyed good). */
  _dropEstateEntry(chattelId: string): void;
  /** The live instance backing `chattelId`, if one is loaded. */
  getEstateLive(chattelId: string): Stuff | null;
}

export function EstateMixin<TBase extends MixinConstructor<Stuff>>(
  Base: TBase,
) {
  class EstateMixin extends Base implements Estate {
    static _mixinName = "EstateMixin";

    /**
     * Nothing field-shaped: the whole layer is the slice below. Declaring
     * no persistent fields keeps a host that has never owned anything
     * byte-identical to its pre-estate record — the slice is emitted only
     * when there is something in it.
     */
    static fieldMeta: FieldMeta = {};

    /**
     * chattelId → entry. Transient (rebuilt by `restoreSlice`), because the
     * durable copy IS the slice. A `Map` rather than an array so the
     * spine's flush is an upsert.
     */
    private _estate: Map<string, EstateEntry> = new Map();

    /**
     * chattelId → the live good, when one is loaded. A **live-ref field**
     * (ref-shapes Pattern B): never persisted, dropped on eviction, and
     * consulted only to decide whether an entry can be re-captured fresh.
     */
    private _estateLive: Map<string, Stuff> = new Map();

    public getEstateEntries(): readonly EstateEntry[] {
      return [...this._estate.values()];
    }

    public getEstateEntry(chattelId: string): EstateEntry | null {
      return this._estate.get(chattelId) ?? null;
    }

    public getEstateLive(chattelId: string): Stuff | null {
      const live = this._estateLive.get(chattelId);
      if (live && !live.isDestroyed()) return live;
      if (live) this._estateLive.delete(chattelId);
      return null;
    }

    @CallSecurity(ByEstateWriters)
    @Final
    @Unshadowable
    public _putEstateEntry(entry: EstateEntry, live: Stuff | null): void {
      if (!entry.chattelId) return;
      this._estate.set(entry.chattelId, entry);
      if (live) this._estateLive.set(entry.chattelId, live);
      else this._estateLive.delete(entry.chattelId);
    }

    @CallSecurity(ByEstateWriters)
    @Final
    @Unshadowable
    public _dropEstateEntry(chattelId: string): void {
      this._estate.delete(chattelId);
      this._estateLive.delete(chattelId);
    }

    /**
     * Serialize the estate. Re-captures every entry whose good is live and
     * carries the rest forward verbatim (see the class doc — capture is
     * synchronous and cannot reach what is not loaded).
     */
    static captureSlice(host: Stuff, ctx: CaptureContext): MixinSlice {
      const self = host as unknown as EstateMixin;
      const entries: EstateEntry[] = [];
      for (const entry of self.getEstateEntries()) {
        const live = self.getEstateLive(entry.chattelId);
        entries.push(
          live
            ? {
                ...entry,
                templatePath: live.getTemplatePath() ?? entry.templatePath,
                state: ctx.captureState(live),
              }
            : entry,
        );
      }
      return { entries } satisfies EstateSlice;
    }

    /**
     * Rebuild the map, then materialize by `place`. Only `inventory` puts
     * anything in the world from here — `storage` is deliberately nothing,
     * and a room identity is that room's job (D3/D4).
     */
    static async restoreSlice(
      host: Stuff,
      slice: MixinSlice,
      ctx: RestoreContext,
    ): Promise<void> {
      if (!("entries" in slice)) return;
      const self = host as unknown as Estate;
      for (const entry of (slice as EstateSlice).entries) {
        if (entry.place === ESTATE_STORAGE) {
          // Owned-but-unplaced. Nothing is cloned; the entry alone IS the
          // durable good. Eviction and lease-end land goods here, and they
          // are never destructed.
          self._putEstateEntry(entry, null);
          continue;
        }
        if (entry.place !== ESTATE_INVENTORY) {
          // Placed in a room. That room's materialize overlays it (D4), so
          // the entry is kept and no instance is minted here.
          self._putEstateEntry(entry, null);
          continue;
        }
        const item = (await ctx.restoreItem(
          { templatePath: entry.templatePath, state: entry.state, placement: {} },
          host,
        )) as Stuff | null;
        self._putEstateEntry(entry, item);
      }
    }
  }

  return EstateMixin;
}
