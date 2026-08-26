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
import { Collections } from "../persistence/Collections";
import { LandUses } from "./LandUse";
import type { LandUse } from "./LandUse";
import type { GroupRef } from "../social/GroupProvider";
import type { FieldMeta } from "../mixin";

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
 *   - `organization` — an `OrganizationMixin` host, keyed on its
 *     `templatePath` (`/compact/executive`, `/corpo/<key>`). Held by
 *     everyone holding a **non-exited position** in the organization AND
 *     by its **appointing authority** (an office, founder default
 *     included) — the staff plus the head. The organization must be
 *     resident for the title to admit anyone; a non-resident target fails
 *     closed. The wave-3 kind that lets the executive hold the platform.
 */
export type ParcelOwner =
  | { kind: "group"; name?: string; ref?: GroupRef }
  | { kind: "player"; templatePath: string }
  | { kind: "organization"; templatePath: string };

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

/**
 * A parcel's **space account** — capacity, what is spoken for, what is
 * left, and the ratio between them. Every field derives on read; none is
 * stored.
 *
 * Reads as **site coverage** on a lot (allocated = its buildings'
 * footprints, unallocated = the yard) and as **efficiency** in a building
 * (allocated = its units' floor area, unallocated = common area — the
 * corridors, cores and stairs you had to build to reach the units).
 */
export interface ParcelSpace {
  /** `area × storeys` — the ceiling, and the least interesting number. */
  capacity: number;
  /** Declared by the children: footprints on a lot, floor area in a building. */
  allocated: number;
  /** `capacity − allocated` — the yard, or the common area. */
  unallocated: number;
  /** `allocated ÷ capacity`, 0..1. Coverage on a lot, efficiency in a building. */
  utilisation: number;
}

export class ParcelRecord extends Document {
  static collectionName = Collections.Parcels;
  static fieldMeta: FieldMeta = {
    extent: { persistent: true },
    zonePath: { persistent: true },
    area: { persistent: true },
    storeys: { persistent: true },
    owner: { persistent: true },
    parentParcel: { persistent: true },
    grants: { persistent: true },
    allowance: { persistent: true },
    keyway: { persistent: true },
    landUse: { persistent: true },
  };

  /** The path this parcel claims — the coverage-index key (longest-prefix). */
  extent: string = "";

  /** The backing Zone's templatePath (== `extent` in 0a). */
  zonePath: string = "";

  /** The typed title holder (group or individual player). */
  owner: ParcelOwner | null = null;

  /**
   * The parcel's **gross ground area**, m². Declared at provision, **never
   * derived** — deriving it from room geometry would make placeholder rooms
   * load-bearing and promote a lighting constant into a land-tenure fact
   * (`getSizeScale()` is `cellSize²` with exactly one consumer, the vision
   * walk dividing flux into lux). 0 means "not declared", which is every
   * parcel that predates this field.
   *
   * ⚠ Build-2 (Hinkley Hills) declares this same field; the declarations
   * are deliberately identical so the merge is trivial.
   */
  area: number = 0;

  /**
   * How many **storeys** stand on this parcel. Default 1, which is every
   * ground parcel and is behaviour-identical to not having the field.
   *
   * The multi-storey correction (D17). Two different quantities get called
   * "area": **ground** area is conserved (children ≤ parent), **floor**
   * area is not — it is multiplied by storeys. A 300 m² footprint at four
   * storeys offers ~1200 m² of interior to subdivide into units, so a
   * conservation rule written against `area` alone would refuse apartments
   * at `subdivide` on the second floor. The ceiling is `area × storeys`.
   *
   * `storeys` rather than a `grossFloorArea` field because **the row
   * already encodes floors**: `slotOfExtent` parses a trailing
   * `f<floor>-r<pos>` ("the extent IS the slot"), built for the dorm. The
   * vertical dimension was already in the extent grammar with no area
   * semantics attached; this gives it some. Unequal floor plates are the
   * LOD ladder's problem, not v1's.
   */
  storeys: number = 1;

  /** The parent parcel's `extent` (the sparse-hierarchy edge), or null. */
  parentParcel: string | null = null;

  /** Use-grants (leases) on this parcel — the 0b lease relationship. */
  grants: UseGrant[] = [];

  /** INERT 0a seam — the Phase 1 compute-allowance economy. */
  allowance: unknown | null = null;

  /** The lock keyway a door on this parcel is keyed to (the lock's identity;
   *  re-minted each provision so old keys stop matching). Empty = unlocked/none. */
  keyway: string = "";

  /**
   * What may be done on this ground — the capability half of a zoning act.
   * `null` = **inherit** from the covering parcel (`ParcelApi.landUseOf`
   * walks upward); ground nothing claims answers `wild`, which admits
   * nothing. Declared here in the gated `parcels` collection and never on
   * an editable zone template — it gates behaviour, so it is access-check
   * data. See `LandUse.ts`.
   */
  landUse: LandUse | null = null;

  getExtent(): string {
    return this.extent;
  }

  /** This parcel's OWN declared use, or null when it inherits. */
  getLandUse(): LandUse | null {
    return this.landUse;
  }

  /**
   * Declare this parcel's use. Validates against the closed vocabulary —
   * an unknown use throws naming the offending value. `null` restores
   * inheritance.
   */
  setLandUse(use: LandUse | string | null): void {
    this.landUse = use === null ? null : LandUses.parse(use);
  }

  getKeyway(): string {
    return this.keyway;
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

  getArea(): number {
    return this.area;
  }

  getStoreys(): number {
    return this.storeys > 0 ? this.storeys : 1;
  }

  /**
   * The **floor** area available to subdivide out of this parcel:
   * `area × storeys`. For every ground parcel (`storeys: 1`) this is just
   * its area, so nothing changes; for a building it is what lets four
   * storeys let four times the footprint.
   */
  getGrossFloorArea(): number {
    return this.getArea() * this.getStoreys();
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
