/**
 * ChannelGroupProvider — read-only chat-channel audience.
 *
 * Ref shape: `channel:<channelId>`. The id is the `_id` of a Channel
 * document. Materializes each `Channel.memberIds` entry to the
 * currently-spawned Avatar via `PlayerApi.findAvatarByPlayerId`
 * (online filter — offline members surface as nothing, same shape
 * as the managed provider).
 *
 * This provider exists so the GroupApi facade ANSWERS "who's in this
 * chat channel?" uniformly with every other group source. Membership
 * storage itself lives on `Channel` (NOT a backing Group doc) — see
 * the file comment in `Channel.ts`.
 */

import type { Stuff } from '../../stuff/Stuff';
import { Channel } from '../Channel';
import type {
  GroupProvider,
  GroupChangeHandle,
  GroupChangeListener,
} from '../GroupProvider';
import { PlayerApi } from '../../../api/player';

export class ChannelGroupProvider implements GroupProvider {
  readonly source = 'channel';

  #listeners: Map<string, Set<GroupChangeListener>> = new Map();

  async members(id: string): Promise<Stuff[]> {
    const channel = await Channel.findById(id);
    if (!channel) return [];
    const out: Stuff[] = [];
    for (const playerId of channel.memberIds) {
      const av = PlayerApi.findAvatarByPlayerId(playerId);
      if (av) out.push(av);
    }
    return out;
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
   * Notify subscribed listeners that channel `id`'s membership
   * changed. ChannelCatalogue calls this after every member mutation
   * (`promoteAdHocToManaged`, future `chat invite` / `chat kick`).
   */
  fireChange(id: string): void {
    const set = this.#listeners.get(id);
    if (!set) return;
    for (const cb of set) {
      try {
        cb();
      } catch (err) {
        console.warn('ChannelGroupProvider: change listener threw:', err);
      }
    }
  }
}
