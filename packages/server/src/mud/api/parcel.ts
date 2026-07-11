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

import { SecurityApi } from "./security";
import { StuffApi } from "./stuff";
import { HotReloadApi } from "./hot-reload";
import { ParcelLogic } from "../obj/api/ParcelLogic";
import {
  ParcelRecord,
  type ParcelOwner,
} from "../lib/parcel/ParcelRecord";
import type { GroupRef } from "../lib/social/GroupProvider";
import { fileURLToPath } from "url";

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

export type { ParcelOwner } from "../lib/parcel/ParcelRecord";

export class ParcelApi {
  /**
   * The total three-rung title chain — explicit parcel title → self-home
   * identity → the state (public default, `{kind:'group', name:'core'}`).
   * Total (resolves for any path). Byte-identical to today's core walk for
   * untitled content (no author rung — authoring confers credit, not
   * title).
   */
  public static async ownerOf(path: string): Promise<ParcelOwner> {
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
   * repointed input to `AccessRegistry.ensureAuthorGroups`.
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
  ): Promise<ParcelRecord | null> {
    return logic().subdivide(childPath, parentExtent, owner);
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
