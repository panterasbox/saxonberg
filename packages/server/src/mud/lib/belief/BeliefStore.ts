/**
 * BeliefStoreMixin — a per-viewer **memory of identity**: what a given
 * viewer (an `Avatar` or an NPC) knows about the things around it.
 *
 * This is the **spine** of the recognition / identification substrate
 * (`docs/subsystems/belief.md`). It is a dumb,
 * realm-namespaced keyed bag of {@link BeliefRecord}s — pure CRUD, no
 * per-realm intelligence. All the cleverness (the viewer-aware naming
 * step, the introduction trigger, disguise gating) lives in *consumers*;
 * the store just holds what's been learned.
 *
 * ## Two realms, one store
 *
 * Records are keyed `` `${realm}:${referent}` ``. Two realms ship:
 *
 *   - {@link RECOGNITION} — *instance continuity*: "have I met this
 *     specific individual, and do I know who they are?" Keyed by the
 *     target's **`templatePath`** (avatars + singleton NPCs have a
 *     unique one).
 *   - {@link IDENTIFICATION} — *type knowledge*: "do I know what kind of
 *     thing this is?" Keyed by the type's **`templatePath`** (generic
 *     clones share one).
 *
 * The instance/type split falls out of the keying for free: a unique
 * `templatePath` is a recognition referent; a shared one is a type
 * referent. The store doesn't care — it's the same mechanism, and the
 * shared substrate "demonstrably carries both key kinds" (a build
 * constraint) by construction.
 *
 * ## Why `templatePath`, not `stuffId`
 *
 * `stuffId` is reboot-ephemeral and would imply the viewer "knows which
 * runtime Stuff" — which it doesn't; it knows an *identity*.
 * `templatePath` is durable across reboots and the engine always has it.
 *
 * ## Not persistent on the host
 *
 * `_beliefs` is **not** a `persistentField`. Records are their own
 * Documents in a dedicated collection (`api/belief.ts` /
 * `BeliefDocument`), lazily
 * hydrated into this in-memory map on session establish and written
 * through per-record. The map is a session working set, never part of
 * the Avatar document (whole-document fsync is the wrong shape — cf.
 * `ContactsMixin`, the cautionary precedent).
 *
 * ## NOT for
 *
 * NPC *behavior* that reads this memory (greetings, gates, gossip) —
 * that's npc-behavior territory. The store lets a Character *hold*
 * memory; reading it to drive behavior is a separate concern. Also not
 * for place-memory ("an unfamiliar room") — a future realm (alongside
 * the shipped recognition / identification / regard trio).
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import { Stuff as StuffBase } from '../stuff/Stuff';
import { StuffApi } from '../../api/stuff';
import { PersistApi } from '../../api/persist';
import { MixinApi } from '../../api/mixin';
import { Mixins } from '../mixin';
import type {
  BeliefSlice,
  CaptureContext,
  MixinSlice,
  RestoreContext,
} from '../persistence/PersistenceSlice';
import BeliefDocument from './BeliefDocument';
import {
  CallSecurity,
  Final,
  Unshadowable,
} from '../security/decorators';
import { SecurityPolicies } from '../security/SecurityPolicies';

/**
 * Realm constant: instance-continuity memory. Keyed by the target's
 * `templatePath`. A string convention, NOT a registry — per-realm
 * intelligence lives entirely in consumers.
 */
export const RECOGNITION = 'recognition';

/**
 * Realm constant: type-knowledge memory. Keyed by the type's
 * `templatePath` (generic clones share one).
 */
export const IDENTIFICATION = 'identification';

/**
 * Realm constant: **attitude memory** — how the viewer *regards* a
 * subject (likes / trusts / esteems). Keyed by the subject's
 * `templatePath`, exactly like {@link RECOGNITION} — "the same Bob, three
 * realms at one referent key." The third belief realm; a string
 * convention, NOT a registry. All attitude intelligence (aggregation into
 * renown, decay, trust-weighting) lives in consumers — the store just
 * holds the per-pair scalar. See `docs/subsystems/belief.md`.
 */
