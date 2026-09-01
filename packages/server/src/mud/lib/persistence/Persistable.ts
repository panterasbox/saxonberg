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
 * `applyProps`/`applyCast` overrides wrap `Populates`). The capability is thin: the
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
 *      as data (`props:` and `cast:` in its template, the same fields a
 *      non-persistent container uses), and the establishing context lays them
 *      down EXACTLY ONCE via {@link Persistable.seedBornWith} on the no-record
 *      branch, then captures. Thereafter the record is authoritative for the
 *      props and the seed never re-runs (the cast is transient — conserved
 *      and re-seeded on every restore via {@link Persistable.reseedCast}).
 *      The `applyProps`/`applyCast` hydration hooks only *retain* the specs —
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
import type { Container } from "../spatial/Container";
import type { Containable } from "../spatial/Containable";
import { Mixins } from "../mixin";
import { MixinApi, type AnyConstructor } from "../../api/mixin";
import { StuffApi } from "../../api/stuff";
import { ContainmentApi } from "../../api/containment";
import { PersistableApi } from "../../api/persistable";

/** Public shape provided by PersistableMixin. */
export interface Persistable {
  /**
   * True once this host has been through its first
   * materialize/seed-then-persist gate. Read by the `applyProps` /
   * `applyCast` overrides so a re-materialize never re-seeds.
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
   * Does this host want a capture as the process ends?
   *
   * ⭐ The knowledge belongs here, not to the bootstrapper. An Avatar
   * says no: it captures at logout on its own seam, and a shutdown sweep
   * would only race that. A host with no persistence key says no — it
   * never established one, so there is nothing to write.
   *
   * A PREDICATE, not a registry. The set of hosts wanting a shutdown
   * capture is derivable from the hosts themselves, so nothing caches
   * it: `world:[mixin.PersistableMixin]` at shutdown, filtered by this.
   */
  capturesAtShutdown(): boolean;

  /**
   * Stash the explicit per-instance persistence key (the record `owner`).
   * Written by `PersistableLogic` when a keyed capture/materialize resolves
   * a key; read back on a keyless re-capture.
   *
   * `explicit` (default true) records the key's **provenance**: an
   * establishing context supplying a real per-instance key (a leased dorm
   * room's unit parcel, a cultivated plant's uuid) means "this host is one
   * of many". `PersistableLogic` passes `false` for the scope-derived
   * owner it stashes on a keyless capture — that value is a singleton's
   * self/parcel owner, not a multi-instance key. See
   * {@link isPersistenceKeyExplicit}.
   */
  setPersistenceKey(key: string, explicit?: boolean): void;

  /**
   * Whether this host's stashed key was supplied by an establishing
   * context rather than derived from its scope — i.e. whether the host is
   * **multi-instance**. Sticky once true. The nested-host capture reads it
   * to decide between a `{ref, key}` entry (clone a fresh keyed shell per
   * sibling) and a bare `{ref}` (the singleton dedup), so a singleton's
   * derived owner never turns its ref into a keyed one.
   */
  isPersistenceKeyExplicit(): boolean;

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
   * `props:`/`cast:` specs, retained at hydration) — cloning each into this
   * host exactly once. The establishing context calls this on the **no-record
   * branch only** (a fresh instance with no saved state), then captures the
   * first record; on the has-record branch it restores instead and never
   * calls this. A no-op when the host declares neither (e.g. an
   * Avatar, whose loadout is seeded imperatively). Replaces per-host bespoke
   * seed methods with author-editable data.
   */
  seedBornWith(): Promise<void>;

  /**
   * Re-seed this host's transient CAST. Capture skips `Behaved` occupants
   * (`ContainerMixin.captureSlice`'s third skip): cast commutes between
   * persistable rooms, so two rooms' records could each carry the same
   * NPC and the next boot would restore it twice — `expected singleton,
   * found 2`. A restored room therefore comes back troupe-less, and this
   * is the establishing half that puts the cast back: for each retained
   * `cast:` entry with **no live instance anywhere**, mint one and move
   * it in. Live cast is conserved — an instance standing in any room
   * (this one, the counter it commutes to) suppresses the re-mint.
   * Called by the materialize path after a successful restore; a no-op
   * when no `cast:` was declared.
   */
  reseedCast(): Promise<void>;
}

