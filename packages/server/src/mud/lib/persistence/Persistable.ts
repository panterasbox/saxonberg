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
 *   2. **Seed-then-persist** — an `applyPopulates` override: on first
 *      materialization (no record) it seeds via `super.applyPopulates` then
 *      captures the first record; thereafter the record is authoritative and
 *      `populates` never re-runs (no seed duplication).
 *   3. **Materialize-on-register** — `postRegister` loads and restores every
 *      record scoped to this host after the shell is cloned.
 *
 * See [docs/subsystems/persistence.md] and
 * [docs/requirements/persistence-spine-requirements.md].
 */

import type { MixinConstructor } from "../mixin";
import type { Stuff, EvictionContext } from "../stuff/Stuff";
import type { VetoResult } from "../errors";
import type { PopulateSpec } from "../stuff/Populates";
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
}

export function PersistableMixin<TBase extends MixinConstructor<Stuff>>(
  Base: TBase,
) {
  return class PersistableMixin extends Base implements Persistable {
    static _mixinName = "PersistableMixin";

    /**
     * The multi-instance-host marker (default `false` — a singleton host,
     * keyed by its `templatePath`). A content host that shares one template
     * across many keyed instances (a `DormRoom`) sets `static multiInstance =
     * true`, relaxing the singleton-scope guard and switching `applyPopulates`
     * to a no-op (the establishing context drives seed-vs-restore with a key).
     */
    static multiInstance = false;

    /** Stashed explicit persistence key; null until first keyed op. */
    protected _persistenceKey: string | null = null;

    /** Set true by `markForRevert()` — folds into `shouldPersist()`. */
    protected _reverting = false;

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
     * Seed-then-persist gate (Populates override, composed outside
     * `PopulatesMixin`). First materialization has no record → run the
     * normal `populates` seed. Thereafter the record is authoritative and
     * the seed is skipped — the `postRegister` restore owns the contents,
     * so `populates` never duplicates its seed.
     *
     * The `postRegister` companion below is the single materialize driver:
     * within one clone the record-existence check is stable, so a first
     * clone here seeds and there captures the first record, while a later
     * clone here skips the seed and there restores — materialize fires
     * exactly once (pre-build note #5, no double-load).
     */
    async applyPopulates(specs: PopulateSpec[]): Promise<void> {
      // Multi-instance hosts (a leased dorm room) share one templatePath, so
      // the singleton `hasRecord(scope)` gate can't tell one keyed instance
      // from another — and the establishing context drives seed-vs-restore
      // with an explicit key. So a multi-instance host applies NO populates
      // here (a bare shell; the context seeds imperatively or restores).
      const multiInstance =
        (this.constructor as { multiInstance?: boolean }).multiInstance ===
        true;
      if (multiInstance) return;

      const self = this as unknown as Stuff;
      const scope = self.getTemplatePath();
      if (scope && (await PersistableApi.hasRecord(scope))) {
        return; // record authoritative — establishing context restores
      }
      const sup = (
        Base.prototype as { applyPopulates?: (s: PopulateSpec[]) => Promise<void> }
      ).applyPopulates;
      if (typeof sup === "function") {
        await sup.call(this, specs);
      }
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