export const REGARD = 'regard';

/**
 * Realm constant: **world-fact discovery memory** — "viewer V has found
 * feature F." Keyed by the concealed thing's `templatePath`, exactly like
 * {@link RECOGNITION}; the payload is a bare `found` flag (flag-by-default
 * under the payload rule). This is the *presence* cut — whether a viewer
 * has ever pierced a thing's concealment — distinct from recognition
 * (*who* a perceived thing is). Written once by
 * `PerceptionApi.recordDiscovery`, read by `PerceptionApi.hasDiscovered`;
 * per-viewer isolation, no-inherit, and the lazy liveness-GC fall out
 * unchanged. The world-fact cut of the deferred place-memory realm (a
 * found *feature*, not room familiarity). See `docs/subsystems/belief.md`.
 */
export const DISCOVERY = 'discovery';

/**
 * The thin, axis-specific payload riding on a {@link BeliefRecord}.
 *
 * **Payload rule (the slate's): flag by default, value only for planned
 * divergence.** `knownAs` is a *value* on the record spine because
 * faking / nicknames are planned divergences from the live name. The
 * identification realm stores a `typeKnown` *flag* — the known type name
 * is read live off the referent, never snapshotted. Do not snapshot
 * referent state into the payload.
 */
export interface BeliefPayload {
  /**
   * Identification realm: the viewer knows what *kind* of thing the
   * referent is. Read the actual type name live; this is just the gate.
   */
  typeKnown?: boolean;
  /**
   * Identification realm: **a name this viewer believes and that may be
   * FALSE.** Overrides the referent's own identified name on read.
   *
   * The store is a record of what someone *thinks*, not a cache of what
   * is true — and until this field existed nothing exercised that. A
   * cursed identify plants one: a record indistinguishable from a real
   * identification, naming a different real thing. The holder finds out
   * by acting on it, which is what makes bad information strictly worse
   * than none.
   *
   * Absent ⇒ the referent's own `identifiedName`, i.e. the truth.
   */
  believedName?: string;
  /**
   * Identification realm: **the facts this viewer holds about the
   * referent's class** — and the state from which any band derives
   * (magic-items D25).
   *
   * There is deliberately **no `identificationLevel` scalar**. A stored
   * percentage of knowing is exactly the shape this codebase avoids:
   * competence bands derive, renown derives, nothing stores a fraction
   * of a fact. You know *facts*; how identified something is falls out
   * of which facts you hold.
   *
   * A `string[]` rather than a flag set because the vocabulary is
   * open-ended content (`'type'`, `'kind'`, later `'potency'`,
   * `'origin'`) and each entry is a fact a different act can teach.
   */
  knownAttributes?: string[];
  /**
   * Identification realm: **which descriptor generation this record was
   * learned in** (D28).
   *
   * The descriptor pool is finite, so a descriptor is eventually
   * reissued meaning something else — the one moment a stale record
   * could assert something false. Stamping the generation lets the
   * display **hedge rather than lie**: *"a blue potion — you once knew
   * blue to mean healing"*. One field, no sweep, and it only does work
   * in the rare case. Knowledge is never invalidated; only its
   * applicability fades.
   */
  learnedGeneration?: number;
  /**
   * Regard realm: the viewer's signed attitude toward the referent
   * (`-100..+100`; absent or `0` = no opinion). A **value**, not a flag —
   * a planned divergence under the payload rule, exactly as `knownAs` is a
   * value on the spine. Unlike `knownAs`'s raise-only coalesce, `know`
   * **overwrites** this on set: the delta arithmetic + range clamp live in
   * the consumer (`RegardApi`/`RegardLogic`), never in the store.
   */
  regard?: number;
  /**
   * Discovery realm: the viewer has found this (concealed) referent — a
   * bare **flag** (flag-by-default under the payload rule; a concealment
   * level lives on the referent, never snapshotted here). Absent = not yet
   * found. Set once via `PerceptionApi.recordDiscovery`.
   */
  found?: boolean;
}

