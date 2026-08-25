// GroupLogic — the hot-reloadable logic singleton behind GroupApi.
// (Doc comment on the class below so @internal lands on the reflection.)

import { ApiLogic } from '../../lib/stuff/ApiLogic';
import { CallSecurity, Unshadowable } from '../../lib/security/decorators';
import { SecurityPolicies } from '../../lib/security/SecurityPolicies';
import { StuffApi } from '../../api/stuff';
import { TemplatePaths } from '../../lib/paths';
import { PersistApi } from '../../api/persist';
import { Group } from '../../lib/social/Group';
import type { Stuff } from '../../lib/stuff/Stuff';
import type {
  GroupRef,
  GroupChangeHandle,
  GroupChangeListener,
} from '../../lib/social/GroupProvider';
import type { GroupRole } from '../../lib/social/Group';
import type GroupRegistry from '../GroupRegistry';

const REGISTRY_PATH = TemplatePaths.groupRegistry;

const GroupApiCallers = SecurityPolicies.FromModule('/api/group#GroupApi');

/**
 * Resolve the pinned `GroupRegistry` singleton (the state home), warming
 * it lazily through the async `singleton()` clone path when bootstrap
 * hasn't seeded it yet (test contexts). Module-level cache mirrors the
 * former `GroupApi.#registryRef` — it survives the logic singleton's
 * `dest`/recreate.
 */
let registryRef: GroupRegistry | null = null;
async function requireRegistry(): Promise<GroupRegistry> {
  if (registryRef) return registryRef;
  const reg = StuffApi.findByTemplatePath<GroupRegistry>(REGISTRY_PATH);
  if (reg) {
    registryRef = reg;
    return reg;
  }
  const lazy = await StuffApi.singleton<GroupRegistry>(REGISTRY_PATH);
  registryRef = lazy;
  return lazy;
}

/**
 * GroupLogic — the hot-reloadable logic singleton behind
 * {@link GroupApi}.
 *
 * Lives at `/obj/api/group`. Holds the registry-resolution + forwarding;
 * the state lives on the pinned `/obj/GroupRegistry` singleton (whose
 * provider-dispatch methods are ungated, so no gate-widening needed).
 * Each method is gated `FromModule('/api/group#GroupApi')` (the Api
 * is the only caller; no intra-singleton self-calls).
 *
 * @internal
 */
@Unshadowable
export class GroupLogic extends ApiLogic {
  /** See {@link GroupApi.membersOf}. */
  @CallSecurity(GroupApiCallers)
  public async membersOf(ref: GroupRef): Promise<Stuff[]> {
    return (await requireRegistry()).membersOf(ref);
  }

  /** See {@link GroupApi.roleOf}. */
  @CallSecurity(GroupApiCallers)
  public async roleOf(
    playerId: string,
    ref: GroupRef
  ): Promise<GroupRole | null> {
    return (await requireRegistry()).roleOf(playerId, ref);
  }

  /** See {@link GroupApi.isMember}. */
  @CallSecurity(GroupApiCallers)
  public async isMember(playerId: string, ref: GroupRef): Promise<boolean> {
    return (await requireRegistry()).isMember(playerId, ref);
  }

  /** See {@link GroupApi.onMembershipChange}. */
  @CallSecurity(GroupApiCallers)
  public async onMembershipChange(
    ref: GroupRef,
    cb: GroupChangeListener
  ): Promise<GroupChangeHandle> {
    return (await requireRegistry()).onMembershipChange(ref, cb);
  }

  /** See {@link GroupApi.parseRef}. */
  @CallSecurity(GroupApiCallers)
  public parseRef(ref: GroupRef): { source: string; id: string } {
    const idx = ref.indexOf(':');
    if (idx < 0) {
      throw new Error(
        `GroupApi.parseRef: malformed ref '${ref}' — expected 'source:id'`
      );
    }
    return { source: ref.slice(0, idx), id: ref.slice(idx + 1) };
  }

  /** See {@link GroupApi.sharedManagedGroups}. */
  @CallSecurity(GroupApiCallers)
  public async sharedManagedGroups(
    playerIdA: string,
    playerIdB: string
  ): Promise<GroupRef[]> {
    if (!PersistApi.isConnected()) return [];
    // The `groups` collection is indexed on `memberIds`; the array-contains
    // query is the hot path. Intersect by filtering for the second member.
    const groups = await Group.find({ memberIds: playerIdA });
    return groups
      .filter((g) => g._id !== undefined && g.isMember(playerIdB))
      .map((g) => `managed:${g._id}` as GroupRef);
  }

  /** See {@link GroupApi.registry}. */
  @CallSecurity(GroupApiCallers)
  public async registry(): Promise<GroupRegistry> {
    return requireRegistry();
  }

  /** See {@link GroupApi.ownsGroup}. */
  @CallSecurity(GroupApiCallers)
  public async ownsGroup(actor: Stuff, group: Group): Promise<boolean> {
    return (await requireRegistry()).ownsGroup(actor, group);
  }
}
