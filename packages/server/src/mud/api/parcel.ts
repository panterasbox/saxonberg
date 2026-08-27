/**
 * ParcelApi — thin facade over the `ParcelRegistry` singleton, the
 * caller-facing surface for the **real-property title** substrate.
 *
 * Every method delegates through the hot-reloadable {@link ParcelLogic}
 * singleton at `/obj/api/parcel` to the Registry; the Registry's methods
 * carry `@CallSecurity(AnyOf(FromModule('/api/parcel#ParcelApi'),
 * FromTemplate('/obj/api/parcel')))` so the gate denies any caller outside
 * the parcel subsystem. This Api is the only legitimate path — the
 * narrow-entry pattern (one state home, one calling surface).
 *
 * `AccessApi` consults `ownerOf`/`resolveOwnerRef`/`groupOwnerRefs` for
 * ownership resolution (access-*decision* logic stays in the access
 * layer); the `subdivide`/`transfer` verbs mint titles; `DocumentLogic`
 * consumes the pure {@link ParcelApi.selfHomeOwnerOf} (the shared
 * self-home rule).
 */

import { StuffApi } from "./stuff";
import { HotReloadApi } from "./hot-reload";
import { ParcelLogic } from "../obj/api/ParcelLogic";
import {
  ParcelRecord,
  type ParcelOwner,
} from "../lib/parcel/ParcelRecord";
import { LandUses } from "../lib/parcel/LandUse";
import type { LandUse, CultivationScale } from "../lib/parcel/LandUse";
import type { GroupRef } from "../lib/social/GroupProvider";
import { fileURLToPath } from "url";
import { SecurityApi } from './security';

const LOGIC_PATH = "/obj/api/parcel";
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL("../obj/api/ParcelLogic", import.meta.url),
);

/** Resolve the HMR-able ParcelLogic singleton (sync). */
function logic(): ParcelLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        LOGIC_CLASS_FILE,
        "ParcelLogic",
      ) as typeof ParcelLogic | null) ?? ParcelLogic)(),
  );
}

export type {
  ParcelOwner,
  ParcelSpace,
  TitleClaim,
  TitleGrantOutcome,
} from "../lib/parcel/ParcelRecord";
import type {
  ParcelSpace,
  TitleClaim,
  TitleGrantOutcome,
} from "../lib/parcel/ParcelRecord";
export {
  LandUses,
  LAND_USES,
  CULTIVATION_SCALES,
} from "../lib/parcel/LandUse";
export type { LandUse, CultivationScale } from "../lib/parcel/LandUse";

export class ParcelApi {
  /**
   * The total three-rung title chain — explicit parcel title → self-home
   * identity → `null` (untitled: every `can` there fails closed — content-packs wave 3).
   * Total (resolves for any path). Byte-identical to today's core walk for
   * untitled content (no author rung — authoring confers credit, not
   * title).
   */
  public static async ownerOf(path: string): Promise<ParcelOwner | null> {
    return logic().ownerOf(path);
  }

  /**
   * The most-specific parcel whose `extent` covers `path` (nearest
   * parcel-bearing ancestor, longest-prefix), or null when none covers.
   */
  public static async coveringParcelOf(
    path: string,
  ): Promise<ParcelRecord | null> {
    return logic().coveringParcelOf(path);
  }

  /**
   * Resolve a `group`-kind owner to a real `managed:<id>` ref (explicit
   * ref wins; else mint-or-find by name). Null for a `player` owner. The
   * data-driven group resolution that moved out of `AccessRegistry`.
   */
  public static async resolveOwnerRef(
    owner: ParcelOwner,
  ): Promise<GroupRef | null> {
    return logic().resolveOwnerRef(owner);
  }

  /**
   * Every managed-group ref named by a `group`-kind parcel owner — the
   * former input to the retired author scope; kept as the group-owner walk.
   */
  public static async groupOwnerRefs(): Promise<GroupRef[]> {
    return logic().groupOwnerRefs();
  }

  /**
   * Write a genesis child-parcel row (owner inherited, `parentParcel` set)
   * + a `subdivide` chain-of-title event; warm the trie. The child zone is
   * minted by the caller first. Actor for the event is derived from
   * execution context, never a parameter.
   */
  public static async subdivide(
    childPath: string,
    parentExtent: string,
    owner: ParcelOwner,
    area = 0,
    storeys = 1,
    landUse: LandUse | null = null,
  ): Promise<ParcelRecord | null> {
    return logic().subdivide(
      childPath,
      parentExtent,
      owner,
      area,
      storeys,
      landUse,
    );
  }

  /**
   * What may be done on the ground at `path` — the longest-prefix land-use
   * read (explicit row → its `parentParcel` chain → `wild`). Total: every
   * path answers.
   *
   * `wild` admits **nothing**, so the default is fail-closed. Most parcel
   * rows are path-branch titles over the template tree (`/studio`,
   * `/obj/lounge`) rather than ground, and none of them should read as
   * cultivable merely because nobody zoned them.
   */
  public static landUseOf(path: string): LandUse {
    return logic().landUseOf(path);
  }

