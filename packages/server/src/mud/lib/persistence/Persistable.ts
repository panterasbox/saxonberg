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
}

export function PersistableMixin<TBase extends MixinConstructor<Stuff>>(
  Base: TBase,
) {
  return class PersistableMixin extends Base implements Persistable {
    static _mixinName = "PersistableMixin";

    isPersistenceHost(): boolean {
      return true;
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
      const self = this as unknown as Stuff;
      const scope = self.getTemplatePath();
      if (scope && (await PersistableApi.hasRecord(scope))) {
        return; // record authoritative — postRegister restores; no re-seed
      }
      const sup = (
        Base.prototype as { applyPopulates?: (s: PopulateSpec[]) => Promise<void> }
      ).applyPopulates;
      if (typeof sup === "function") {
        await sup.call(this, specs);
      }
    }

    /**
     * The single materialize driver. Runs after the shell + Phase-2
     * hydration (so any seed has already settled). With a record present
     * the host restores its captured contents; with none it captures the
     * first record (the seeded/empty state) — seed-then-persist. Fires once
     * per clone.
     *
     * Requires `PostRegistrationMixin` in the chain (persistable hosts
     * compose it); `super.postRegister` is optional-chained so a host that
     * doesn't still composes cleanly.
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
      const self = this as unknown as Stuff;
      const scope = self.getTemplatePath();
      if (!scope) return;
      if (await PersistableApi.hasRecord(scope)) {
        await PersistableApi.materialize(self);
      } else {
        await PersistableApi.capture(self);
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
