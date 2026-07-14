/**
 * ContactsGroupProvider — read-only view of an Avatar's personal
 * contacts list.
 *
 * Ref shape: `contacts:<ownerPlayerId>:<label>`. Reads materialize each
 * entry by kind:
 *   - `avatar` entries → live Avatar via `PlayerApi.findAvatarByPlayerId`
 *     (online filter — offline owners surface as nothing).
 *   - `npc` entries → live NPC via `StuffApi.findByTemplatePath` if
 *     currently cloned. Templates that aren't currently instantiated
 *     surface as nothing.
 *
 * Owner-only privacy: members lookups by anyone other than the owner
 * return empty. The privacy check goes here (the provider boundary)
 * rather than on the verb side so any cross-cutting consumer
 * (GroupApi, audience computation in chat, future targeting verbs)
 * gets it for free.
 *
 * Per the requirements doc, no User-level expansion at materialization
 * — the multi-character sibling expansion happens at `contacts add`
 * time, so the stored entries are already one-per-Avatar.
 */

import type { Stuff } from '../../stuff/Stuff';
import type {
  GroupProvider,
  GroupChangeHandle,
  GroupChangeListener,
} from '../GroupProvider';
import type { GroupRole } from '../Group';
import { MixinApi } from '../../../api/mixin';
import { PlayerApi } from '../../../api/player';
import { StuffApi } from '../../../api/stuff';
import {
  ExecutionContextApi,
} from '../../../api/execution-context';

export class ContactsGroupProvider implements GroupProvider {
  readonly source = 'contacts';

  /** Listeners keyed by full ref (ownerId:label). */
  #listeners: Map<string, Set<GroupChangeListener>> = new Map();

  /**
   * Contacts has no native role hierarchy — the list owner isn't a
   * "member" of their own list (they don't appear in `members()`),
   * so the projection is simply: in the materialized set → `'member'`;
   * otherwise → `null`. The owner's standing as the list creator is
   * a contacts-side concern (enforced at the verb layer + provider
   * privacy gate), not a coarse-role concern.
   */
  async roleOf(memberKey: string, id: string): Promise<GroupRole | null> {
    const members = await this.members(id);
    const present = members.some((s) => s.getTemplatePath() === memberKey);
    return present ? 'member' : null;
  }

  async members(id: string): Promise<Stuff[]> {
    const split = id.indexOf(':');
    if (split < 0) {
      throw new Error(
        `ContactsGroupProvider: malformed id '${id}' — expected '<ownerId>:<label>'`,
      );
    }
    const ownerPlayerId = id.slice(0, split);
    const label = id.slice(split + 1);

    const owner = PlayerApi.findAvatarByPlayerId(ownerPlayerId);
    if (!owner) return [];
    if (!MixinApi.isContacts(owner)) return [];

    // Owner-only read. Resolve the asker from the execution context's
    // current command; if there isn't one (programmatic call), permit
    // — only the verb path is privacy-gated.
    const ctx = ExecutionContextApi.getCurrentCommandContext();
    if (ctx) {
      const asker = ctx.commandGiver as Stuff;
      if (asker !== owner) return [];
    }

    const out: Stuff[] = [];
    for (const e of owner.contactsByLabel(label)) {
      if (e.kind === 'avatar') {
        const av = PlayerApi.findAvatarByPlayerId(e.playerId);
        if (av) out.push(av);
      } else {
        const npc = StuffApi.findByTemplatePath<Stuff>(e.templatePath);
        if (npc) out.push(npc);
      }
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
   * Notify subscribed listeners that an owner's `label`-list changed.
   * The `ContactsController`'s mutation verbs call this on every CRUD.
   */
  fireChange(ownerPlayerId: string, label: string): void {
    const id = `${ownerPlayerId}:${label}`;
    const set = this.#listeners.get(id);
    if (!set) return;
    for (const cb of set) {
      try {
        cb();
      } catch (err) {
        console.warn('ContactsGroupProvider: change listener threw:', err);
      }
    }
  }
}
