/**
 * PersistableMixin — the persistence-spine **host** capability.
 *
 * Composing this marks a `Stuff` as a persistence *host*: a singleton keyed
 * by its `templatePath` whose runtime state (its own declared fields, its
 * directly-held content, its worn gear) is captured into a
 * {@link PersistedRecord} and faithfully restored on materialize — so
 * property, inventory, and room contents survive residency eviction,
 * logout, and reload.
 *
 * A host opts in by composing this mixin **outermost** (so its
 * `cleanupOnDestruct` fires before `Container`/`Slotted` evacuate, and its
 * `applyPopulates` override wraps `Populates`). The capability is thin: the
 * capture/restore *logic* lives in the gated `PersistableApi` /
 * `PersistableLogic` pair, and per-mixin serialization is composed by the
 * framework walk (`MixinApi.getPersistenceContributors`). This mixin
 * contributes three host-side behaviors:
 *
 *   1. **Capture-on-destruct backstop** — `cleanupOnDestruct` synchronously
 *      snapshots the live content tree (before `Container` evacuates it) and
 *      fire-and-forgets the persist. Durable triggers (the residency sweep,
 *      logout, autosave, reload) `await` a full capture; this is the
 *      non-sweep-destruct safety net.
 *   2. **Declarative born-with seed** — a host declares its starting contents
 *      as data (`populates:` in its template, the same field a non-persistent
 *      container uses), and the establishing context lays them down EXACTLY
 *      ONCE via {@link Persistable.seedBornWith} on the no-record branch, then
 *      captures. Thereafter the record is authoritative and the seed never
 *      re-runs. The `applyPopulates` hydration hook only *retains* the specs —
 *      a persistable host is a bare shell at hydration (its key isn't set yet,
 *      so a `hasRecord` gate can't tell seed from restore), so the keyed
 *      holder drives the seed after stamping the key. This keeps born-with
 *      content as author-editable DATA rather than imperative code.
 *   3. **Materialize-on-register** — `postRegister` loads and restores every
 *      record scoped to this host after the shell is cloned.
 *
 * See [docs/subsystems/persistence.md] and
 * [docs/requirements/persistence-spine-requirements.md].
 */

import type { MixinConstructor } from "../mixin";
import type { Stuff, EvictionContext } from "../stuff/Stuff";
import type { VetoResult } from "../errors";
import type { PopulateSpec, Populates } from "../stuff/Populates";
import { MixinApi } from "../../api/mixin";
import { PersistableApi } from "../../api/persistable";

/** Public shape provided by PersistableMixin. */
export interface Persistable {
  /**
   * True once this host has been through its first
   * materialize/seed-then-persist gate. Read by the `applyPopulates`
   * override so a re-materialize never re-seeds.
   */
  isPersistenceHost(): boolean;

  /**
   * Whether this host actually persists. Default `!markForRevert()` (a host
   * marked for revert writes nothing on the way out); a host overrides to
   * opt out per-instance (an Avatar returns `!isGuest` — a guest is throwaway
   * and writes nothing). Consulted by `postRegister` / `cleanupOnDestruct`
   * here and by `PersistableLogic.capture` / `materialize`, so the opt-out
   * holds across every trigger.
   *
   * @hook Override to gate persistence per-instance.
   */
  shouldPersist(): boolean;

  /**
   * The explicit per-instance persistence key stashed at
   * materialize/capture. `null` for a host that has never been keyed (a
   * singleton whose owner derives from its scope). Reused by
   * capture-on-evict / autosave so a re-capture with no key writes back to
   * the same `(scope, key)` record. See {@link setPersistenceKey}.
   */
  getPersistenceKey(): string | null;

  /**
   * Stash the explicit per-instance persistence key (the record `owner`).
   * Written by `PersistableLogic` when a keyed capture/materialize resolves
   * a key; read back on a keyless re-capture.
   */
  setPersistenceKey(key: string): void;

  /**
   * Mark this live host for revert on its next destruct — its
   * `shouldPersist()` goes false, so the capture-on-destruct backstop (and
   * any residency capture) writes nothing. Used by an end-lease path to tear
   * down a live instance without re-writing the record it is about to
   * delete. A general spine seam (not dorm code).
   */
  markForRevert(): void;

  /**
   * Lay down the host's declared born-with contents (its template's
   * `populates:` specs, retained at hydration) — cloning each into this host
   * exactly once. The establishing context calls this on the **no-record
   * branch only** (a fresh instance with no saved state), then captures the
   * first record; on the has-record branch it restores instead and never
   * calls this. A no-op when the host declares no `populates:` (e.g. an
   * Avatar, whose loadout is seeded imperatively). Replaces per-host bespoke
   * seed methods with author-editable data.
   */
  seedBornWith(): Promise<void>;
}

export function PersistableMixin<
  TBase extends MixinConstructor<Stuff & Partial<Populates>>,