/**
 * One thing a viewer knows about one referent in one realm. The shared
 * record spine across both axes; the axis-specific extra is the thin
 * {@link BeliefPayload}, not a god-record.
 *
 * Plain-JSON shape (no methods) so it round-trips to a Mongo
 * Document with no marshalling.
 */
export interface BeliefRecord {
  /** {@link RECOGNITION} | {@link IDENTIFICATION}. */
  realm: string;
  /** The referent's `templatePath` (durable) — the engine's key. */
  referent: string;
  /**
   * The recognition/place value-payload: the name the viewer would
   * render for this referent. `null` = a tracked stranger (known to
   * exist, name not learned). Only a non-null upsert raises it; the
   * explicit downgrade is {@link BeliefStore.forgetField}.
   */
  knownAs: string | null;
  /** ms-since-epoch, first encounter. Stable across coalescing. */
  firstSeen: number;
  /** ms-since-epoch, most recent encounter. Advances on every upsert. */
  lastSeen: number;
  /** Thin axis-specific extra (e.g. `{ typeKnown: true }`). */
  payload: BeliefPayload;
}

/**
 * The bag passed to {@link BeliefStore.know}: a partial record update.
 * Carries the spine-level `knownAs` alongside any payload flags so a
 * single upsert can raise a name and/or set a flag.
 */
export interface BeliefUpdate extends BeliefPayload {
  /**
   * The name to learn. Omit (or pass `null`) for a bare sighting that
   * only advances `lastSeen` — a non-null value is never *downgraded*
   * to null by `know` (use {@link BeliefStore.forgetField} for that).
   */
  knownAs?: string | null;
}

/** A field {@link BeliefStore.forgetField} can clear — spine or payload. */
export type BeliefField = 'knownAs' | keyof BeliefPayload;

/** Build the flat map key for a `(realm, referent)` pair. */
function keyOf(realm: string, referent: string): string {
  return `${realm}:${referent}`;
}

/**
 * The public surface of {@link BeliefStoreMixin}. Dumb CRUD; O(1)
 * point-get on the naming path (no Mongo read — that's the whole point
 * of the in-memory working set).
 */
export interface BeliefStore {
  /**
   * Upsert what the viewer knows about `referent` in `realm`. A new
   * record stamps `firstSeen`/`lastSeen`; an existing one advances
   * `lastSeen` (preserving `firstSeen`) and **coalesces**: a non-null
   * `update.knownAs` raises the name, an absent/null one leaves a
   * learned name intact. Payload flags merge.
   */
  know(realm: string, referent: string, update?: BeliefUpdate): void;
  /**
   * Point-get, O(1). Returns `null` for an unknown referent. **Lazy
   * liveness-GC:** a record whose referent no longer resolves to any
   * live Stuff is dropped and `null` returned.
   */
  recall(realm: string, referent: string): BeliefRecord | null;
  /** Every record in `realm`, keyed by referent. Read-only snapshot. */
  recallRealm(realm: string): ReadonlyMap<string, BeliefRecord>;
  /** Drop the record entirely. */
  forget(realm: string, referent: string): void;
  /**
   * Partial forget — clear one field, keep the record. `'knownAs'` nulls
   * the name (familiar-face-lost-name); a payload field is removed. No-op
   * when the record doesn't exist.
   */
  forgetField(realm: string, referent: string, field: BeliefField): void;
  /**
   * Every record across all realms, as a flat read-only snapshot. The
   * persistence layer's evict/flush path iterates this; the naming path
   * never does.
   */
  allBeliefs(): readonly BeliefRecord[];
  hydrateBeliefs(): Promise<void>;
  evictAndFlushBeliefs(): Promise<void>;
  keepsPersonalRegard(): boolean;
  regardFor(subject: Stuff): number;
  adjustRegard(subject: Stuff, delta: number): void;
  setRegard(subject: Stuff, value: number): void;
  clearRegard(subject: Stuff): void;
  regardsHeld(): ReadonlyMap<string, number>;
  learnIdentityOf(subject: Stuff, name: string | null): void;
  recognizes(subject: Stuff): boolean;
  knowsTrueTypeOf(target: Stuff): boolean;
  /**
   * Install a hydrated record directly (the persistence hydrate path).
   * Bypasses the upsert/coalesce logic AND the write-through — the record
   * is the stored truth. NOT for consumer use; consumers go through
   * {@link know}.
   */
  /** Only the records worth persisting — the owner's own narrowing. */
  learnedBeliefs(): readonly BeliefRecord[];
  loadBelief(record: BeliefRecord): void;
  /** Drop the whole in-memory working set (persistence evict). */
  clearBeliefs(): void;
}

