/**
 * GroupApi — thin facade over the GroupRegistry singleton.
 *
 * Stable caller-facing surface for chat's audience computation, the
 * group-DM-to-channel promotion path, and future consumers
 * (permission checks, targeting, effects).
 *
 * Cross-cutting Api: ends with `SecurityApi.decorateApiClass` so
 * external calls run through the security gate.
 */

import { StuffApi } from './stuff';
import { SecurityApi } from './security';
import type { Stuff } from '../lib/stuff/Stuff';
import type {
  GroupRef,
  GroupChangeHandle,
  GroupChangeListener,
} from '../lib/social/GroupProvider';
import type { GroupRole } from '../lib/social/Group';
import type GroupRegistry from '../obj/GroupRegistry';
import { TemplatePaths } from '../lib/paths';

const REGISTRY_PATH = TemplatePaths.groupRegistry;

export class GroupApi {
  static #registryRef: GroupRegistry | null = null;

  static async membersOf(ref: GroupRef): Promise<Stuff[]> {
    return (await GroupApi.#registry()).membersOf(ref);
  }

  static async roleOf(playerId: string, ref: GroupRef): Promise<GroupRole | null> {
    return (await GroupApi.#registry()).roleOf(playerId, ref);
  }

  static async isMember(playerId: string, ref: GroupRef): Promise<boolean> {
    return (await GroupApi.#registry()).isMember(playerId, ref);
  }

  static async onMembershipChange(
    ref: GroupRef,
    cb: GroupChangeListener,
  ): Promise<GroupChangeHandle> {
    return (await GroupApi.#registry()).onMembershipChange(ref, cb);
  }

  /**
   * Parse a `GroupRef` into `{ source, id }`. The source is the
   * segment before the first colon; the id is everything after.
   * Pure string parse — no registry access.
   */
  static parseRef(ref: GroupRef): { source: string; id: string } {
    const idx = ref.indexOf(':');
    if (idx < 0) {
      throw new Error(
        `GroupApi.parseRef: malformed ref '${ref}' — expected 'source:id'`,
      );
    }
    return { source: ref.slice(0, idx), id: ref.slice(idx + 1) };
  }

  /**
   * Hard reference for callers that need the registry instance
   * directly — the ContactsController uses this to fire change
   * notifications after CRUD verbs.
   */
  static async registry(): Promise<GroupRegistry> {
    return GroupApi.#registry();
  }

  static async #registry(): Promise<GroupRegistry> {
    if (GroupApi.#registryRef) return GroupApi.#registryRef;
    const reg = StuffApi.findByTemplatePath<GroupRegistry>(REGISTRY_PATH);
    if (reg) {
      GroupApi.#registryRef = reg;
      return reg;
    }
    const lazy = await StuffApi.singleton<GroupRegistry>(REGISTRY_PATH);
    GroupApi.#registryRef = lazy;
    return lazy;
  }
}

SecurityApi.decorateApiClass(GroupApi);
