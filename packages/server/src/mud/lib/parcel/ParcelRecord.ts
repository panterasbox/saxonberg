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

/**
 * A **use-grant** on a parcel — the minimal property-0b lease relationship
 * (a tenant's time-bounded right to occupy + use a unit, distinct from its
 * title). `holder` is the tenant's durable player templatePath; `expiresAt`
 * is epoch-ms or `null` for an indefinite lease. Stored on `grants[]` (the
 * 0a seam, now typed); a grant-event log is a deferred seam.
 */
export interface UseGrant {
  kind: "lease";
  holder: string;
  grantedAt: number;
  expiresAt: number | null;
}

/** The durable slot `(floor, position)` a unit parcel encodes in its extent. */
export interface UnitSlot {
  floor: number;
  pos: number;
}

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

  /** Use-grants (leases) on this parcel — the 0b lease relationship. */
  grants: UseGrant[] = [];

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

  getGrants(): UseGrant[] {
    return this.grants;
  }

  /**
   * The active lease held by `holder` at `now` (epoch-ms), or null. A grant
   * is active when its `holder` matches and it has not expired
   * (`expiresAt === null` = indefinite). Pure — no I/O.
   */
  static activeGrantFor(
    record: ParcelRecord,
    holder: string,
    now: number,
  ): UseGrant | null {
    for (const grant of record.grants) {
      if (grant.holder !== holder) continue;
      if (grant.expiresAt !== null && grant.expiresAt <= now) continue;
      return grant;
    }
    return null;
  }

  /** Whether `holder` holds an active lease on `record` at `now`. */
  static hasActiveGrant(
    record: ParcelRecord,
    holder: string,
    now: number,
  ): boolean {
    return ParcelRecord.activeGrantFor(record, holder, now) !== null;
  }

  /**
   * The holder of the first active (unexpired) lease on `record` at `now`, or
   * null — the "who leases this unit" reverse of `activeGrantFor` (v1: one
   * holder per unit). Pure. Lets a door know its tenant synchronously.
   */
  static activeHolderOf(record: ParcelRecord, now: number): string | null {
    for (const grant of record.grants) {
      if (grant.expiresAt === null || grant.expiresAt > now) return grant.holder;
    }
    return null;
  }

  /**
   * Parse a unit extent's encoded slot — the trailing `…/f<floor>-r<pos>`
   * segment (DECISION J: the extent *is* the slot). Returns null when the
   * extent's last segment isn't a slot token. Pure.
   */
  static slotOfExtent(extent: string): UnitSlot | null {
    const leaf = extent.slice(extent.lastIndexOf("/") + 1);
    const match = /^f(\d+)-r(\d+)$/.exec(leaf);
    if (!match) return null;
    return { floor: Number(match[1]), pos: Number(match[2]) };
  }

  /** Format a unit extent from its parent (dorms) extent + a `(floor, pos)`. */
  static extentForSlot(
    parentExtent: string,
    floor: number,
    pos: number,
  ): string {
    return `${parentExtent}/f${floor}-r${pos}`;
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

  /** Every parcel whose `parentParcel` is `parentExtent` (child units). */
  static async findChildren(parentExtent: string): Promise<ParcelRecord[]> {
    return ParcelRecord.find<ParcelRecord>({ parentParcel: parentExtent });
  }

  /** Delete the row claiming exactly `extent` (frees its slot). */
  static async deleteByExtent(extent: string): Promise<void> {
    const row = await ParcelRecord.findByExtent(extent);
    if (row) await row.delete();
  }
}
