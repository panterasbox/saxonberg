/**
 * MqlGroupProvider — read-only, query-driven membership.
 *
 * Ref shape: `mql:<query>`. The id portion IS the MQL query. Read
 * resolves the query at call time and returns the result set as a
 * `Stuff[]`.
 *
 * `onChange` is a documented limitation in v1: the MQL subscription
 * substrate keys subscriptions to an `Interactive`, which a server-
 * side consumer doesn't have. The risk-doc R1 names three options
 * (synthetic Interactive / lower-level resolver seam / polling); the
 * pragmatic v1 choice is "no live updates" — the listener installs
 * cleanly and silently never fires. Callers wanting reactive
 * MQL-backed membership should poll explicitly, or wait for the
 * substrate refactor that exposes the resolver under
 * a non-Interactive surface.
 */

import type { Stuff } from '../../stuff/Stuff';
import type {
  GroupProvider,
  GroupChangeHandle,
  GroupChangeListener,
} from '../GroupProvider';
import type { GroupRole } from '../Group';
import { MqlApi } from '../../../api/mql';
import { PlayerApi } from '../../../api/player';

export class MqlGroupProvider implements GroupProvider {
  readonly source = 'mql';

  async members(id: string): Promise<Stuff[]> {
    // The MqlApi.resolveMany surface requires a commandGiver context.
    // For server-side consumers we use any registered Avatar as the
    // viewer — same shape the `online` scope already relies on. If
    // no avatars are online, we surface an empty set; the resolver
    // can't run without a viewer.
    const viewer = PlayerApi.getAllAvatars()[0];
    if (!viewer) return [];
    const result = MqlApi.resolveMany(id, {
      commandGiver: viewer as unknown as Parameters<typeof MqlApi.resolveMany>[1]['commandGiver'],
      scope: 'online',
    });
    return result.stuff;
  }

  /**
   * MQL has no native role concept — every match is just an entry in
   * the result set. Project everything in `members()` as `'member'`;
   * anything not in the set surfaces `null`.
   */
  async roleOf(playerId: string, id: string): Promise<GroupRole | null> {
    const members = await this.members(id);
    const present = members.some(
      (s) => PlayerApi.isAvatarStuff(s) && s.getPlayerId() === playerId,
    );
    return present ? 'member' : null;
  }

  onChange(_id: string, _cb: GroupChangeListener): GroupChangeHandle {
    // Documented v1 limitation: MQL-backed groups don't fire live
    // updates. The handle's cancel is a no-op.
    return { cancel: () => undefined };
  }
}
