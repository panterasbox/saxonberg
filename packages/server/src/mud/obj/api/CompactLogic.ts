// CompactLogic — the hot-reloadable logic singleton behind CompactApi.
// (Doc comment on the class below so @internal lands on the reflection.)

import { ApiLogic } from "../../lib/stuff/ApiLogic";
import { CallSecurity, Unshadowable } from "../../lib/security/decorators";
import { SecurityPolicies } from "../../lib/security/SecurityPolicies";
import type { Stuff } from "../../lib/stuff/Stuff";
import { ParcelApi } from "../../api/parcel";
import { GroupApi } from "../../api/group";
import { ChatApi } from "../../api/chat";
import { OfficeApi } from "../../api/office";
import { PlayerApi } from "../../api/player";
import { ExecutionContextApi } from "../../api/execution-context";
import type {
  CommitteeView,
  CommitteeChannelView,
} from "../../api/compact";

const CompactApiCallers = SecurityPolicies.FromModule(
  "/api/compact#CompactApi"
);

/**
 * The committee over `path`, derived from parcel title: the group
 * holding title IS the committee (all committees are groups,
 * structurally); a player-held subdivision has none. Never throws —
 * `null` is the normal no-committee result.
 */
async function committeeOfImpl(path: string): Promise<CommitteeView | null> {
  if (path.length === 0) return null;
  const owner = await ParcelApi.ownerOf(path);
  if (owner.kind !== "group") return null;
  const groupRef = await ParcelApi.resolveOwnerRef(owner);
  if (!groupRef) return null;
  const parcel = await ParcelApi.coveringParcelOf(path);
  return {
    name: owner.name ?? GroupApi.parseRef(groupRef).id,
    groupRef,
    subdivisionPath: parcel?.getExtent() ?? "",
  };
}

/** The committee channel's well-known name for a committee. */
function channelNameFor(committee: CommitteeView): string {
  return `${committee.name}-committee`;
}

/**
 * CompactLogic — the hot-reloadable logic singleton behind
 * {@link CompactApi}: the Compact's (the meta institution's) single
 * facade. First residents: the committee reads — pure derive-on-read
 * over parcel title + grouping + chat; it owns no storage. Internal
 * sub-logic lives in module-private free functions; each public method
 * carries the `FromModule` gate.
 *
 * @internal
 */
@Unshadowable
export class CompactLogic extends ApiLogic {
  /** See {@link CompactApi.committeeOf}. */
  @CallSecurity(CompactApiCallers)
  public async committeeOf(path: string): Promise<CommitteeView | null> {
    return committeeOfImpl(path);
  }

  /** See {@link CompactApi.isCommitteeMember}. */
  @CallSecurity(CompactApiCallers)
  public async isCommitteeMember(
    player: Stuff,
    path: string
  ): Promise<boolean> {
    const committee = await committeeOfImpl(path);
    if (!committee) return false;
    // The Art. XI pool-of-one backstop, mirroring the office founder
    // default: at founding every committee's work is the founder's.
    if (await OfficeApi.isFounder(player)) return true;
    if (!PlayerApi.isAvatarStuff(player)) return false;
    const playerId = player.getPlayerId();
    if (!playerId) return false;
    return GroupApi.isMember(playerId, committee.groupRef);
  }

  /** See {@link CompactApi.committeeMembersOf}. */
  @CallSecurity(CompactApiCallers)
  public async committeeMembersOf(path: string): Promise<Stuff[]> {
    const committee = await committeeOfImpl(path);
    if (!committee) return [];
    return GroupApi.membersOf(committee.groupRef);
  }

  /** See {@link CompactApi.committeeChannelOf}. */
  @CallSecurity(CompactApiCallers)
  public async committeeChannelOf(
    path: string
  ): Promise<CommitteeChannelView | null> {
    const committee = await committeeOfImpl(path);
    if (!committee) return null;
    const name = channelNameFor(committee);
    const channel = await ChatApi.resolveByName(name);
    return channel ? { name } : null;
  }

  /** See {@link CompactApi.ensureCommitteeChannel}. */
  @CallSecurity(CompactApiCallers)
  public async ensureCommitteeChannel(
    path: string
  ): Promise<CommitteeChannelView | null> {
    const committee = await committeeOfImpl(path);
    if (!committee) return null;
    const name = channelNameFor(committee);
    const existing = await ChatApi.resolveByName(name);
    if (existing) return { name };
    // The mint is an act, so its actor derives from execution context —
    // never a parameter. No acting command → no mint (reads stay pure).
    const giver = ExecutionContextApi.getCurrentCommandContext()
      ?.commandGiver as Stuff | undefined;
    if (!giver) return null;
    await ChatApi.createBoundChannel(giver, name, committee.groupRef);
    return { name };
  }
}
