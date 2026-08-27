/**
 * GroupApi — thin facade over the GroupRegistry singleton.
 *
 * Stable caller-facing surface for chat's audience computation, the
 * group-DM-to-channel promotion path, and future consumers
 * (permission checks, targeting, effects).
 *
 * Thin forwarding shell: the registry-resolution + forwarding live in
 * the hot-reloadable {@link GroupLogic} singleton at `/obj/api/group`,
 * reached synchronously via `StuffApi.singletonSync`; the state lives on
 * the pinned `/obj/GroupRegistry`. `dest /obj/api/group` reloads it.
 */

import { StuffApi } from './stuff';
import { HotReloadApi } from './hot-reload';
import type { Stuff } from '../lib/stuff/Stuff';
import type {
  GroupRef,
  GroupChangeHandle,
  GroupChangeListener,
} from '../lib/social/GroupProvider';
import type { GroupRole, Group, GroupOwner } from '../lib/social/Group';
import { CallSecurity } from '../lib/security/decorators';
import { SecurityPolicies } from '../lib/security/SecurityPolicies';
import type GroupRegistry from '../obj/GroupRegistry';
import { GroupLogic } from '../obj/api/GroupLogic';
import { fileURLToPath } from 'url';
import { SecurityApi } from './security';

const LOGIC_PATH = '/obj/api/group';
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL('../obj/api/GroupLogic', import.meta.url)
);

/** Resolve the HMR-able GroupLogic singleton (sync). */
function logic(): GroupLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        LOGIC_CLASS_FILE,
        'GroupLogic'
      ) as typeof GroupLogic | null) ?? GroupLogic)()
  );
}

export class GroupApi {
  static async membersOf(ref: GroupRef): Promise<Stuff[]> {
    return logic().membersOf(ref);
  }

  static async roleOf(
    playerId: string,
    ref: GroupRef
  ): Promise<GroupRole | null> {
    return logic().roleOf(playerId, ref);
  }

  static async isMember(playerId: string, ref: GroupRef): Promise<boolean> {
    return logic().isMember(playerId, ref);
  }

  /**
   * The managed `Group`s that contain BOTH players — the objective circles
   * two members share. Used by renown to scope a signal to the circles it
   * occurred within. Empty when disconnected or no shared managed group.
   */
  static async sharedManagedGroups(
    playerIdA: string,
    playerIdB: string
  ): Promise<GroupRef[]> {
    return logic().sharedManagedGroups(playerIdA, playerIdB);
  }

  static async onMembershipChange(
    ref: GroupRef,
    cb: GroupChangeListener
  ): Promise<GroupChangeHandle> {
    return logic().onMembershipChange(ref, cb);
  }

  /**
   * Parse a `GroupRef` into `{ source, id }`. The source is the
   * segment before the first colon; the id is everything after.
   * Pure string parse — no registry access.
   */
  static parseRef(ref: GroupRef): { source: string; id: string } {
    return logic().parseRef(ref);
  }

  /**
   * Hard reference for callers that need the registry instance
   * directly — the ContactsController uses this to fire change
   * notifications after CRUD verbs.
   */
  static async registry(): Promise<GroupRegistry> {
    return logic().registry();
  }

  /**
   * Does `actor` own `group`? A plain owner matches the actor's
   * templatePath; an `office:<key>` owner resolves through
   * `CompactApi.holdsOffice` on read (founder default included), so a
   * seat handoff transfers the group with no data migration. The one
   * ownership resolution — every owner gate routes through it.
   */
  static async ownsGroup(actor: Stuff, group: Group): Promise<boolean> {
    return logic().ownsGroup(actor, group);
  }

  /**
   * Find-or-mint a managed group by name (content-packs wave 3 — the
   * installer's `requires.groups` seam). An existing name is FOUND and
   * never re-owned (adopt-by-name); a missing one is minted with `owner`.
   * Never touches members. Returns the ref and whether it was created.
   */
  static async ensureGroup(
    name: string,
    owner: GroupOwner,
  ): Promise<{ ref: GroupRef; created: boolean }> {
    return logic().ensureGroup(name, owner);
  }

  /**
   * Ensure `memberKey` (an identity path) holds `role` in the group at
   * `ref` — the `group add` write shape (add + save + fireChange), reached
   * only from the content installer (a pack's authored NPC memberships
   * under its own claims, and `pack staff`). Idempotent: false when the
   * member was already present. Gated to `PackLogic`'s caller chain.
   */
  @CallSecurity(SecurityPolicies.FromModule('/obj/api/PackLogic#PackLogic'))
  static async ensureMember(
    ref: GroupRef,
    memberKey: string,
    role: GroupRole,
  ): Promise<boolean> {
    return logic().ensureMember(ref, memberKey, role);
  }
}

SecurityApi.decorateApiClass(GroupApi);