/* ────────── the per-record persistence (module-private) ──────────
 * Moved in whole from the retired BeliefStoreLogic (the ledger viewer
 * face of the Api OO sweep): the BeliefDocument I/O is internal to the
 * mixin file now — the mixin's own know/forget call it directly and
 * nothing else may. BeliefDocument is lib/belief/ — inside the mudlib,
 * no boundary issue.
 */

/** Has this record learned anything worth persisting? */
function isLearned(record: BeliefRecord): boolean {
  return (
    record.knownAs !== null ||
    record.payload.typeKnown === true ||
    // A bare regard record (null knownAs) is still worth persisting; a
    // neutral/absent regard is not (matches "absent or 0 = no opinion").
    (record.payload.regard !== undefined && record.payload.regard !== 0)
  );
}

/** Persistence is a no-op unless Mongo is connected (tests, pre-boot). */
function persistenceActive(): boolean {
  return PersistApi.isConnected();
}

/**
 * The durable per-viewer key into the `beliefs` collection, or `null`
 * for a viewer whose memory does not belong there.
 *
 * ⭐⭐ **Identity and durability arrive together, or neither.** The rule
 * this replaced — `getIdentityPath()`, unconditionally — was true only
 * while every belief-holding NPC happened to be a singleton. It is not:
 * an `Extra`'s identity path IS its template path, so **two sentries
 * cloned from one row would share one Mongo record** and overwrite each
 * other's opinion of you. The key must be unique *by itself* before it
 * may be durable.
 *
 * Four viewers, three answers:
 *
 * | viewer | key | where its memory lives |
 * |---|---|---|
 * | a keyed persistable host (a named pet) | `null` | ⭐ its OWN `holder_snapshots` record, via {@link BeliefStoreMixin.captureSlice} — a host that persists itself must not also write here, or the same beliefs land twice and diverge |
 * | a minted identity (an Avatar) | `getIdentityPath()` | the `beliefs` collection |
 * | a singleton (every `Cast`) | `getIdentityPath()` | the `beliefs` collection |
 * | anything else — an `Extra`, an unnamed stray, a generic clone | `null` | **memory only**, discarded at reboot |
 *
 * ⭐ The last row is a feature, not a shortfall: a stray's regard for
 * you accumulates in memory — which is what makes winning it over
 * possible at all — and is forgotten on restart. An unnamed animal is
 * free. Naming it is what buys it a record (the promotion), and from
 * that moment its beliefs ride its own capture, which is row one.
 */
function viewerKey(viewer: Stuff): string | null {
  // Row 1 — it keeps its own record; see captureSlice.
  if (MixinApi.isPersistable(viewer) && viewer.isPersistenceKeyExplicit()) {
    return null;
  }
  const identity = viewer.getIdentityPath();
  if (!identity) return null;
  // Row 2 — a minted identity is unique by construction.
  if (identity !== viewer.getTemplatePath()) return identity;
  // Row 3 — one live instance per row, so the row path IS unique.
  const ctor = (viewer as unknown as { constructor: unknown }).constructor;
  if (MixinApi.hasMixin(ctor as never, Mixins.Singleton)) return identity;
  // Row 4 — shared lineage, no minted identity: session-local.
  return null;
}