>(Base: TBase) {
  return class PersistableMixin extends Base implements Persistable {
    static _mixinName = "PersistableMixin";

    /** Stashed explicit persistence key; null until first keyed op. */
    protected _persistenceKey: string | null = null;

    /** Set true by `markForRevert()` — folds into `shouldPersist()`. */
    protected _reverting = false;

    /**
     * Born-with content specs retained from the `populates` hydration hook
     * (transient — NOT persisted; re-populated on every clone/restore). Laid
     * down once by {@link seedBornWith} on the no-record branch. Empty for a
     * host that declares no `populates:`.
     */
    protected _bornWithSpecs: PopulateSpec[] = [];

    isPersistenceHost(): boolean {
      return true;
    }

    shouldPersist(): boolean {
      return !this._reverting;
    }

    getPersistenceKey(): string | null {
      return this._persistenceKey;
    }

    setPersistenceKey(key: string): void {
      this._persistenceKey = key;
    }

    markForRevert(): void {
      this._reverting = true;
    }

    /**
     * Residency veto — the persistable-host divergence. A plain
     * `Container` vetoes eviction while it holds contents (they'd be
     * lost); a persistable host does not, because its contents are
     * captured first (the residency sweep awaits `PersistableApi.capture`
     * before culling). So this override simply falls through to `super` —
     * letting the *other* composed vetoes still apply (a live Avatar's
     * `HasInteractive`, a `WarrenMember`) — WITHOUT re-imposing the
     * contents-count veto. `ContainerMixin.canEvict` skips its own
     * contents veto for a persistable host (see Container.ts), so the
     * super-chain here reaches those other layers cleanly.
     */
    public canEvict(context: EvictionContext): VetoResult {
      return super.canEvict(context);
    }

    /**
     * A persistable host does not seed at *hydration* — it is a bare shell
     * here (its per-instance key isn't set yet, so a `hasRecord` gate can't
     * tell a first seed from a restore, and seeding now would double-seed on
     * every wake). So this override does NOT delegate to `PopulatesMixin`;
     * instead it **retains** the declared specs so the establishing context
     * can lay them down exactly once, keyed, via {@link seedBornWith} on the
     * no-record branch. The `populates:` field stays author-editable DATA;
     * only *when* it runs moves to the keyed holder.
     */
    async applyPopulates(specs: PopulateSpec[]): Promise<void> {
      this._bornWithSpecs = Array.isArray(specs) ? specs.slice() : [];
    }

    /**
     * Lay down the retained born-with specs — cloning each into this host —
     * by delegating to the inner `PopulatesMixin` applier (`super`). Called by
     * the establishing context on the no-record branch only. A no-op when no
     * `populates:` was declared (empty specs → nothing to seed, and no
     * `PopulatesMixin` need be composed).
     */
    async seedBornWith(): Promise<void> {
      if (this._bornWithSpecs.length === 0) return;
      // Present at runtime whenever specs were retained (specs only arrive via
      // the Hydrator when `populates` is an instruction field, i.e. the host
      // composes PopulatesMixin below). The `?.` guards the vacuous case.
      await super.applyPopulates?.(this._bornWithSpecs);
    }

    /**
     * `postRegister` **no longer auto-drives persistence** (D1). The mixin
     * provides capture/restore; the **establishing context decides when and
     * with what key** — Avatar drives an explicit keyed materialize/capture
     * at login (`obj/Avatar.ts`), and `DormWarren.admit` drives a keyed
     * restore-or-seed per unit. So this override only preserves the chain.
     *
     * `super.postRegister` is optional-chained (persistable hosts compose
     * `PostRegistrationMixin`, but a host that doesn't still composes cleanly).
     */
    async postRegister(context?: unknown): Promise<void> {
      const sup = (
        Base.prototype as {
          postRegister?: (c?: unknown) => Promise<void> | void;
        }
      ).postRegister;
      if (typeof sup === "function") {
        await sup.call(this, context);
      }
    }

    /**
     * Capture-on-destruct backstop. Fires most-derived-first (this mixin
     * is composed outermost), i.e. BEFORE `ContainerMixin.cleanupOnDestruct`
     * evacuates/destroys the contents — so the fire-and-forget capture sees
     * the live tree. Durable destructs (the residency sweep, explicit
     * logout) `await` a capture up-front; this is the non-sweep safety net,
     * mirroring `Avatar.onDestruct`'s fire-and-forget save.
     */
    static cleanupOnDestruct(stuff: Stuff): void {
      if (!MixinApi.isPersistable(stuff)) return;
      if (!stuff.shouldPersist()) return; // guest / opted-out — no record
      const scope = stuff.getTemplatePath();
      if (!scope) return;
      void PersistableApi.capture(stuff).catch((err) => {
        console.error(
          `PersistableMixin.cleanupOnDestruct: capture failed for ${scope}`,
          err,
        );
      });
    }
  };
}
