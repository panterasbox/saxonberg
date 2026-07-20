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
import type { GroupRole } from '../lib/social/Group';
import type GroupRegistry from '../obj/GroupRegistry';
import { GroupLogic } from '../obj/api/GroupLogic';
import { fileURLToPath } from 'url';

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
}
