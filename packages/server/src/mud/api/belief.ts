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
 *
 * This Api is a thin forwarding shell: the logic lives in the
 * hot-reloadable {@link BeliefStoreLogic} singleton at `/obj/api/belief`,
 * reached synchronously via `StuffApi.singletonSync`. `dest
 * /obj/api/belief` reloads it.
 */

import type { Stuff } from '../lib/stuff/Stuff';
import type { BeliefRecord } from '../lib/belief/BeliefStore';
import { StuffApi } from './stuff';
import { HotReloadApi } from './hot-reload';
import { BeliefStoreLogic } from '../obj/api/BeliefStoreLogic';
import { fileURLToPath } from 'url';

const LOGIC_PATH = '/obj/api/belief';
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL('../obj/api/BeliefStoreLogic', import.meta.url)
);

/** Resolve the HMR-able BeliefStoreLogic singleton (sync). */
function logic(): BeliefStoreLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        LOGIC_CLASS_FILE,
        'BeliefStoreLogic'
      ) as typeof BeliefStoreLogic | null) ?? BeliefStoreLogic)()
  );
}

export class BeliefStoreApi {
  /**
   * Lazy-hydrate `viewer`'s persisted beliefs into its in-memory map.
   * Called on session establish (`Avatar.enter`). No-op without a durable
   * viewer key or an active connection.
   */
  public static async hydrate(viewer: Stuff): Promise<void> {
    return logic().hydrate(viewer);
  }

  /**
   * Per-record write-through. Persists a learned record (upsert keyed by
   * `{viewerId, realm, referent}`); no-ops for a bare stranger record, a
   * keyless viewer, or a closed connection. Fire-and-forget from the
   * mixin's sync `know`/`forget`.
   */
  public static async writeRecord(
    viewer: Stuff,
    record: BeliefRecord
  ): Promise<void> {
    return logic().writeRecord(viewer, record);
  }

  /** Drop a persisted record (mirrors the mixin's `forget`). */
  public static async deleteRecord(
    viewer: Stuff,
    realm: string,
    referent: string
  ): Promise<void> {
    return logic().deleteRecord(viewer, realm, referent);
  }

  /**
   * Final flush of every learned record, then clear the in-memory map.
   * Called on logout (`onDestruct`). The flush is a backstop for any
   * write-through still in flight; clearing releases the working set.
   */
  public static async evictAndFlush(viewer: Stuff): Promise<void> {
    return logic().evictAndFlush(viewer);
  }
}