export function PersistableMixin<
  TBase extends MixinConstructor<Stuff & Partial<Populates>>,
>(Base: TBase) {
  return class PersistableMixin extends Base implements Persistable {
    static _mixinName = "PersistableMixin";

    /** Stashed explicit persistence key; null until first keyed op. */
    protected _persistenceKey: string | null = null;

    /** True once an establishing context supplied a real per-instance key
     * (never for a scope-derived owner). Transient — sticky within a life. */
    protected _persistenceKeyExplicit = false;

    /** Set true by `markForRevert()` — folds into `shouldPersist()`. */
    protected _reverting = false;

    /**
     * Born-with specs retained from the `props`/`cast` hydration hooks
     * (transient — NOT persisted; re-populated on every clone/restore).
     * Props are laid down once by {@link seedBornWith} on the no-record
     * branch; cast is re-seeded on every restore by {@link reseedCast}.
     * Empty for a host that declares neither.
     */
    protected _bornWithProps: PopulateSpec[] = [];
    protected _bornWithCast: string[] = [];

    isPersistenceHost(): boolean {
      return true;
    }

    shouldPersist(): boolean {
      return !this._reverting;
    }

    getPersistenceKey(): string | null {
      return this._persistenceKey;
    }

    setPersistenceKey(key: string, explicit = true): void {
      this._persistenceKey = key;
      if (explicit) this._persistenceKeyExplicit = true;
    }

    capturesAtShutdown(): boolean {
      if (this._persistenceKey === null) return false; // never established
      // An Avatar captures at logout, on its own seam; a shutdown sweep
      // would only race it.
      return !MixinApi.isHasInteractive(this as unknown as Stuff);
    }

    isPersistenceKeyExplicit(): boolean {
      return this._persistenceKeyExplicit;
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
     * every wake). So these overrides do NOT delegate to `PopulatesMixin`;
     * instead they **retain** the declared specs so the establishing context
     * can lay them down exactly once, keyed, via {@link seedBornWith} on the
     * no-record branch. The `props:`/`cast:` fields stay author-editable
     * DATA; only *when* they run moves to the keyed holder.
     */
    async applyProps(specs: PopulateSpec[]): Promise<void> {
      this._bornWithProps = Array.isArray(specs) ? specs.slice() : [];
    }

    /** See {@link applyProps} — the cast half of the same retention. */
    async applyCast(specs: string[]): Promise<void> {
      this._bornWithCast = Array.isArray(specs) ? specs.slice() : [];
    }

    /**
     * Lay down the retained born-with specs — cloning each into this host —
     * by delegating to the inner `PopulatesMixin` appliers (`super`). Called
     * by the establishing context on the no-record branch only. A no-op when
     * neither `props:` nor `cast:` was declared (empty specs → nothing to
     * seed, and no `PopulatesMixin` need be composed).
     */
    async seedBornWith(): Promise<void> {
      // Present at runtime whenever specs were retained (specs only arrive
      // via the Hydrator when `props`/`cast` are instruction fields, i.e.
      // the host composes PopulatesMixin below). The `?.` guards the
      // vacuous case.
      if (this._bornWithProps.length > 0) {
        await super.applyProps?.(this._bornWithProps);
      }
      if (this._bornWithCast.length > 0) {
        await super.applyCast?.(this._bornWithCast);
      }
    }

    /**
     * See {@link Persistable.reseedCast}. The designation is declared
     * (`cast:`), so there is nothing to resolve — walk the retained cast
     * list, skip anything with a live instance anywhere (conserved), mint
     * the rest.
     */
    async reseedCast(): Promise<void> {
      if (this._bornWithCast.length === 0) return;
      const self = this as unknown as Stuff;
      if (!MixinApi.isContainer(self)) return;
      for (const path of this._bornWithCast) {
        if (typeof path !== 'string' || path.length === 0) continue;
        try {
          // Live cast is conserved: an instance anywhere suppresses the
          // re-mint — a hand captured mid-commute at the counter is still
          // the one hand.
          if (StuffApi.findAllByTemplatePath(path).length > 0) continue;
          const npc = await StuffApi.clone<Stuff & Containable>(path);
          ContainmentApi.move(npc, self as unknown as Stuff & Container);
        } catch (err) {
          console.warn(
            `Persistable.reseedCast: could not re-seed '${path}':`,
            err,
          );
        }
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
