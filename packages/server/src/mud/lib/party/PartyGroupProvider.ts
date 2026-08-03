/**
 * PartyGroupProvider — the fourth {@link GroupProvider}, resolving
 * `party:<path>` refs against a party's **own** roster (the managed / MQL
 * / contacts providers are the other three). This is how party chat and
 * the grouping facade read party membership without the party ever
 * minting a managed `Group`: a `party:<path>` `GroupRef` flows through
 * `GroupApi` exactly like `managed:<id>`, but the members come from the
 * `Party` Idea, not a `groups` row.
 *
 * Stateless: the party id in a `party:<path>` ref IS the party Idea's
 * `templatePath`, so the provider resolves it straight through the Stuff
 * graph (`StuffApi.findByTemplatePath`) — no registry, no map. It
 * materializes each `playerId` member to its online Avatar (the
 * `ManagedGroupProvider` shape); Mercenary members (templatePath ids) are
 * roster entries, not chat recipients, so they are skipped.
 */

import type { Stuff } from "../stuff/Stuff";
import type {
  GroupProvider,
  GroupChangeHandle,
  GroupChangeListener,
} from "../social/GroupProvider";
import type { GroupRole } from "../social/Group";
import { StuffApi } from "../../api/stuff";
import { PlayerApi } from "../../api/player";
import { Party } from "../../obj/Party";

export class PartyGroupProvider implements GroupProvider {
  readonly source = "party";
  private readonly listeners = new Map<string, Set<GroupChangeListener>>();

  private resolve(path: string): Party | null {
    const stuff = StuffApi.findByTemplatePath(path);
    return stuff instanceof Party ? stuff : null;
  }

  async members(path: string): Promise<Stuff[]> {
    const party = this.resolve(path);
    if (!party) return [];
    const out: Stuff[] = [];
    for (const memberId of party.getMemberIds()) {
      // Only player members (playerId-shaped) are chat recipients; a
      // Mercenary's templatePath-shaped id is a roster entry, not a
      // messageable Avatar.
      if (memberId.startsWith("/")) continue;
      const avatar = PlayerApi.findAvatarByPlayerId(memberId);
      if (avatar) out.push(avatar as Stuff);
    }
    return out;
  }

  async roleOf(playerId: string, path: string): Promise<GroupRole | null> {
    const party = this.resolve(path);
    if (!party || !party.isMember(playerId)) return null;
    return party.isCaptain(playerId) ? "owner" : "member";
  }

  async isMember(playerId: string, path: string): Promise<boolean> {
    return this.resolve(path)?.isMember(playerId) ?? false;
  }

  onChange(path: string, cb: GroupChangeListener): GroupChangeHandle {
    let set = this.listeners.get(path);
    if (!set) {
      set = new Set();
      this.listeners.set(path, set);
    }
    set.add(cb);
    return {
      cancel: () => {
        this.listeners.get(path)?.delete(cb);
      },
    };
  }

  /** Notify subscribers that party `path`'s membership changed (called by
   * `PartyLogic` after a roster mutation — the `ManagedGroupProvider`
   * `fireChange` precedent). */
  fireChange(path: string): void {
    const set = this.listeners.get(path);
    if (!set) return;
    for (const cb of [...set]) {
      try {
        cb();
      } catch {
        /* a listener throw never breaks the mutation */
      }
    }
  }
}
