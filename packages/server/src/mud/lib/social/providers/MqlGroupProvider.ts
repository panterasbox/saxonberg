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

export class MqlGroupProvider implements GroupProvider {
  readonly source = 'mql';

  async members(id: string): Promise<Stuff[]> {
    // ⭐ SYSTEM MODE, not "an arbitrary logged-in person as the viewer".
    // This used to take `getAllAvatars()[0]`, which meant a group's
    // membership depended on whose session happened to be first in a
    // map — a viewer-dependent answer to a question that is not about a
    // viewer, and empty whenever nobody was online. The `online` seed
    // resolves with a null giver, so the honest reading is that there
    // is no principal here at all.
    //
    // A query that genuinely needs a viewer (an anchored seed) throws;
    // an unresolvable group is an empty membership, which is what the
    // arbitrary-viewer version degraded to anyway.
    try {
      return MqlApi.resolveMany(id, { commandGiver: null, scope: 'online' })
        .stuff;
    } catch {
      return [];
    }
  }

  /**
   * MQL has no native role concept — every match is just an entry in
   * the result set. Project everything in `members()` as `'member'`;
   * anything not in the set surfaces `null`.
   */
  async roleOf(memberKey: string, id: string): Promise<GroupRole | null> {
    const members = await this.members(id);
    const present = members.some((s) => s.getTemplatePath() === memberKey);
    return present ? 'member' : null;
  }

  onChange(_id: string, _cb: GroupChangeListener): GroupChangeHandle {
    // Documented v1 limitation: MQL-backed groups don't fire live
    // updates. The handle's cancel is a no-op.
    return { cancel: () => undefined };
  }
}