  /**
   * How much cultivation the ground at `path` admits — `none` · `bed` ·
   * `field`. The one question farming asks of zoning; sugar over
   * {@link ParcelApi.landUseOf} so a caller need not import the vocabulary
   * to ask it.
   */
  public static cultivationScaleAt(path: string): CultivationScale {
    return LandUses.admitsCultivation(logic().landUseOf(path));
  }

  /**
   * A parcel's **space account** — capacity, what is spoken for, what is
   * left, and the ratio. All derived on read; nothing stored.
   *
   * A ceiling on its own is useless — nobody plans against a maximum. These
   * are the numbers that answer real questions, and they read differently
   * by tier because `area` means ground for a child of a lot and floor for
   * a child of a building:
   *
   * - on a **lot** — `allocated` is its buildings' footprints,
   *   `unallocated` is the **yard**, `utilisation` is **site coverage**;
   * - in a **building** — `allocated` is its units' floor area,
   *   `unallocated` is the **common area** (corridors, cores, stairs),
   *   `utilisation` is **efficiency**.
   *
   * A building that has let 100% of its gross floor reports zero common
   * area, which is visibly absurd — this does not forbid it, it shows it.
   */
  public static async spaceOf(extent: string): Promise<ParcelSpace> {
    return logic().spaceOf(extent);
  }

  /**
   * The unallocated half of {@link ParcelApi.spaceOf} on its own — the
   * yard on a lot, the common area in a building.
   */
  public static async workableAreaOf(extent: string): Promise<number> {
    return (await logic().spaceOf(extent)).unallocated;
  }

  /** Every parcel row (the title registry's full read; the held-extents walk). */
  public static async allRecords(): Promise<ParcelRecord[]> {
    return logic().allRecords();
  }

  /**
   * ⭐ Apply a declared title claim — the content installer's seam
   * (content-packs wave 3; `PackLogic.applyRequires` is the one caller).
   * Absent → `granted` (row + `grant` event); same holder → `kept`;
   * different holder → `conflict` (untouched — the caller records it).
   * As exposed as `transfer`: authority is the caller's business.
   */
  public static async grant(
    claim: TitleClaim,
  ): Promise<{ outcome: TitleGrantOutcome; holder: ParcelOwner }> {
    return logic().grant(claim);
  }

  /**
   * Move a parcel title — append a `transfer` event (never a destructive
   * overwrite; the prior owner stays recoverable from the log), then
   * update the current-state row. Null when no parcel claims `extent`.
   */
  public static async transfer(
    extent: string,
    newOwner: ParcelOwner,
  ): Promise<ParcelRecord | null> {
    return logic().transfer(extent, newOwner);
  }

  /**
   * Grant a lease (use-grant) on `extent` to `holder` (a durable player
   * path), replacing any prior grant for that holder; `expiresAt` is
   * epoch-ms or null (indefinite). False when no parcel claims `extent`.
   */
  public static async grantUse(
    extent: string,
    holder: string,
    expiresAt: number | null,
  ): Promise<boolean> {
    return logic().grantUse(extent, holder, expiresAt);
  }

  /** Revoke `holder`'s lease on `extent`; true when a grant was removed. */
  public static async revokeUse(
    extent: string,
    holder: string,
  ): Promise<boolean> {
    return logic().revokeUse(extent, holder);
  }

  /** Whether `holder` holds an active (unexpired) lease on `extent`. */
  public static async hasUseGrant(
    extent: string,
    holder: string,
  ): Promise<boolean> {
    return logic().hasUseGrant(extent, holder);
  }

  /** Set (re-key) the lock keyway on `extent`; false when no parcel claims it. */
  public static async setKeyway(
    extent: string,
    keyway: string,
  ): Promise<boolean> {
    return logic().setKeyway(extent, keyway);
  }

  /** The unit parcel `holder` currently leases, or null (a linear scan). */
  public static async heldUnitOf(
    holder: string,
  ): Promise<ParcelRecord | null> {
    return logic().heldUnitOf(holder);
  }

  /** Every child parcel of `parentExtent` (the provisioned units). */
  public static async childParcelsOf(
    parentExtent: string,
  ): Promise<ParcelRecord[]> {
    return logic().childParcelsOf(parentExtent);
  }

  /** Retire (delete) the unit row claiming `extent`; frees its slot. */
  public static async retire(extent: string): Promise<void> {
    return logic().retire(extent);
  }

  /** Drop + rebuild the coverage index from the `parcels` collection. */
  public static async rebuildCoverageIndex(): Promise<void> {
    return logic().rebuildCoverageIndex();
  }

  /**
   * The pure self-home ownership rule (resolution rung 2): a path strictly
   * under `/home/<key>/` → that player, keyed on the durable `/home/<key>`
   * branch (no `parcels` row), else null. The single shared implementation
   * `DocumentLogic.isOwnHomePath` and `ownerOf` both consume. Pure — no
   * registry, directly callable.
   */
  public static selfHomeOwnerOf(path: string): ParcelOwner | null {
    return ParcelRecord.selfHomeOwnerOf(path);
  }

  /**
   * HMR seam: drop the cached Registry pointer so the next call
   * re-resolves. Registry state itself is unaffected.
   * @internal
   */
  public static _resetRegistryRefForReload(): void {
    logic()._resetRegistryRefForReload();
  }
}

SecurityApi.decorateApiClass(ParcelApi);