/**
 * Per-record write-through. Persists a learned record (upsert keyed by
 * `{viewerId, realm, referent}`); no-ops for a bare stranger record, a
 * keyless viewer, or a closed connection. The find-then-save read is on
 * the WRITE path, never the naming path, so the no-read constraint
 * holds.
 */
async function writeRecordImpl(
  viewer: Stuff,
  record: BeliefRecord,
): Promise<void> {
  if (!persistenceActive()) return;
  const viewerId = viewerKey(viewer);
  if (!viewerId || !isLearned(record)) return;
  const [existing] = await BeliefDocument.find({
    viewerId,
    realm: record.realm,
    referent: record.referent,
  });
  const doc = existing ?? new BeliefDocument();
  doc.applyRecord(viewerId, record);
  await doc.save();
}

/** Drop a persisted record (mirrors the mixin's forget). */
async function deleteRecordImpl(
  viewer: Stuff,
  realm: string,
  referent: string,
): Promise<void> {
  if (!persistenceActive()) return;
  const viewerId = viewerKey(viewer);
  if (!viewerId) return;
  const docs = await BeliefDocument.find({ viewerId, realm, referent });
  for (const doc of docs) await doc.delete();
}

/* ────────── the regard arithmetic (module-private) ──────────
 * Moved in whole from the retired RegardLogic: the store stays dumb
 * CRUD; the read-modify-write delta and the normative clamp live
 * beside it now, behind the sealed methods below.
 */

/** Inclusive bounds on stored regard. The range is normative (clamped). */
const REGARD_MIN = -100;
const REGARD_MAX = 100;

/** Clamp to the normative -100..+100 range. */
function clampRegard(value: number): number {
  return Math.max(REGARD_MIN, Math.min(REGARD_MAX, value));
}

