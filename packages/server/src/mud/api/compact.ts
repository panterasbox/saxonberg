/**
 * CompactApi — the single facade for the **Compact**, the real
 * meta-institution (never a fiction concept; the diegetic governments
 * live on `GovernmentApi`). New meta-institutional surface lands HERE —
 * membership, franchise, and their kin as they build — instead of
 * minting per-feature Apis.
 *
 * First residents: the **committee** reads. A committee is *the group
 * holding parcel title over a subdivision* — a relationship derived on
 * read from `ParcelApi.ownerOf`, never a stored kind: all committees
 * are groups structurally, not all groups are committees, and a
 * player-held subdivision has none. Membership management is the
 * existing `group` verb suite (a committee IS a managed Group);
 * authority is exactly title (the access substrate, unchanged).
 * Committee chat channels ride the existing Subject binding
 * (`ChatApi.createBoundChannel`) — the audience walk resolves through
 * `GroupApi.membersOf` like any channel.
 *
 * Thin forwarding shell: the logic lives in the hot-reloadable
 * {@link CompactLogic} singleton at `/obj/api/compact`.
 * `dest /obj/api/compact` reloads it.
 */

import type { Stuff } from "../lib/stuff/Stuff";
import type { GroupRef } from "../lib/social/GroupProvider";
import { StuffApi } from "./stuff";
import { HotReloadApi } from "./hot-reload";
import { CompactLogic } from "../obj/api/CompactLogic";
import { fileURLToPath } from "url";
import { SecurityApi } from "./security";

/** A committee resolved from title: the administering group. */
export interface CommitteeView {
  /** The managed group's name (or its ref id when unnamed). */
  name: string;
  /** The committee group's ref — the chat/audience join. */
  groupRef: GroupRef;
  /** The covering parcel's extent (`''` for the state default). */
  subdivisionPath: string;
}

/** A committee's chat channel, by well-known name. */
export interface CommitteeChannelView {
  name: string;
}

const LOGIC_PATH = "/obj/api/compact";
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL("../obj/api/CompactLogic", import.meta.url)
);

/** Resolve the HMR-able CompactLogic singleton (sync). */
function logic(): CompactLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        LOGIC_CLASS_FILE,
        "CompactLogic"
      ) as typeof CompactLogic | null) ?? CompactLogic)()
  );
}

export class CompactApi {
  /**
   * The committee over `path` — the group holding title (the state
   * default `core` included), or `null` for a player-held subdivision.
   * Derived on read; never throws.
   */
  public static async committeeOf(path: string): Promise<CommitteeView | null> {
    return logic().committeeOf(path);
  }

  /**
   * Whether `player` sits on the committee over `path` — a member of
   * the title-holding group, or the founder (the Art. XI pool-of-one
   * backstop, mirroring the office founder default).
   */
  public static async isCommitteeMember(
    player: Stuff,
    path: string
  ): Promise<boolean> {
    return logic().isCommitteeMember(player, path);
  }

  /** The committee's materialized members (the grouping online filter). */
  public static async committeeMembersOf(path: string): Promise<Stuff[]> {
    return logic().committeeMembersOf(path);
  }

  /** The committee's chat channel, or `null` when none is minted yet. */
  public static async committeeChannelOf(
    path: string
  ): Promise<CommitteeChannelView | null> {
    return logic().committeeChannelOf(path);
  }

  /**
   * Ensure the committee's channel exists (idempotent): resolve by its
   * well-known name, else mint a persistent channel whose Subject binds
   * the committee group's ref (the promotion-path shape — the committee
   * group pre-exists; chat owns nothing new). The mint's actor derives
   * from execution context; with no acting command this only resolves.
   */
  public static async ensureCommitteeChannel(
    path: string
  ): Promise<CommitteeChannelView | null> {
    return logic().ensureCommitteeChannel(path);
  }
}

SecurityApi.decorateApiClass(CompactApi);
