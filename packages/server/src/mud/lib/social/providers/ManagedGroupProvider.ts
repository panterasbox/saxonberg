/**
 * ManagedGroupProvider — writable, persistent `Group` Documents.
 *
 * Reads materialize each `playerId` to a live Avatar (online filter:
 * only currently-spawned Avatars surface). The read surface is
 * `Promise<Stuff[]>`; offline members materialize to nothing.
 *
 * v1 ad-hoc Groups are NOT shipped as a separate provider — the
 * requirements doc reserves them as a lifetime variant of the managed
 * shape, but no callers exist (ad-hoc channels carry their own
 * membership inside `ChannelCatalogue`). When ad-hoc Groups land, the
 * runtime-only branch is a `Group.find({})` filter on a transient flag.
 */

import type { Stuff } from '../../stuff/Stuff';
import { Group, type GroupRole } from '../Group';
import type {
  GroupProvider,
  GroupChangeHandle,
  GroupChangeListener,
} from '../GroupProvider';
import { PlayerApi } from '../../../api/player';

export class ManagedGroupProvider implements GroupProvider {
  readonly source = 'managed';

  /** Listeners keyed by Group id. */
  #listeners: Map<string, Set<GroupChangeListener>> = new Map();

  /**
   * Look up a Group by its unique name. Returns the first match
   * (the `name` index is unique at the collection level) or null.
   * Used by the AccessRegistry's bootstrap seeding and developer-
   * cache warm path to find well-known groups (`'core'`,
   * `'lounge'`, `'developers'`).
   */
  async findByName(name: string): Promise<Group | null> {
    const all = await Group.find({ name });
    return all[0] ?? null;
  }

  async members(id: string): Promise<Stuff[]> {
    const group = await Group.findById(id);
    if (!group) return [];
    const out: Stuff[] = [];
    for (const playerId of group.memberIds) {
      const av = PlayerApi.findAvatarByPlayerId(playerId);
      if (av) out.push(av);
    }
    return out;
  }

  async roleOf(playerId: string, id: string): Promise<GroupRole | null> {
    const group = await Group.findById(id);
    if (!group) return null;
    return group.roleOf(playerId);
  }

  async isMember(playerId: string, id: string): Promise<boolean> {
    const group = await Group.findById(id);
    if (!group) return false;
    return group.isMember(playerId);
  }

  onChange(id: string, cb: GroupChangeListener): GroupChangeHandle {
    let listeners = this.#listeners.get(id);
    if (!listeners) {
      listeners = new Set();
      this.#listeners.set(id, listeners);
    }
    listeners.add(cb);
    return {
      cancel: () => {
        const set = this.#listeners.get(id);
        if (!set) return;
        set.delete(cb);
        if (set.size === 0) this.#listeners.delete(id);
      },
    };
  }

  /**
   * Notify subscribed listeners that membership of Group `id` changed.
   * Called by the controller-side helpers after every CRUD mutation
   * (e.g., `add`, `remove`, `setRole`, `disband`). Internal to the
   * provider — external callers go through the verbs.
   */
  fireChange(id: string): void {
    const set = this.#listeners.get(id);
    if (!set) return;
    for (const cb of set) {
      try {
        cb();
      } catch (err) {
        console.warn('ManagedGroupProvider: change listener threw:', err);
      }
    }
  }
}