export function BeliefStoreMixin<TBase extends MixinConstructor>(Base: TBase) {
  // Declared-then-returned (the Meltable shape) so method decorators
  // are legal — a class EXPRESSION cannot carry them.
  class BeliefStoreMixin extends Base implements BeliefStore {
    static _mixinName = 'BeliefStoreMixin';

    /**
     * ⭐ A keyed host's memory rides its own record.
     *
     * Contributes the learned records for a host whose beliefs the
     * `beliefs` collection deliberately does not hold — see `viewerKey`.
     * For every other host (an Avatar, a `Cast`) `viewerKey` is non-null,
     * those records are already durable in their own collection, and this
     * emits an **empty** slice: their `holder_snapshots` records do not
     * change shape.
     *
     * The two conditions are the same predicate read from opposite ends,
     * which is why they sit in one file: if `viewerKey` returns a key,
     * this must not capture, or the same belief is written twice and the
     * copies diverge the moment either is touched.
     */
    static captureSlice(host: Stuff, _ctx: CaptureContext): MixinSlice {
      const self = host as unknown as BeliefStore;
      if (viewerKey(host) !== null) return { beliefs: [] } satisfies BeliefSlice;
      return { beliefs: [...self.learnedBeliefs()] } satisfies BeliefSlice;
    }

    /**
     * Install a captured memory back onto the host. An ungated direct
     * install, deliberately **not** `hydrateBeliefs()`: that method is
     * `SelfOnly`, and a restore runs in a frame whose executing principal
     * is the owner rather than the host, so the self-call would be denied
     * exactly when the owner happens to be online.
     */
    static async restoreSlice(
      host: Stuff,
      slice: MixinSlice,
      _ctx: RestoreContext,
    ): Promise<void> {
      if (!('beliefs' in slice)) return;
      const self = host as unknown as BeliefStore;
      for (const record of (slice as BeliefSlice).beliefs) {
        self.loadBelief(record);
      }
    }

    /**
     * The session working set. TS `private` (not `#`) — the host is
     * call-security-proxy-wrapped, so `this` inside a method is the
     * proxy and a `#` slot would throw. Deliberately NOT a
     * `persistentField`: records persist as their own Documents (Wave
     * 8), not as a field of the host.
     */
    private _beliefs = new Map<string, BeliefRecord>();

    know(realm: string, referent: string, update: BeliefUpdate = {}): void {
      const k = keyOf(realm, referent);
      const now = Date.now();
      const existing = this._beliefs.get(k);
      if (existing) {
        existing.lastSeen = now;
        // Coalesce: only ever raise the name, never downgrade to null.
        if (update.knownAs != null) existing.knownAs = update.knownAs;
        if (update.typeKnown !== undefined) {
          existing.payload.typeKnown = update.typeKnown;
          // ⚠ **A type-learning act REPLACES what you believe the type
          // is**, including replacing a lie with nothing. `believedName`
          // is therefore assigned unconditionally here rather than
          // guarded like its neighbours: an honest identification omits
          // the field, and omitting it must CLEAR a planted name, not
          // leave it standing. Guarding it would make a curse permanent
          // — the one thing the design says it must not be, since
          // finding out is how the holder recovers.
          existing.payload.believedName = update.believedName;
        }
        // Regard overwrites (not raise-only): the consumer computes the
        // new value before calling.
        if (update.regard !== undefined) existing.payload.regard = update.regard;
        // Discovery flag: a bare found-flag (flag-by-default).
        if (update.found !== undefined) existing.payload.found = update.found;
        // Identification attributes UNION rather than overwrite — each
        // is a fact some act taught, and a second act teaching a second
        // fact must not erase the first (magic-items D25).
        if (update.knownAttributes !== undefined) {
          existing.payload.knownAttributes = [
            ...new Set([
              ...(existing.payload.knownAttributes ?? []),
              ...update.knownAttributes,
            ]),
          ];
        }
        // The generation OVERWRITES: re-learning refreshes what the
        // record is current for, which is what makes re-identification
        // clear a hedge (D28).
        if (update.learnedGeneration !== undefined) {
          existing.payload.learnedGeneration = update.learnedGeneration;
        }
        this._writeThrough(existing);
        return;
      }
      const payload: BeliefPayload = {};
      if (update.typeKnown !== undefined) payload.typeKnown = update.typeKnown;
      if (update.regard !== undefined) payload.regard = update.regard;
      if (update.found !== undefined) payload.found = update.found;
      if (update.knownAttributes !== undefined) {
        payload.knownAttributes = [...new Set(update.knownAttributes)];
      }
      if (update.learnedGeneration !== undefined) {
        payload.learnedGeneration = update.learnedGeneration;
      }
      if (update.believedName !== undefined) {
        payload.believedName = update.believedName;
      }
      const record: BeliefRecord = {
        realm,
        referent,
        knownAs: update.knownAs ?? null,
        firstSeen: now,
        lastSeen: now,
        payload,
      };
      this._beliefs.set(k, record);
      this._writeThrough(record);
    }

    recall(realm: string, referent: string): BeliefRecord | null {
      const k = keyOf(realm, referent);
      const record = this._beliefs.get(k);
      if (!record) return null;
      // The DISCOVERY realm is exempt from the liveness-GC: its referent is a
      // durable *feature* handle (a concealable's `getDiscoveryKey()` — e.g.
      // an `Exit`'s synthetic `source#exit:dir`), NOT necessarily a live
      // Stuff's `templatePath`, so a templatePath-absence check would wrongly
      // reap a valid discovery. A found-flag is a cheap, per-viewer world
      // fact worth keeping regardless.
      if (realm === DISCOVERY) return record;
      // Lazy liveness-GC: if nothing in the world carries this referent
      // anymore, the memory is dead. `findAllByTemplatePath` is the
      // non-throwing multi-instance lookup (type referents are shared
      // across clones; the singleton variant would throw on those).
      if (StuffApi.findAllByTemplatePath(referent).length === 0) {
        this._beliefs.delete(k);
        return null;
      }
      return record;
    }

    recallRealm(realm: string): ReadonlyMap<string, BeliefRecord> {
      const out = new Map<string, BeliefRecord>();
      for (const record of this._beliefs.values()) {
        if (record.realm === realm) out.set(record.referent, record);
      }
      return out;
    }

    forget(realm: string, referent: string): void {
      this._beliefs.delete(keyOf(realm, referent));
      void deleteRecordImpl(this as unknown as Stuff, realm, referent).catch(
        () => {},
      );
    }

    forgetField(realm: string, referent: string, field: BeliefField): void {
      const record = this._beliefs.get(keyOf(realm, referent));
      if (!record) return;
      if (field === 'knownAs') {
        record.knownAs = null;
      } else {
        delete record.payload[field];
      }
      this._writeThrough(record);
    }

    allBeliefs(): readonly BeliefRecord[] {
      return [...this._beliefs.values()];
    }

    /**
     * The records that have learned something — a name, a type, or a
     * non-zero opinion. ⭐ The owner answers the question rather than
     * handing back its table for a caller to filter: the predicate for
     * "worth keeping" is the store's, and an index can later live here
     * without any caller moving.
     */
    learnedBeliefs(): readonly BeliefRecord[] {
      return [...this._beliefs.values()].filter(isLearned);
    }

    loadBelief(record: BeliefRecord): void {
      this._beliefs.set(keyOf(record.realm, record.referent), record);
    }

    clearBeliefs(): void {
      this._beliefs.clear();
    }

    /**
     * Fire-and-forget per-record write-through. Sync `know`/`forget`
     * can't await; the Api no-ops when persistence is closed (tests,
     * pre-boot) or the record/viewer isn't persistable, so this stays
     * inert off the Mongo path.
     */
    private _writeThrough(record: BeliefRecord): void {
      void writeRecordImpl(this as unknown as Stuff, record).catch(() => {});
    }

    /**
     * Lazy-hydrate this viewer's persisted beliefs into the in-memory
     * map. Called on session establish (`Avatar.enter` — a self-call,
     * which is what the gate admits). No-op without a durable viewer
     * key or an active connection.
     */
    @CallSecurity(SecurityPolicies.SelfOnly)
    public async hydrateBeliefs(): Promise<void> {
      if (!persistenceActive()) return;
      const self = this as unknown as Stuff;
      const viewerId = viewerKey(self);
      if (!viewerId) return;
      const docs = await BeliefDocument.find({ viewerId });
      for (const doc of docs) this.loadBelief(doc.toRecord());
    }

    /**
     * Final flush of every learned record, then clear the in-memory
     * map. Called on logout (`Avatar.onDestruct` — a self-call). The
     * flush is a backstop for any write-through still in flight;
     * clearing releases the working set.
     */
    @CallSecurity(SecurityPolicies.SelfOnly)
    public async evictAndFlushBeliefs(): Promise<void> {
      const self = this as unknown as Stuff;
      if (persistenceActive()) {
        const viewerId = viewerKey(self);
        if (viewerId) {
          for (const record of this.allBeliefs()) {
            if (isLearned(record)) await writeRecordImpl(self, record);
          }
        }
      }
      this.clearBeliefs();
    }

    /* ────────── the recognition face (the first realm) ────────── */

    /**
     * Learn (or overwrite) who `subject` IS to this viewer (was
     * `RecognitionApi.learnIdentity` — the OO sweep). `name = null`
     * records a sighting without a name. Sealed; ungated (P5 parity —
     * the writers span introduce, dialogue auto-introduce and content
     * effects, principals no FromX policy can enumerate).
     */
    @Final
    @Unshadowable
    public learnIdentityOf(subject: Stuff, name: string | null): void {
      const referent = subject.getIdentityPath();
      if (!referent) return;
      this.know(RECOGNITION, referent, { knownAs: name });
    }

    /** Does this viewer recognize `subject` (a named RECOGNITION record)? */
    public recognizes(subject: Stuff): boolean {
      const referent = subject.getIdentityPath();
      if (!referent) return false;
      const record = this.recall(RECOGNITION, referent) as
        | { knownAs?: string | null }
        | undefined;
      return !!record?.knownAs;
    }

    /**
     * Does this viewer actually KNOW what `target` is (a current-
     * generation identification with no believed-name override)? The
     * gate on revealing an item's authored long description.
     */
    public knowsTrueTypeOf(target: Stuff): boolean {
      return (
        StuffBase._recognitionFace()?.knowsTrueType(
          this as unknown as Stuff,
          target,
        ) ?? false
      );
    }

    /* ────────── the regard face (the third realm) ────────── */

    /**
     * This viewer's current regard for `subject` — a signed scalar in
     * `-100..+100`, `0` when no opinion (no record / keyless subject).
     * Ungated read.
     */
    public regardFor(subject: Stuff): number {
      const referent = subject.getIdentityPath();
      if (!referent) return 0;
      return this.recall(REGARD, referent)?.payload.regard ?? 0;
    }

    /**
     * Move this viewer's regard for `subject` by `delta` (signed),
     * clamped into `-100..+100`. Sealed — the method owns the clamp
     * invariant. Ungated (P5 parity with the retired Public
     * `RegardApi.adjustRegard`): the writers are a trusted-relationship
     * set — IntroduceController, the dialogue effect path, the contract
     * and combat resolutions — and several run under principals no
     * FromX policy can name.
     */
    @Final
    @Unshadowable
    public adjustRegard(subject: Stuff, delta: number): void {
      this.setRegard(subject, this.regardFor(subject) + delta);
    }

    /**
     * ⭐⭐ Whether this host holds a **personal** opinion of anybody.
     *
     * Default `true`; `platform/agent/Extra` overrides it to `false`.
     *
     * The distinction is between a **person** and a **role**. A sentry,
     * a hewer, a generic wolf — an `Extra` is *the* sentry, not somebody
     * called anything, and the same row stands up any number of them. A
     * role has no private opinion of you to hold: what the watch thinks
     * of you belongs to the watch, not to whichever body is on the gate
     * tonight (that institution-held opinion is designed and deferred).
     *
     * ⚠ Why a declared hook and not "not `Cast` ⇒ no regard": a kept
     * animal is also neither a `Cast` nor a singleton, and it *must*
     * hold regard — that regard is the whole mechanism of the bond. The
     * mask is a fact about the RUNG, and `Extra` is the rung, so the
     * rung is what declares it.
     *
     * A `false` host no-ops in {@link setRegard}, so nothing accumulates
     * even in memory — there is no record to write, flush or hydrate.
     * Recognition is untouched: an Extra may still learn who you are for
     * the session and greet you, which is role behaviour, not an opinion.
     *
     * @hook
     */
    public keepsPersonalRegard(): boolean {
      return true;
    }

    /**
     * Set an absolute (clamped) regard value. Sealed; see {@link adjustRegard}.
     * No-ops on a host that {@link keepsPersonalRegard} says holds none —
     * and `adjustRegard` routes through here, so gating it once is enough.
     */
    @Final
    @Unshadowable
    public setRegard(subject: Stuff, value: number): void {
      if (!this.keepsPersonalRegard()) return;
      const referent = subject.getIdentityPath();
      if (!referent) return;
      this.know(REGARD, referent, { regard: clampRegard(value) });
    }

    /**
     * Clear this viewer's regard for `subject` (back to "no opinion").
     * The belief record itself is kept; only the regard field drops.
     */
    @Final
    @Unshadowable
    public clearRegard(subject: Stuff): void {
      const referent = subject.getIdentityPath();
      if (!referent) return;
      this.forgetField(REGARD, referent, 'regard');
    }

    /**
     * Every regard this viewer holds, as `referent → value`. A
     * read-only snapshot for consumers (renown aggregation, display).
     */
    public regardsHeld(): ReadonlyMap<string, number> {
      const out = new Map<string, number>();
      for (const [referent, record] of this.recallRealm(REGARD)) {
        out.set(referent, record.payload.regard ?? 0);
      }
      return out;
    }
  }
  return BeliefStoreMixin;
}
