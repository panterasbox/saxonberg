/**
 * PersistedRecord — one row in the **`holder_snapshots`** engine collection:
 * the captured runtime state of a single persistence **host** (an avatar, an
 * authored room, a unique host chest) for a single **owner**.
 *
 * The persistence spine's engine-of-record. A record is the `{ scope, owner,
 * state }` envelope the {@link PersistableLogic} capture/restore path
 * produces and consumes:
 *
 *   - `scope` — the host's singleton `templatePath`. Identity + the base to
 *     re-clone the shell from. Materialize loads every record with this
 *     `scope`.
 *   - `owner` — whose content this record holds (a principal's durable
 *     `templatePath`, a `group:<name>` sentinel, or `'core'`). The
 *     **account-deletion cascade key** — removing a principal is a keyed
 *     delete over `owner`.
 *   - `state` — the per-mixin-composed capture: a map keyed by mixin/layer
 *     name to that layer's {@link MixinSlice}. Stored as opaque JSON (no
 *     marshaller — `Document.toDocument` copies an un-marshalled field as-is,
 *     the `StoredDocument.data` precedent); only `PersistableLogic` ever
 *     builds or interprets it. The store and the account-deletion cascade
 *     never inspect a mixin's internals.
 *
 * It `extends Document` purely for persistence (the `StoredDocument` /
 * `ParcelRecord` precedent — a plain path-keyed row, not a `Stuff`). There
 * is **no player-facing write path**: the collection is written only by the
 * gated {@link PersistableLogic}, reached through `PersistableApi`'s gated
 * methods. See [docs/subsystems/persistence.md] and
 * [docs/requirements/persistence-spine-requirements.md].
 */

import { Document } from "./Document";
import type { MixinSlice, HostPlacement } from "./PersistenceSlice";
import type { FieldMeta } from "../mixin";

export class PersistedRecord extends Document {
  static collectionName = "holder_snapshots";
  static fieldMeta: FieldMeta = {
    scope: { persistent: true },
    owner: { persistent: true },
    state: { persistent: true },
    place: { persistent: true },
  };

  /** The host's singleton `templatePath` — identity + re-clone base. */
  scope: string = "";

  /** Whose content this record holds — the account-deletion cascade key. */
  owner: string = "";

  /** The per-mixin-composed capture (opaque JSON — see class doc). */
  state: Record<string, MixinSlice> = {};

  /**
   * A **Containable top-level host**'s own durable location (an avatar's
   * spawn/recall point) — the `WarrenMember`-reconciled `startLocation` or
   * a plain `container` templatePath, or null for a non-Containable host (a
   * room) or one placed by its referrer. Restored on materialize. This is
   * the persistence-spine home of the location capture `snapshotToTemplate`
   * once wrote to the avatar template.
   */
  place: HostPlacement | null = null;

  getScope(): string {
    return this.scope;
  }

  getOwner(): string {
    return this.owner;
  }

  getState(): Record<string, MixinSlice> {
    return this.state;
  }

  getPlace(): HostPlacement | null {
    return this.place;
  }

  /** Every record scoped to a host `templatePath` (one per owner). */
  static async findByScope(scope: string): Promise<PersistedRecord[]> {
    return PersistedRecord.find<PersistedRecord>({ scope });
  }

  /** The single record for a `(scope, owner)` pair, or null. */
  static async findByScopeAndOwner(
    scope: string,
    owner: string,
  ): Promise<PersistedRecord | null> {
    const rows = await PersistedRecord.find<PersistedRecord>({ scope, owner });
    return rows[0] ?? null;
  }

  /** Every record a principal owns (the account-deletion cascade input). */
  static async findByOwner(owner: string): Promise<PersistedRecord[]> {
    return PersistedRecord.find<PersistedRecord>({ owner });
  }

  /** Delete every record a principal owns; returns the count removed. */
  static async deleteByOwner(owner: string): Promise<number> {
    const rows = await PersistedRecord.findByOwner(owner);
    for (const row of rows) {
      await row.delete();
    }
    return rows.length;
  }
}
