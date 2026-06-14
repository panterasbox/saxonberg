/**
 * BeliefStoreApi — persistence for the per-viewer belief store: a
 * lazily-hydrated, per-record working set backed by {@link BeliefDocument}
 * rows in the dedicated `beliefs` collection.
 *
 * The shape (the persistence capability the recognition build forced):
 *   - **One document per `{viewerId, realm, referent}`** — NOT
 *     one-big-doc-per-viewer (16MB cap + whole-array rewrites, the
 *     `ContactsMixin` anti-precedent). The collection is indexed on
 *     `viewerId` (see `PersistenceManager.createIndexes`).
 *   - **Lazy hydrate** on session establish (`Avatar.enter`) populates
 *     the in-memory `BeliefStoreMixin` map; the naming path (`recall`)
 *     serves from memory with **no Mongo read**.
 *   - **Per-record write-through** on `know`/`forget`; **evict + final
 *     flush** on logout (`onDestruct`).
 *   - **Write-through gate:** only records that have *learned* something
 *     (`knownAs` set, or a payload flag) persist; bare null-`knownAs`
 *     stranger sightings stay session-local.
 *
 * Goes through the `Document` wrapper (`BeliefDocument.find/save/delete`)
 * — no raw Mongo collection access. Upsert keys on `{viewerId, realm,
 * referent}`: write-through does a find-then-save (a read on the *write*
 * path, never the naming path, so the no-read constraint holds). For a
 * single-viewer working set, sequential commands make the find-then-save
 * race benign.
 *
 * **Cascade-ready, not cascade-owning.** Owner-keyed + `viewerId`-indexed
 * so the platform's per-player-working-set cleanup cascade (an
 * account-Document `aroundDelete` running `deleteMany({viewerId})`, plus
 * a liveness-GC backstop — GDPR/erasure) can purge it. Building that
 * cascade is the persistence layer's job; this Api just keeps the
 * collection ready for it. (No account-deletion hook exists to wire
 * today — flagged for the persistence layer.)
 *
 * **Durable viewer key = `templatePath`.** Avatars and singleton NPCs
 * have one (`/obj/Avatar/<playerId>`); generic NPC clones share / lack
 * one and are session-ephemeral by construction — they simply don't
 * persist, which falls out of the keying.
 */

import type { Stuff } from '../lib/stuff/Stuff';
import type { BeliefRecord } from '../lib/belief/BeliefStore';
import BeliefDocument from '../lib/belief/BeliefDocument';
import { MixinApi } from './mixin';
import { PersistenceManager } from '../../backend/PersistenceManager';
import { SecurityApi } from './security';

/** Has this record learned anything worth persisting? */
function isLearned(record: BeliefRecord): boolean {
  return record.knownAs !== null || record.payload.typeKnown === true;
}

export class BeliefStoreApi {
  /** Persistence is a no-op unless Mongo is connected (tests, pre-boot). */
  static #active(): boolean {
    return PersistenceManager.get().isConnected();
  }

  /** The durable per-viewer key, or `null` for a session-ephemeral viewer. */
  static #viewerKey(viewer: Stuff): string | null {
    return viewer.getTemplatePath();
  }

  /**
   * Lazy-hydrate `viewer`'s persisted beliefs into its in-memory map.
   * Called on session establish (`Avatar.enter`). No-op without a durable
   * viewer key or an active connection.
   */
  public static async hydrate(viewer: Stuff): Promise<void> {
    if (!this.#active() || !MixinApi.isBeliefStore(viewer)) return;
    const viewerId = this.#viewerKey(viewer);
    if (!viewerId) return;
    const docs = await BeliefDocument.find({ viewerId });
    for (const doc of docs) viewer.loadBelief(doc.toRecord());
  }

  /**
   * Per-record write-through. Persists a learned record (upsert keyed by
   * `{viewerId, realm, referent}`); no-ops for a bare stranger record, a
   * keyless viewer, or a closed connection. Fire-and-forget from the
   * mixin's sync `know`/`forget`.
   */
  public static async writeRecord(
    viewer: Stuff,
    record: BeliefRecord,
  ): Promise<void> {
    if (!this.#active()) return;
    const viewerId = this.#viewerKey(viewer);
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

  /** Drop a persisted record (mirrors the mixin's `forget`). */
  public static async deleteRecord(
    viewer: Stuff,
    realm: string,
    referent: string,
  ): Promise<void> {
    if (!this.#active()) return;
    const viewerId = this.#viewerKey(viewer);
    if (!viewerId) return;
    const docs = await BeliefDocument.find({ viewerId, realm, referent });
    for (const doc of docs) await doc.delete();
  }

  /**
   * Final flush of every learned record, then clear the in-memory map.
   * Called on logout (`onDestruct`). The flush is a backstop for any
   * write-through still in flight; clearing releases the working set.
   */
  public static async evictAndFlush(viewer: Stuff): Promise<void> {
    if (!MixinApi.isBeliefStore(viewer)) return;
    if (this.#active()) {
      const viewerId = this.#viewerKey(viewer);
      if (viewerId) {
        for (const record of viewer.allBeliefs()) {
          if (isLearned(record)) await this.writeRecord(viewer, record);
        }
      }
    }
    viewer.clearBeliefs();
  }
}

SecurityApi.decorateApiClass(BeliefStoreApi);
