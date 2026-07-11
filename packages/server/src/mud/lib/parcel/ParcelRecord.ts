/**
 * ParcelRecord — one row in the **`parcels` title registry**: an ownable,
 * titled extent over the path-addressed template tree.
 *
 * A *parcel* is the real-property primitive of the property build. It
 * pairs a backing `Zone` (a `FolderZone` for an area, a spatial zone for
 * a grid) with a **title record stored separately from the content it
 * gates** — the governing security invariant. Ownership/access data lives
 * here in the gated `parcels` collection, never on the editable `domain`
 * zone template, so a content edit (or a future untrusted content pack)
 * can never forge a title.
 *
 * Parcels form a **sparse hierarchy** over the zone tree: a zone with no
 * parcel row inherits its governing parcel from the nearest parcel-bearing
 * ancestor (longest-prefix over `extent`, the `AddressRegistry` coverage
 * pattern). `parentParcel` records that edge for O(1) transfer/subdivide
 * bookkeeping (derivable from the coverage trie, but cheap to keep).
 *
 * `owner` is a typed {@link ParcelOwner} principal — a managed group or an
 * individual player — so `AccessApi.can`/`canMutateZone` dispatch on the
 * owner *kind* (group → membership/role; player → identity match). The
 * `grants[]` and `allowance` fields are **inert 0a seams** (0b lease
 * mechanics + the Phase 1 compute economy); 0a populates/resolves `owner`
 * only.
 *
 * It `extends Document` only for persistence (the `StoredDocument`
 * precedent — a plain path-keyed row, not a Stuff). The append-only
 * chain-of-title trail lives in the sibling {@link ParcelEvent}
 * (`parcel_events`); these `parcels` rows are the rebuildable
 * current-state cache (the `bank_ledger`→`bank_accounts` shape).
 */

import { Document } from "../persistence/Document";
import type { GroupRef } from "../social/GroupProvider";

/**
 * A parcel's title holder — a typed principal, resolved by the access
 * layer on the owner *kind*:
 *
 *   - `group` — a managed group. `ref` (an explicit `managed:<id>`) wins
 *     when present; otherwise `name` is resolved mint-or-find by the
 *     registry (how a seeded `'lounge'`/`'terminus'`/`'core'` owner maps
 *     to a runtime ref without the seed knowing the group id).
 *   - `player` — an individual, keyed on the durable `templatePath`
 *     (a self-home owner, or a title transferred to a player).
 */
export type ParcelOwner =
  | { kind: "group"; name?: string; ref?: GroupRef }
  | { kind: "player"; templatePath: string };

export class ParcelRecord extends Document {
  static collectionName = "parcels";
  static persistentFields = [
    "extent",
    "zonePath",
    "owner",
    "parentParcel",
    "grants",
    "allowance",
  ];

  /** The path this parcel claims — the coverage-index key (longest-prefix). */
  extent: string = "";

  /** The backing Zone's templatePath (== `extent` in 0a). */
  zonePath: string = "";

  /** The typed title holder (group or individual player). */
  owner: ParcelOwner | null = null;

  /** The parent parcel's `extent` (the sparse-hierarchy edge), or null. */
  parentParcel: string | null = null;

  /** INERT 0a seam — 0b lease/grant mechanics (`useRightOf`). */
  grants: unknown[] = [];

  /** INERT 0a seam — the Phase 1 compute-allowance economy. */
  allowance: unknown | null = null;

  getExtent(): string {
    return this.extent;
  }

  getZonePath(): string {
    return this.zonePath;
  }

  getOwner(): ParcelOwner | null {
    return this.owner;
  }

  getParentParcel(): string | null {
    return this.parentParcel;
  }

  /**
   * The pure self-home ownership rule (rung 2 of the resolution chain):
   * a path strictly under `/home/<key>/` is owned by that player, keyed on
   * the durable `/home/<key>` branch — **no `parcels` row**. Returns null
   * for any other path. This is the single canonical implementation the
   * `ownerOf` chain and `DocumentLogic.isOwnHomePath` both consume
   * (generalize-not-fork the shipped self-home base case). Lives here (not
   * on the Api) so `ParcelRegistry` can call it without a value-level
   * import cycle through `ParcelApi`.
   */
  static selfHomeOwnerOf(path: string): ParcelOwner | null {
    const match = /^\/home\/([^/]+)\//.exec(path);
    if (!match) return null;
    return { kind: "player", templatePath: `/home/${match[1]}` };
  }

  /** The one parcel claiming exactly `extent`, or null. */
  static async findByExtent(extent: string): Promise<ParcelRecord | null> {
    const rows = await ParcelRecord.find<ParcelRecord>({ extent });
    return rows[0] ?? null;
  }

  /** Every parcel row (the coverage-index rebuild input). */
  static async findAll(): Promise<ParcelRecord[]> {
    return ParcelRecord.find<ParcelRecord>({});
  }
}
