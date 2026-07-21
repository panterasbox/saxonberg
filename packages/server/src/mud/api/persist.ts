/**
 * PersistApi — the single, call-security-decorated chokepoint over the
 * MongoDB `PersistenceManager`.
 *
 * `PersistenceManager` is an **ungated process singleton**: reaching it
 * via `PersistenceManager.get()` from domain / logic code bypasses the
 * security layer entirely. This facade is the sanctioned surface — all
 * non-framework persistence access flows through here, where it picks up
 * the Api security treatment (`decorateApiClass`).
 *
 * The lockdown is enforced by **`lint:pm`** (`scripts/check-pm-access.ts`,
 * CI-gating): `PersistenceManager.get()` is forbidden everywhere except
 *   - the persistence framework itself (`lib/persistence/Document`,
 *     `lib/stuff/Template`) — it *is* the data layer,
 *   - the backend (`backend/**`) — it owns PM's lifecycle (connect /
 *     seed / hooks),
 *   - `api/hot-reload` — the HMR hook-manifest reload (PM lifecycle, not
 *     data),
 *   - this facade, and tests.
 *
 * Caller policy starts permissive — the value is the *single decorated
 * chokepoint* plus the lint, both tightenable later. v1 exposes the
 * connection guard the logic layer needs plus the document data-ops, so
 * future non-framework callers (and an eventual `Document` migration) have
 * a complete surface.
 */

import { PersistenceManager } from '../../backend/PersistenceManager';
import { SecurityApi } from './security';

export class PersistApi {
  /** Whether the Mongo connection is live (the no-op-when-offline guard). */
  static isConnected(): boolean {
    return PersistenceManager.get().isConnected();
  }

  /** Documents in `collection` matching `query`. */
  static async find(
    collection: string,
    query: Record<string, unknown>
  ): Promise<Record<string, unknown>[]> {
    return PersistenceManager.get().find(collection, query);
  }

  /** One document by Mongo `_id`, or `null`. */
  static async findById(
    collection: string,
    id: string
  ): Promise<Record<string, unknown> | null> {
    return PersistenceManager.get().findById(collection, id);
  }

  /** Upsert `doc` into `collection`; returns its id. */
  static async save(
    collection: string,
    doc: Record<string, unknown>
  ): Promise<string> {
    return PersistenceManager.get().save(collection, doc);
  }

  /** Delete the document with `id` from `collection`. */
  static async delete(collection: string, id: string): Promise<void> {
    return PersistenceManager.get().delete(collection, id);
  }
}

SecurityApi.decorateApiClass(PersistApi);
